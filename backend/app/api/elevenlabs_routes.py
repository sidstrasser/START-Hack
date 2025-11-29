"""
ElevenLabs API routes for speech-to-text transcription.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
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

