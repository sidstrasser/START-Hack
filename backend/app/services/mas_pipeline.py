"""
MAS Pipeline - Orchestrates the negotiation briefing generation workflow.

Parallel flow: parse → [5 parallel agents] → END
"""

from app.agents.graph import negotiation_graph
from app.agents.state import NegotiationState
from app.api.routes import get_documents_store, get_briefings_store
from app.services.progress_tracker import progress_tracker


async def run_mas_pipeline(
    job_id: str,
    document_id: str,
    supplier_offer_pdf: str,
    initial_request_pdf: str,
    alternatives_pdf: str | None,
    form_data: dict
):
    """
    Run the Multi-Agent System pipeline for negotiation briefing generation.

    Parallel flow: parse → [5 parallel agents] → END

    Args:
        job_id: Unique job ID for tracking
        document_id: ID of the uploaded documents
        supplier_offer_pdf: Raw text from supplier offer PDF (contains pricing = max price)
        initial_request_pdf: Raw text from initial request PDF (what we're looking for)
        alternatives_pdf: Raw text from potential suppliers list (optional)
        form_data: User-provided structured form data
    """
    import logging
    logger = logging.getLogger(__name__)

    logger.info(f"[PIPELINE] Starting MAS pipeline for job_id={job_id}, document_id={document_id}")

    try:
        briefings_store = get_briefings_store()

        # Initialize new state structure (parallel agents)
        initial_state: NegotiationState = {
            "document_id": document_id,
            "supplier_offer_pdf": supplier_offer_pdf,
            "initial_request_pdf": initial_request_pdf,
            "alternatives_pdf": alternatives_pdf,
            "form_data": form_data,
            "parsed_input": None,
            "supplier_summary": None,
            "market_analysis": None,
            "offer_analysis": None,
            "outcome_assessment": None,
            "action_items": None,
            "current_agent": "",
            "errors": [],
            "progress": 0.0,
            "agent_progress": {},
            "job_id": job_id
        }

        logger.info(f"[PIPELINE] State initialized with new structure")
        logger.info(f"[PIPELINE] Form data supplier: {form_data.get('supplier_name')}")

        # Publish start event
        logger.info(f"[PIPELINE] Publishing start event")
        await progress_tracker.publish(job_id, {
            "agent": "system",
            "status": "running",
            "message": "Starting negotiation briefing generation...",
            "progress": 0.0
        })

        # Run the graph
        logger.info(f"[PIPELINE] Invoking negotiation graph...")
        final_state = await negotiation_graph.ainvoke(initial_state)
        logger.info(f"[PIPELINE] Graph execution completed. Errors: {len(final_state.get('errors', []))}")

        # Check for errors
        if final_state.get("errors") and len(final_state["errors"]) > 0:
            logger.error(f"[PIPELINE] Pipeline failed with errors: {final_state['errors']}")
            briefings_store[job_id] = {
                "status": "error",
                "briefing": None,
                "errors": final_state["errors"],
                "vector_db_id": None,
                "stored_to_pinecone": False
            }

            await progress_tracker.publish(job_id, {
                "agent": "system",
                "status": "error",
                "message": f"Pipeline failed: {', '.join(final_state['errors'])}",
                "progress": final_state.get("progress", 0.0)
            })
            return

        # Save final result (parallel agent outputs)
        logger.info(f"[PIPELINE] Storing briefing in briefings_store for job_id={job_id}")
        briefings_store[job_id] = {
            "status": "completed",
            "briefing": {
                "supplier_summary": final_state.get("supplier_summary"),
                "market_analysis": final_state.get("market_analysis"),
                "offer_analysis": final_state.get("offer_analysis"),
                "outcome_assessment": final_state.get("outcome_assessment"),
                "action_items": final_state.get("action_items"),
            },
            "parsed_input": final_state.get("parsed_input"),
            "vector_db_id": None,  # Will be set when stored to Pinecone
            "stored_to_pinecone": False  # Track if already stored
        }

        logger.info(f"[PIPELINE] Briefing stored successfully. Store now contains {len(briefings_store)} items")
        logger.info(f"[PIPELINE] Verifying storage: job_id in store = {job_id in briefings_store}")

        # Publish completion
        logger.info(f"[PIPELINE] Publishing completion event")
        await progress_tracker.publish(job_id, {
            "agent": "system",
            "status": "completed",
            "message": "Briefing generation complete!",
            "progress": 1.0
        })
        logger.info(f"[PIPELINE] Completion event published")

    except Exception as e:
        # Handle unexpected errors
        logger.error(f"[PIPELINE] Unexpected error in pipeline: {str(e)}", exc_info=True)
        briefings_store = get_briefings_store()
        briefings_store[job_id] = {
            "status": "error",
            "briefing": None,
            "error": str(e),
            "vector_db_id": None,
            "stored_to_pinecone": False
        }

        await progress_tracker.publish(job_id, {
            "agent": "system",
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "progress": 0.0
        })
        logger.info(f"[PIPELINE] Error published to progress tracker")
