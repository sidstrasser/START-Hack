from app.agents.state import NegotiationState
from app.services.progress_tracker import progress_tracker


async def orchestrator_node(state: NegotiationState) -> NegotiationState:
    """
    Orchestrator agent: Validates inputs and coordinates the workflow.

    This agent doesn't use LLM - it's pure logic for validation and flow control.
    """
    import logging
    logger = logging.getLogger(__name__)

    job_id = state["job_id"]
    logger.info(f"[ORCHESTRATOR] Starting orchestrator for job_id={job_id}")

    # Publish progress
    await progress_tracker.publish(job_id, {
        "agent": "orchestrator",
        "status": "running",
        "message": "Validating inputs and preparing workflow...",
        "progress": 0.1
    })
    logger.info(f"[ORCHESTRATOR] Progress published")

    # Validate required inputs
    errors = []

    logger.info(f"[ORCHESTRATOR] Validating inputs...")
    logger.info(f"[ORCHESTRATOR] document_id: {state.get('document_id')}")
    logger.info(f"[ORCHESTRATOR] raw_pdf_text length: {len(state.get('raw_pdf_text', ''))}")
    logger.info(f"[ORCHESTRATOR] extracted_data present: {state.get('extracted_data') is not None}")

    if not state.get("document_id"):
        errors.append("Missing document_id")
        logger.error(f"[ORCHESTRATOR] Validation failed: Missing document_id")

    if not state.get("raw_pdf_text") or len(state["raw_pdf_text"].strip()) == 0:
        errors.append("PDF text is empty")
        logger.error(f"[ORCHESTRATOR] Validation failed: PDF text is empty")

    if not state.get("extracted_data"):
        errors.append("Missing extracted_data")
        logger.error(f"[ORCHESTRATOR] Validation failed: Missing extracted_data")

    # Update state
    state["errors"] = errors
    state["current_agent"] = "orchestrator"
    state["progress"] = 0.1

    if errors:
        logger.error(f"[ORCHESTRATOR] Validation errors: {errors}")
        await progress_tracker.publish(job_id, {
            "agent": "orchestrator",
            "status": "error",
            "message": f"Validation failed: {', '.join(errors)}",
            "progress": 0.1
        })
        return state

    logger.info(f"[ORCHESTRATOR] Validation successful!")

    # Validation successful
    await progress_tracker.publish(job_id, {
        "agent": "orchestrator",
        "status": "completed",
        "message": "Validation successful, proceeding to goal normalization",
        "progress": 0.15
    })

    return state
