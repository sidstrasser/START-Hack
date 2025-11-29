import json
from typing import Literal
from app.agents.state import NegotiationState
from app.utils.llm import get_llm
from app.services.progress_tracker import progress_tracker
from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field


class NegotiationPotential(BaseModel):
    """A single negotiation potential/leverage point."""
    type: str = Field(description="Category (e.g., price_leverage, timing_advantage, competitor_pressure, market_conditions)")
    description: str = Field(description="Detailed description of the potential")
    confidence: float = Field(description="Confidence level from 0.0 to 1.0", ge=0.0, le=1.0)
    suggested_action: str = Field(description="Recommended tactic to leverage this potential")
    priority: Literal["high", "medium", "low"] = Field(description="Priority level")


class PotentialsList(BaseModel):
    """List of negotiation potentials."""
    potentials: list[NegotiationPotential] = Field(description="3-7 concrete, actionable negotiation potentials")


async def potential_node(state: NegotiationState) -> NegotiationState:
    """
    Potential agent: Identifies negotiation leverage points and opportunities.

    Analyzes research results + goals to find negotiation potentials.
    """
    import logging
    logger = logging.getLogger(__name__)

    job_id = state["job_id"]
    logger.info(f"[POTENTIAL] Starting for job_id={job_id}")

    await progress_tracker.publish(job_id, {
        "agent": "potential",
        "status": "running",
        "message": "Identifying negotiation potentials and leverage points...",
        "progress": 0.6
    })
    logger.info(f"[POTENTIAL] Progress published")

    state["current_agent"] = "potential"

    llm = get_llm(temperature=0.4)
    structured_llm = llm.with_structured_output(PotentialsList)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a strategic negotiation consultant. Analyze the goals and research to identify negotiation leverage points.

Identify 3-7 concrete, actionable potentials."""),
        ("user", """Negotiation Goals:
{goals}

Company Research Results:
{research}

Extracted Offer Data:
Supplier: {supplier}
Price: {price}
Delivery: {delivery}
Payment Terms: {payment}

Identify strategic negotiation potentials based on this information.""")
    ])

    chain = prompt | structured_llm

    try:
        logger.info(f"[POTENTIAL] Invoking LLM with structured output...")
        response: PotentialsList = await chain.ainvoke({
            "goals": json.dumps(state.get("normalized_goals", {}), indent=2),
            "research": json.dumps(state.get("research_results", {}), indent=2),
            "supplier": state["extracted_data"].get("supplier", "Unknown"),
            "price": state["extracted_data"].get("total_price", "Unknown"),
            "delivery": state["extracted_data"].get("delivery_time", "Unknown"),
            "payment": state["extracted_data"].get("payment_terms", "Unknown")
        })
        logger.info(f"[POTENTIAL] Structured response received with {len(response.potentials)} potentials")

        # Convert to list of dicts
        potentials = [p.model_dump() for p in response.potentials]

        state["identified_potentials"] = potentials
        state["progress"] = 0.7

        logger.info(f"[POTENTIAL] Publishing completion event")
        await progress_tracker.publish(job_id, {
            "agent": "potential",
            "status": "completed",
            "message": f"Identified {len(potentials)} negotiation potentials",
            "progress": 0.7
        })
        logger.info(f"[POTENTIAL] Completed successfully")

    except Exception as e:
        error_msg = f"Potential analysis error: {str(e)}"
        logger.error(f"[POTENTIAL] Exception: {error_msg}", exc_info=True)
        state["errors"].append(error_msg)

        # Fallback
        state["identified_potentials"] = []

        logger.info(f"[POTENTIAL] Publishing error event")
        await progress_tracker.publish(job_id, {
            "agent": "potential",
            "status": "error",
            "message": error_msg,
            "progress": 0.7
        })

    return state
