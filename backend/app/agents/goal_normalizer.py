import json
from app.agents.state import NegotiationState
from app.utils.llm import get_llm
from app.services.progress_tracker import progress_tracker
from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field


class BudgetRange(BaseModel):
    """Budget range for the negotiation."""
    min: float = Field(description="Minimum budget amount")
    max: float = Field(description="Maximum budget amount")
    currency: str = Field(description="Currency code (EUR/USD/CHF)")


class NormalizedGoals(BaseModel):
    """Structured negotiation goals extracted from offer document."""
    primary_goals: list[str] = Field(description="List of main negotiation objectives")
    secondary_goals: list[str] = Field(description="List of nice-to-have objectives")
    deal_type: str = Field(description="Category of the deal (e.g., IT_INFRASTRUCTURE, SOFTWARE_LICENSE, CONSULTING_SERVICES)")
    budget_range: BudgetRange = Field(description="Budget range for the negotiation")
    critical_requirements: list[str] = Field(description="Must-have technical or business requirements")
    timeline: str = Field(description="Expected timeline for decision/implementation")


async def goal_normalizer_node(state: NegotiationState) -> NegotiationState:
    """
    Goal Normalizer agent: Converts freetext goals to structured JSON.

    Extracts and normalizes negotiation goals from the PDF text.
    """
    import logging
    logger = logging.getLogger(__name__)

    job_id = state["job_id"]
    logger.info(f"[GOAL_NORMALIZER] Starting for job_id={job_id}")

    await progress_tracker.publish(job_id, {
        "agent": "goal_normalizer",
        "status": "running",
        "message": "Analyzing and structuring negotiation goals...",
        "progress": 0.2
    })
    logger.info(f"[GOAL_NORMALIZER] Progress published")

    state["current_agent"] = "goal_normalizer"

    llm = get_llm(temperature=0.3)

    # Use with_structured_output for guaranteed JSON
    structured_llm = llm.with_structured_output(NormalizedGoals)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert procurement analyst. Analyze the provided offer document and extract structured negotiation goals.

Extract realistic goals based on the document content. If information is missing, make reasonable inferences."""),
        ("user", """Extracted data from offer:
Supplier: {supplier}
Total Price: {total_price}
Delivery Time: {delivery_time}
Line Items: {line_items}
Payment Terms: {payment_terms}

Full document text (first 3000 chars):
{text}

Analyze this and extract structured negotiation goals.""")
    ])

    chain = prompt | structured_llm

    # Prepare input
    extracted = state["extracted_data"]
    text_preview = state["raw_pdf_text"][:3000]

    try:
        logger.info(f"[GOAL_NORMALIZER] Invoking LLM chain with structured output...")
        response: NormalizedGoals = await chain.ainvoke({
            "supplier": extracted.get("supplier", "Unknown"),
            "total_price": extracted.get("total_price", "Unknown"),
            "delivery_time": extracted.get("delivery_time", "Unknown"),
            "line_items": json.dumps(extracted.get("line_items", [])[:5]),  # First 5 items
            "payment_terms": extracted.get("payment_terms", "Unknown"),
            "text": text_preview
        })
        logger.info(f"[GOAL_NORMALIZER] Structured response received: {response}")

        # Convert Pydantic model to dict
        normalized_goals = response.model_dump()
        logger.info(f"[GOAL_NORMALIZER] Successfully extracted structured goals")

        state["normalized_goals"] = normalized_goals
        state["deal_type"] = normalized_goals.get("deal_type", "GENERAL")
        state["progress"] = 0.3

        logger.info(f"[GOAL_NORMALIZER] Publishing completion event")
        await progress_tracker.publish(job_id, {
            "agent": "goal_normalizer",
            "status": "completed",
            "message": f"Goals normalized. Deal type: {state['deal_type']}",
            "progress": 0.3
        })
        logger.info(f"[GOAL_NORMALIZER] Completed successfully")

    except Exception as e:
        error_msg = f"Goal normalization error: {str(e)}"
        logger.error(f"[GOAL_NORMALIZER] Exception: {error_msg}", exc_info=True)
        state["errors"].append(error_msg)

        await progress_tracker.publish(job_id, {
            "agent": "goal_normalizer",
            "status": "error",
            "message": error_msg,
            "progress": 0.3
        })

    return state
