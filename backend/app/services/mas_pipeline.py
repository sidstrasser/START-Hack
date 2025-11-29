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
    try:
        # Get document data
        documents_store = get_documents_store()
        briefings_store = get_briefings_store()

        if document_id not in documents_store:
            await progress_tracker.publish(job_id, {
                "agent": "system",
                "status": "error",
                "message": "Document not found",
                "progress": 0.0
            })
            return

        doc_data = documents_store[document_id]
        extracted_data = doc_data["extracted_data"]

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
        await progress_tracker.publish(job_id, {
            "agent": "system",
            "status": "running",
            "message": "Starting Multi-Agent System pipeline...",
            "progress": 0.0
        })

        # Run the graph
        final_state = await negotiation_graph.ainvoke(initial_state)

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
        vector_db_id = await store_briefing_in_vector_db(
            job_id=job_id,
            briefing=final_state["final_briefing"]
        )

        # Save final result
        briefings_store[job_id] = {
            "status": "completed",
            "briefing": final_state["final_briefing"],
            "vector_db_id": vector_db_id,
            "normalized_goals": final_state.get("normalized_goals"),
            "deal_type": final_state.get("deal_type"),
            "research_results": final_state.get("research_results"),
            "identified_potentials": final_state.get("identified_potentials"),
        }

        # Publish completion
        await progress_tracker.publish(job_id, {
            "agent": "system",
            "status": "completed",
            "message": "Briefing generation complete!",
            "progress": 1.0
        })

    except Exception as e:
        # Handle unexpected errors
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
