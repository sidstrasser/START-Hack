import json
from app.agents.state import NegotiationState
from app.utils.llm import get_llm
from app.services.progress_tracker import progress_tracker
from langchain.prompts import ChatPromptTemplate


async def briefing_node(state: NegotiationState) -> NegotiationState:
    """
    Briefing agent: Creates the final comprehensive negotiation briefing.

    Combines all previous agent outputs into a structured briefing document.
    """
    job_id = state["job_id"]

    await progress_tracker.publish(job_id, {
        "agent": "briefing",
        "status": "running",
        "message": "Generating comprehensive negotiation briefing...",
        "progress": 0.8
    })

    state["current_agent"] = "briefing"

    llm = get_llm(temperature=0.5)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert negotiation strategist creating a comprehensive briefing for a procurement negotiator.

Create a detailed, actionable briefing document with this JSON structure:
{
  "executive_summary": "2-3 paragraph overview of the situation and key recommendations",
  "supplier_overview": {
    "name": "Supplier name",
    "background": "Company background from research",
    "strengths": ["List of supplier strengths"],
    "weaknesses": ["List of supplier weaknesses or risks"]
  },
  "offer_analysis": {
    "total_value": "Total offer value",
    "key_items": ["Main items/services in the offer"],
    "assessment": "Professional assessment of the offer"
  },
  "negotiation_strategy": {
    "opening_position": "Recommended starting position",
    "target_position": "Ideal outcome to aim for",
    "walkaway_point": "Minimum acceptable terms",
    "recommended_sequence": ["Step by step negotiation approach"]
  },
  "key_talking_points": [
    {"point": "Talking point", "rationale": "Why to use this", "timing": "When to raise it"}
  ],
  "leverage_points": [
    {"lever": "What gives us leverage", "how_to_use": "How to deploy it"}
  ],
  "potential_objections": [
    {"objection": "What supplier might say", "counter": "How to respond"}
  ],
  "risk_assessment": {
    "risks": ["Potential risks"],
    "mitigation": ["How to mitigate each risk"]
  },
  "timeline_recommendations": "Suggested timeline for negotiation phases",
  "success_metrics": ["How to measure if negotiation was successful"]
}

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

Generate comprehensive briefing as JSON.""")
    ])

    chain = prompt | llm

    try:
        response = await chain.ainvoke({
            "goals": json.dumps(state.get("normalized_goals", {}), indent=2),
            "research": json.dumps(state.get("research_results", {}), indent=2),
            "potentials": json.dumps(state.get("identified_potentials", []), indent=2),
            "supplier": state["extracted_data"].get("supplier", "Unknown"),
            "price": state["extracted_data"].get("total_price", "Unknown"),
            "delivery": state["extracted_data"].get("delivery_time", "Unknown"),
            "payment": state["extracted_data"].get("payment_terms", "Unknown"),
            "items": json.dumps(state["extracted_data"].get("line_items", [])[:10])
        })

        # Parse JSON response
        try:
            briefing = json.loads(response.content)
        except json.JSONDecodeError:
            # Minimal fallback briefing
            briefing = {
                "executive_summary": "Briefing generation encountered an error. Please review extracted data manually.",
                "supplier_overview": {"name": state["extracted_data"].get("supplier", "Unknown")},
                "offer_analysis": {"total_value": state["extracted_data"].get("total_price", "Unknown")},
                "negotiation_strategy": {
                    "opening_position": "Review offer details",
                    "target_position": "Optimize terms",
                    "walkaway_point": "To be determined"
                },
                "key_talking_points": [],
                "leverage_points": [],
                "potential_objections": [],
                "risk_assessment": {"risks": [], "mitigation": []},
                "timeline_recommendations": "To be determined",
                "success_metrics": []
            }

        state["final_briefing"] = briefing
        state["progress"] = 1.0

        await progress_tracker.publish(job_id, {
            "agent": "briefing",
            "status": "completed",
            "message": "Briefing generated successfully",
            "progress": 1.0
        })

    except Exception as e:
        error_msg = f"Briefing generation error: {str(e)}"
        state["errors"].append(error_msg)

        # Minimal fallback
        state["final_briefing"] = {
            "executive_summary": f"Error generating briefing: {str(e)}",
            "error": True
        }

        await progress_tracker.publish(job_id, {
            "agent": "briefing",
            "status": "error",
            "message": error_msg,
            "progress": 0.9
        })

    return state
