import json
from typing import Literal
from app.agents.state import NegotiationState
from app.utils.llm import get_llm
from app.services.progress_tracker import progress_tracker
from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field


class SupplierOverview(BaseModel):
    """Overview of the supplier."""
    name: str = Field(description="Supplier name")
    background: str = Field(description="Company background from research")
    strengths: list[str] = Field(description="List of supplier strengths")
    weaknesses: list[str] = Field(description="List of supplier weaknesses or risks")


class OfferAnalysis(BaseModel):
    """Analysis of the offer."""
    total_value: str = Field(description="Total offer value")
    key_items: list[str] = Field(description="Main items/services in the offer")
    assessment: str = Field(description="Professional assessment of the offer")


class NegotiationStrategy(BaseModel):
    """Negotiation strategy recommendations."""
    opening_position: str = Field(description="Recommended starting position")
    target_position: str = Field(description="Ideal outcome to aim for")
    walkaway_point: str = Field(description="Minimum acceptable terms")
    recommended_sequence: list[str] = Field(description="Step by step negotiation approach")


class TalkingPoint(BaseModel):
    """A key talking point."""
    point: str = Field(description="The talking point")
    rationale: str = Field(description="Why to use this")
    timing: str = Field(description="When to raise it")


class LeveragePoint(BaseModel):
    """A leverage point."""
    lever: str = Field(description="What gives us leverage")
    how_to_use: str = Field(description="How to deploy it")


class PotentialObjection(BaseModel):
    """A potential objection and counter."""
    objection: str = Field(description="What supplier might say")
    counter: str = Field(description="How to respond")


class RiskAssessment(BaseModel):
    """Risk assessment."""
    risks: list[str] = Field(description="Potential risks")
    mitigation: list[str] = Field(description="How to mitigate each risk")


class Briefing(BaseModel):
    """Comprehensive negotiation briefing."""
    executive_summary: str = Field(description="2-3 paragraph overview of the situation and key recommendations")
    supplier_overview: SupplierOverview = Field(description="Supplier overview")
    offer_analysis: OfferAnalysis = Field(description="Analysis of the offer")
    negotiation_strategy: NegotiationStrategy = Field(description="Negotiation strategy")
    key_talking_points: list[TalkingPoint] = Field(description="Key talking points")
    leverage_points: list[LeveragePoint] = Field(description="Leverage points")
    potential_objections: list[PotentialObjection] = Field(description="Potential objections and counters")
    risk_assessment: RiskAssessment = Field(description="Risk assessment")
    timeline_recommendations: str = Field(description="Suggested timeline for negotiation phases")
    success_metrics: list[str] = Field(description="How to measure if negotiation was successful")


async def briefing_node(state: NegotiationState) -> NegotiationState:
    """
    Briefing agent: Creates the final comprehensive negotiation briefing.

    Combines all previous agent outputs into a structured briefing document.
    """
    import logging
    logger = logging.getLogger(__name__)

    job_id = state["job_id"]
    logger.info(f"[BRIEFING] Starting for job_id={job_id}")

    await progress_tracker.publish(job_id, {
        "agent": "briefing",
        "status": "running",
        "message": "Generating comprehensive negotiation briefing...",
        "progress": 0.8
    })
    logger.info(f"[BRIEFING] Progress published")

    state["current_agent"] = "briefing"

    llm = get_llm(temperature=0.5)
    structured_llm = llm.with_structured_output(Briefing)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert negotiation strategist creating a comprehensive briefing for a procurement negotiator.

Make it professional, specific, and actionable. Use insights from research and identified potentials."""),
        ("user", """Create a negotiation briefing based on:

GOALS:
{goals}

RESEARCH RESULTS:
{research}

IDENTIFIED POTENTIALS:
{potentials}

OFFER DETAILS:
Supplier: {supplier}
Price: {price}
Delivery: {delivery}
Payment Terms: {payment}
Line Items: {items}

Generate comprehensive briefing.""")
    ])

    chain = prompt | structured_llm

    try:
        logger.info(f"[BRIEFING] Invoking LLM with structured output...")
        response: Briefing = await chain.ainvoke({
            "goals": json.dumps(state.get("normalized_goals", {}), indent=2),
            "research": json.dumps(state.get("research_results", {}), indent=2),
            "potentials": json.dumps(state.get("identified_potentials", []), indent=2),
            "supplier": state["extracted_data"].get("supplier", "Unknown"),
            "price": state["extracted_data"].get("total_price", "Unknown"),
            "delivery": state["extracted_data"].get("delivery_time", "Unknown"),
            "payment": state["extracted_data"].get("payment_terms", "Unknown"),
            "items": json.dumps(state["extracted_data"].get("line_items", [])[:10])
        })
        logger.info(f"[BRIEFING] Structured response received")

        # Convert to dict
        briefing = response.model_dump()

        state["final_briefing"] = briefing
        state["progress"] = 0.9

        logger.info(f"[BRIEFING] Publishing completion event")
        await progress_tracker.publish(job_id, {
            "agent": "briefing",
            "status": "completed",
            "message": "Briefing generated successfully",
            "progress": 0.9
        })
        logger.info(f"[BRIEFING] Completed successfully")

    except Exception as e:
        error_msg = f"Briefing generation error: {str(e)}"
        logger.error(f"[BRIEFING] Exception: {error_msg}", exc_info=True)
        state["errors"].append(error_msg)

        # Minimal fallback
        state["final_briefing"] = {
            "executive_summary": f"Error generating briefing: {str(e)}",
            "error": True
        }

        logger.info(f"[BRIEFING] Publishing error event")
        await progress_tracker.publish(job_id, {
            "agent": "briefing",
            "status": "error",
            "message": error_msg,
            "progress": 0.9
        })

    return state
