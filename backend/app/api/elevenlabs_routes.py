"""
ElevenLabs API routes for speech-to-text transcription.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import json
from app.services.elevenlabs_service import get_elevenlabs_service

router = APIRouter()


class ConnectResponse(BaseModel):
    """Response model for connect endpoint."""
    sessionId: str


class AudioRequest(BaseModel):
    """Request model for audio endpoint."""
    sessionId: str
    audioBase64: str
    sampleRate: int = 16000


class AudioResponse(BaseModel):
    """Response model for audio endpoint."""
    success: bool
    warning: Optional[str] = None


class CommitRequest(BaseModel):
    """Request model for commit endpoint."""
    sessionId: str


class CommitResponse(BaseModel):
    """Response model for commit endpoint."""
    success: bool
    transcripts: Optional[List[dict]] = None  # List of transcript dicts with 'text', 'speaker_id', 'timestamp'


class DisconnectRequest(BaseModel):
    """Request model for disconnect endpoint."""
    sessionId: str


class DisconnectResponse(BaseModel):
    """Response model for disconnect endpoint."""
    success: bool


class TranscriptsResponse(BaseModel):
    """Response model for transcripts endpoint."""
    transcripts: List[dict]  # Each dict has 'text', 'speaker_id' (optional), and 'timestamp'
    count: int


class AnalyzeRequest(BaseModel):
    """Request model for analyze endpoint."""
    sessionId: str
    vectorDbId: str
    actionType: str  # "arguments" or "outcome"
    goals: Optional[str] = None
    messages: Optional[List[dict]] = None  # Optional: provide messages directly


class AnalyzeResponse(BaseModel):
    """Response model for analyze endpoint (non-streaming)."""
    insights: str
    actionType: str


class MetricsRequest(BaseModel):
    """Request model for metrics endpoint."""
    sessionId: str
    vectorDbId: str
    goals: Optional[str] = None
    messages: Optional[List[dict]] = None


class MetricsResponse(BaseModel):
    """Response model for metrics endpoint."""
    value: int  # 0-100
    risk: int   # 0-100
    outcome: int  # 0-100


class ActionItem(BaseModel):
    """Single action item."""
    id: int
    text: str
    completed: bool


class ActionItemsRequest(BaseModel):
    """Request model for action items analysis endpoint."""
    vectorDbId: str
    messages: List[dict]
    actionItems: List[ActionItem]
    alreadyCompletedIds: List[int] = []  # IDs that were already completed (don't un-complete)


class ActionItemsResponse(BaseModel):
    """Response model for action items analysis."""
    completedIds: List[int]  # IDs of items that should be marked completed
    newlyCompletedIds: List[int]  # IDs that were just completed (for toast)


@router.post("/elevenlabs/connect", response_model=ConnectResponse)
async def connect():
    """
    Create a new ElevenLabs transcription session.
    
    Returns:
        Session ID for the new session
    """
    try:
        service = get_elevenlabs_service()
        session_id = service.create_session()
        return ConnectResponse(sessionId=session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.post("/elevenlabs/audio", response_model=AudioResponse)
async def receive_audio(request: AudioRequest):
    """
    Receive an audio chunk and add it to the session buffer.
    
    Args:
        request: Audio chunk data (base64 encoded PCM audio)
        
    Returns:
        Success status
    """
    try:
        service = get_elevenlabs_service()
        service.cleanup_old_sessions()
        
        success = service.add_audio_chunk(
            session_id=request.sessionId,
            audio_base64=request.audioBase64,
            sample_rate=request.sampleRate
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Invalid or expired session")
        
        return AudioResponse(success=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process audio: {str(e)}")


@router.post("/elevenlabs/commit", response_model=CommitResponse)
async def commit_transcript(request: CommitRequest):
    """
    Commit buffered audio and get transcription.
    
    Args:
        request: Session ID
        
    Returns:
        Success status and transcript if available
    """
    try:
        service = get_elevenlabs_service()
        result = service.commit_transcript(request.sessionId)
        
        if result and isinstance(result, dict) and "transcripts" in result:
            return CommitResponse(
                success=True,
                transcripts=result["transcripts"]
            )
        else:
            return CommitResponse(success=True, transcripts=None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to commit transcript: {str(e)}")


@router.get("/elevenlabs/transcripts", response_model=TranscriptsResponse)
async def get_transcripts(sessionId: str):
    """
    Get all transcripts for a session.
    
    Args:
        sessionId: Session identifier
        
    Returns:
        List of transcripts and count
    """
    try:
        service = get_elevenlabs_service()
        service.cleanup_old_sessions()
        
        transcripts = service.get_transcripts(sessionId)
        return TranscriptsResponse(transcripts=transcripts, count=len(transcripts))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get transcripts: {str(e)}")


@router.post("/elevenlabs/disconnect", response_model=DisconnectResponse)
async def disconnect(request: DisconnectRequest):
    """
    Disconnect and clean up a session.
    
    Args:
        request: Session ID
        
    Returns:
        Success status
    """
    try:
        service = get_elevenlabs_service()
        service.disconnect_session(request.sessionId)
        return DisconnectResponse(success=True)
    except Exception:
        # Still return success even if session not found
        return DisconnectResponse(success=True)


@router.post("/elevenlabs/analyze")
async def analyze_conversation(request: AnalyzeRequest):
    """
    Analyze conversation and stream insights based on action type.
    
    Queries vector database with conversation context and streams AI-generated insights
    for either "arguments" (negotiation arguments) or "outcome" (outcome analysis).
    
    Args:
        request: Session ID, vector DB ID, action type, optional goals
        
    Returns:
        SSE stream of insight chunks
    """
    from app.services.vector_store import stream_action_insights
    
    # Validate action type
    if request.actionType not in ["arguments", "outcome"]:
        raise HTTPException(
            status_code=400, 
            detail="actionType must be 'arguments' or 'outcome'"
        )
    
    # Get conversation messages
    messages = request.messages or []
    
    # If no messages provided, try to get from session transcripts
    if not messages and request.sessionId:
        try:
            service = get_elevenlabs_service()
            transcripts = service.get_transcripts(request.sessionId)
            messages = transcripts
        except Exception:
            pass
    
    async def event_generator():
        """Generate SSE events with insight chunks."""
        try:
            # Send start event
            yield f"data: {json.dumps({'type': 'start', 'actionType': request.actionType})}\n\n"
            
            # Stream the insights
            full_response = ""
            async for chunk in stream_action_insights(
                vector_db_id=request.vectorDbId,
                conversation_messages=messages,
                action_type=request.actionType,
                goals=request.goals
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            # Send complete event
            yield f"data: {json.dumps({'type': 'complete', 'content': full_response})}\n\n"
            
        except Exception as e:
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/elevenlabs/analyze-sync", response_model=AnalyzeResponse)
async def analyze_conversation_sync(request: AnalyzeRequest):
    """
    Analyze conversation and return insights (non-streaming).
    
    Use this for clients that don't support SSE streaming.
    
    Args:
        request: Session ID, vector DB ID, action type, optional goals
        
    Returns:
        Insights and action type
    """
    from app.services.vector_store import query_for_action_insights
    
    # Validate action type
    if request.actionType not in ["arguments", "outcome"]:
        raise HTTPException(
            status_code=400, 
            detail="actionType must be 'arguments' or 'outcome'"
        )
    
    # Get conversation messages
    messages = request.messages or []
    
    # If no messages provided, try to get from session transcripts
    if not messages and request.sessionId:
        try:
            service = get_elevenlabs_service()
            transcripts = service.get_transcripts(request.sessionId)
            messages = transcripts
        except Exception:
            pass
    
    try:
        result = await query_for_action_insights(
            vector_db_id=request.vectorDbId,
            conversation_messages=messages,
            action_type=request.actionType,
            goals=request.goals
        )
        
        return AnalyzeResponse(
            insights=result["insights"],
            actionType=result["action_type"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to analyze conversation: {str(e)}"
        )


@router.post("/elevenlabs/metrics", response_model=MetricsResponse)
async def get_conversation_metrics(request: MetricsRequest):
    """
    Analyze conversation and return real-time metrics.
    
    Evaluates the current negotiation state and returns:
    - value: How much value is being captured (0-100)
    - risk: Current risk level (0-100)
    - outcome: Likelihood of achieving goals (0-100)
    
    Args:
        request: Session ID, vector DB ID, optional goals and messages
        
    Returns:
        Metrics with value, risk, and outcome scores
    """
    from app.services.vector_store import analyze_conversation_metrics
    
    # Get conversation messages
    messages = request.messages or []
    
    # If no messages provided, try to get from session transcripts
    if not messages and request.sessionId:
        try:
            service = get_elevenlabs_service()
            transcripts = service.get_transcripts(request.sessionId)
            messages = transcripts
        except Exception:
            pass
    
    try:
        result = await analyze_conversation_metrics(
            vector_db_id=request.vectorDbId,
            conversation_messages=messages,
            goals=request.goals
        )
        
        return MetricsResponse(
            value=result["value"],
            risk=result["risk"],
            outcome=result["outcome"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to analyze metrics: {str(e)}"
        )


@router.post("/elevenlabs/action-items", response_model=ActionItemsResponse)
async def analyze_action_items(request: ActionItemsRequest):
    """
    Analyze conversation to determine which action items have been completed.
    
    Args:
        request: Action items, messages, and already completed IDs
        
    Returns:
        List of completed item IDs and newly completed IDs (for toast)
    """
    from app.services.vector_store import analyze_action_items_completion
    
    messages = request.messages or []
    
    if not messages:
        # No conversation yet, return only already completed
        return ActionItemsResponse(
            completedIds=request.alreadyCompletedIds,
            newlyCompletedIds=[]
        )
    
    try:
        # Convert action items to dict format
        action_items = [
            {"id": item.id, "text": item.text, "completed": item.completed}
            for item in request.actionItems
        ]
        
        result = await analyze_action_items_completion(
            vector_db_id=request.vectorDbId,
            conversation_messages=messages,
            action_items=action_items,
            already_completed_ids=request.alreadyCompletedIds
        )
        
        return ActionItemsResponse(
            completedIds=result["completedIds"],
            newlyCompletedIds=result["newlyCompletedIds"]
        )
    except Exception as e:
        # On error, return only already completed (don't break the UI)
        return ActionItemsResponse(
            completedIds=request.alreadyCompletedIds,
            newlyCompletedIds=[]
        )
