from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import os
import shutil
from typing import List, Dict
from app.api.models import (
    UploadResponse,
    BriefingRequest,
    BriefingResponse,
    BriefingResult,
    QueryBriefingRequest,
    QueryBriefingResponse,
)
from app.services.pdf_parser import extract_data_from_docs, generate_document_id
from app.config import get_settings

router = APIRouter()

# In-memory storage for demo (in production, use a database)
documents_store: Dict[str, dict] = {}
briefings_store: Dict[str, dict] = {}


@router.post("/upload-pdf", response_model=UploadResponse)
async def upload_pdf(files: List[UploadFile] = File(...)):
    """
    Upload and parse multiple PDF documents.
    """
    settings = get_settings()
    saved_paths = []
    
    # Generate a single document_id representing this "session" or "case"
    document_id = generate_document_id()

    try:
        for file in files:
            if not file.filename.endswith(".pdf"):
                continue
                
            # Save file
            # We append a random suffix or index to avoid collisions if filenames are same
            safe_filename = f"{document_id}_{file.filename}"
            file_path = os.path.join(settings.upload_dir, safe_filename)
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            saved_paths.append(file_path)

        if not saved_paths:
             raise HTTPException(status_code=400, detail="No valid PDF files uploaded")

        # Extract data from all PDFs combined
        extracted_data = await extract_data_from_docs(saved_paths)

        # Store document info (using the session ID)
        documents_store[document_id] = {
            "document_id": document_id,
            "filenames": [f.filename for f in files],
            "file_paths": saved_paths,
            "extracted_data": extracted_data,
        }

        return UploadResponse(
            document_id=document_id,
            extracted_data=extracted_data
        )

    except Exception as e:
        # Cleanup
        for path in saved_paths:
            if os.path.exists(path):
                os.remove(path)
        raise HTTPException(status_code=500, detail=f"Error processing PDFs: {str(e)}")


@router.post("/generate-briefing", response_model=BriefingResponse)
async def generate_briefing(
    request: BriefingRequest,
    background_tasks: BackgroundTasks
):
    """
    Trigger MAS to generate negotiation briefing.

    Args:
        request: Document ID and optional context
        background_tasks: FastAPI background tasks

    Returns:
        Job ID for tracking progress
    """
    # Validate document exists
    if request.document_id not in documents_store:
        raise HTTPException(status_code=404, detail="Document not found")

    # Import here to avoid circular dependency
    from app.services.mas_pipeline import run_mas_pipeline
    import uuid
    import asyncio

    job_id = str(uuid.uuid4())

    # Wrapper function to run async task in background
    def run_pipeline_wrapper():
        """Wrapper to run async pipeline in background task."""
        import logging
        import os
        from dotenv import load_dotenv

        logger = logging.getLogger(__name__)

        logger.info(f"[WRAPPER] Starting pipeline wrapper for job_id={job_id}")

        # Reload environment variables in the new thread
        load_dotenv(override=True)
        logger.info(f"[WRAPPER] Environment variables reloaded")

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            logger.info(f"[WRAPPER] Event loop created, running pipeline...")
            loop.run_until_complete(
                run_mas_pipeline(
                    job_id=job_id,
                    document_id=request.document_id,
                    additional_context=request.additional_context or {}
                )
            )
            logger.info(f"[WRAPPER] Pipeline completed for job_id={job_id}")
        except Exception as e:
            logger.error(f"[WRAPPER] Pipeline failed for job_id={job_id}: {str(e)}", exc_info=True)
        finally:
            loop.close()
            logger.info(f"[WRAPPER] Event loop closed for job_id={job_id}")

    # Add wrapper to background tasks
    background_tasks.add_task(run_pipeline_wrapper)

    return BriefingResponse(job_id=job_id)


@router.get("/progress/{job_id}")
async def stream_progress(job_id: str):
    """
    Stream progress updates via Server-Sent Events.

    Args:
        job_id: Job ID to track

    Returns:
        SSE stream of progress events
    """
    from app.services.progress_tracker import progress_tracker
    import json
    import asyncio

    async def event_generator():
        queue = progress_tracker.subscribe(job_id)

        try:
            while True:
                # Wait for event with timeout
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(event)}\n\n"

                    # Only close when the entire pipeline is complete (progress = 1.0)
                    # or when there's a fatal error
                    if event.get("progress") == 1.0 or event.get("status") == "error":
                        break
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield f"data: {json.dumps({'status': 'keepalive'})}\n\n"
        finally:
            progress_tracker.unsubscribe(job_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/briefing/{job_id}", response_model=BriefingResult)
async def get_briefing(job_id: str):
    """
    Get the final briefing result.

    Args:
        job_id: Job ID

    Returns:
        Briefing data and status
    """
    import logging
    logger = logging.getLogger(__name__)

    logger.info(f"[GET BRIEFING] Request received for job_id={job_id}")
    logger.info(f"[GET BRIEFING] Current briefings_store contains {len(briefings_store)} items")
    logger.info(f"[GET BRIEFING] Store keys: {list(briefings_store.keys())}")
    logger.info(f"[GET BRIEFING] job_id in store: {job_id in briefings_store}")

    if job_id not in briefings_store:
        logger.error(f"[GET BRIEFING] Briefing not found for job_id={job_id}")
        raise HTTPException(status_code=404, detail="Briefing not found")

    briefing_data = briefings_store[job_id]
    logger.info(f"[GET BRIEFING] Briefing found. Status: {briefing_data.get('status')}")
    logger.info(f"[GET BRIEFING] Has briefing data: {briefing_data.get('briefing') is not None}")

    return BriefingResult(
        briefing=briefing_data.get("briefing"),
        status=briefing_data.get("status", "pending"),
        vector_db_id=briefing_data.get("vector_db_id") or job_id
    )


@router.post("/query-briefing", response_model=QueryBriefingResponse)
async def query_briefing(request: QueryBriefingRequest):
    """
    Query the briefing using RAG.

    The namespace is derived server-side from vector_db_id to ensure
    data isolation. The vector_db_id is validated against existing briefings.

    Args:
        request: Vector DB ID and query

    Returns:
        Answer and sources
    """
    from app.services.vector_store import query_briefing_rag

    # Validate that the vector_db_id corresponds to an existing briefing
    # This ensures basic authorization (namespace is derived server-side)
    if request.vector_db_id not in briefings_store:
        raise HTTPException(
            status_code=404,
            detail="Briefing not found. The vector_db_id must correspond to an existing briefing."
        )

    try:
        # Namespace is derived server-side in query_briefing_rag from vector_db_id
        result = await query_briefing_rag(
            vector_db_id=request.vector_db_id,
            query=request.query
        )

        return QueryBriefingResponse(
            answer=result["answer"],
            sources=result["sources"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error querying briefing: {str(e)}")


# Export stores for access from other modules
def get_documents_store():
    return documents_store


def get_briefings_store():
    return briefings_store
