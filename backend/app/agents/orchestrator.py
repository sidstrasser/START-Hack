from app.agents.state import NegotiationState
from app.services.progress_tracker import progress_tracker


async def orchestrator_node(state: NegotiationState) -> NegotiationState:
    """
    Orchestrator agent: Validates inputs and coordinates the workflow.

    This agent doesn't use LLM - it's pure logic for validation and flow control.
    """
    job_id = state["job_id"]

    # Publish progress
    await progress_tracker.publish(job_id, {
        "agent": "orchestrator",
        "status": "running",
        "message": "Validating inputs and preparing workflow...",
        "progress": 0.1
    })

    # Validate required inputs
    errors = []

    if not state.get("document_id"):
        errors.append("Missing document_id")

    if not state.get("raw_pdf_text") or len(state["raw_pdf_text"].strip()) == 0:
        errors.append("PDF text is empty")

    if not state.get("extracted_data"):
        errors.append("Missing extracted_data")

    # Update state
    state["errors"] = errors
    state["current_agent"] = "orchestrator"
    state["progress"] = 0.1

    if errors:
        await progress_tracker.publish(job_id, {
            "agent": "orchestrator",
            "status": "error",
            "message": f"Validation failed: {', '.join(errors)}",
            "progress": 0.1
        })
        return state

    # Validation successful
    await progress_tracker.publish(job_id, {
        "agent": "orchestrator",
        "status": "completed",
        "message": "Validation successful, proceeding to goal normalization",
        "progress": 0.15
    })

    return state
