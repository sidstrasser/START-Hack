from app.agents.graph import negotiation_graph
from app.agents.state import NegotiationState
from app.api.routes import get_documents_store, get_briefings_store
from app.services.progress_tracker import progress_tracker
from app.services.vector_store import store_briefing_in_vector_db


async def run_mas_pipeline(job_id: str, document_id: str, additional_context: dict):
    """
    Run the Multi-Agent System pipeline for negotiation briefing generation.

    This is executed as a background task.

    Args:
        job_id: Unique job ID for tracking
        document_id: ID of the uploaded document
        additional_context: Optional additional context from user
    """
    import logging
    logger = logging.getLogger(__name__)

    logger.info(f"[PIPELINE] Starting MAS pipeline for job_id={job_id}, document_id={document_id}")

    try:
        # Get document data
        documents_store = get_documents_store()
        briefings_store = get_briefings_store()

        if document_id not in documents_store:
            logger.error(f"[PIPELINE] Document {document_id} not found in store")
            await progress_tracker.publish(job_id, {
                "agent": "system",
                "status": "error",
                "message": "Document not found",
                "progress": 0.0
            })
            return

        logger.info(f"[PIPELINE] Document {document_id} found in store")
        doc_data = documents_store[document_id]
        extracted_data = doc_data["extracted_data"]
        logger.info(f"[PIPELINE] Extracted data loaded: {len(extracted_data.get('raw_text', ''))} chars")

        # Initialize state
        initial_state: NegotiationState = {
            "document_id": document_id,
            "raw_pdf_text": extracted_data["raw_text"],
            "extracted_data": extracted_data,
            "additional_context": additional_context,
            "normalized_goals": None,
            "deal_type": None,
            "research_results": None,
            "identified_potentials": None,
            "final_briefing": None,
            "current_agent": "",
            "errors": [],
            "progress": 0.0,
            "job_id": job_id
        }

        # Publish start event
        logger.info(f"[PIPELINE] Publishing start event")
        await progress_tracker.publish(job_id, {
            "agent": "system",
            "status": "running",
            "message": "Starting Multi-Agent System pipeline...",
            "progress": 0.0
        })

        # Run the graph
        logger.info(f"[PIPELINE] Invoking negotiation graph...")
        final_state = await negotiation_graph.ainvoke(initial_state)
        logger.info(f"[PIPELINE] Graph execution completed. Errors: {len(final_state.get('errors', []))}")

        # Check for errors
        if final_state.get("errors") and len(final_state["errors"]) > 0:
            briefings_store[job_id] = {
                "status": "error",
                "briefing": {},
                "errors": final_state["errors"],
                "vector_db_id": None
            }

            await progress_tracker.publish(job_id, {
                "agent": "system",
                "status": "error",
                "message": f"Pipeline failed: {', '.join(final_state['errors'])}",
                "progress": final_state.get("progress", 0.0)
            })
            return

        # Store briefing in vector DB
        logger.info(f"[PIPELINE] Storing briefing in vector DB for job_id={job_id}")
        logger.info(f"[PIPELINE] Briefing data present: {final_state.get('final_briefing') is not None}")

        vector_db_id = await store_briefing_in_vector_db(
            job_id=job_id,
            briefing=final_state["final_briefing"]
        )

        logger.info(f"[PIPELINE] Vector DB storage completed, vector_db_id={vector_db_id}")

        # Save final result
        logger.info(f"[PIPELINE] Storing briefing in briefings_store for job_id={job_id}")
        briefings_store[job_id] = {
            "status": "completed",
            "briefing": final_state["final_briefing"],
            "vector_db_id": vector_db_id,
            "normalized_goals": final_state.get("normalized_goals"),
            "deal_type": final_state.get("deal_type"),
            "research_results": final_state.get("research_results"),
            "identified_potentials": final_state.get("identified_potentials"),
        }

        logger.info(f"[PIPELINE] Briefing stored in briefings_store. Store now contains {len(briefings_store)} items")
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
            "briefing": {},
            "error": str(e),
            "vector_db_id": None
        }

        await progress_tracker.publish(job_id, {
            "agent": "system",
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "progress": 0.0
        })
        logger.info(f"[PIPELINE] Error published to progress tracker")
