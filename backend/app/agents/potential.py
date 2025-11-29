import json
from app.agents.state import NegotiationState
from app.utils.llm import get_llm
from app.services.progress_tracker import progress_tracker
from langchain.prompts import ChatPromptTemplate


async def potential_node(state: NegotiationState) -> NegotiationState:
    """
    Potential agent: Identifies negotiation leverage points and opportunities.

    Analyzes research results + goals to find negotiation potentials.
    """
    job_id = state["job_id"]

    await progress_tracker.publish(job_id, {
        "agent": "potential",
        "status": "running",
        "message": "Identifying negotiation potentials and leverage points...",
        "progress": 0.6
    })

    state["current_agent"] = "potential"

    llm = get_llm(temperature=0.4)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a strategic negotiation consultant. Analyze the goals and research to identify negotiation leverage points.

Return a JSON array of potential opportunities:
[
  {
    "type": "Category (e.g., price_leverage, timing_advantage, competitor_pressure, market_conditions)",
    "description": "Detailed description of the potential",
    "confidence": 0.0-1.0,
    "suggested_action": "Recommended tactic to leverage this potential",
    "priority": "high/medium/low"
  }
]

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

    chain = prompt | llm

    try:
        response = await chain.ainvoke({
            "goals": json.dumps(state.get("normalized_goals", {}), indent=2),
            "research": json.dumps(state.get("research_results", {}), indent=2),
            "supplier": state["extracted_data"].get("supplier", "Unknown"),
            "price": state["extracted_data"].get("total_price", "Unknown"),
            "delivery": state["extracted_data"].get("delivery_time", "Unknown"),
            "payment": state["extracted_data"].get("payment_terms", "Unknown")
        })

        # Parse JSON response
        try:
            potentials = json.loads(response.content)
            if not isinstance(potentials, list):
                potentials = []
        except json.JSONDecodeError:
            potentials = []

        # Fallback potentials if parsing fails
        if not potentials:
            potentials = [
                {
                    "type": "price_negotiation",
                    "description": "Standard price optimization opportunity",
                    "confidence": 0.6,
                    "suggested_action": "Request volume discount or better pricing terms",
                    "priority": "high"
                },
                {
                    "type": "payment_terms",
                    "description": "Extended payment terms may be negotiable",
                    "confidence": 0.5,
                    "suggested_action": "Negotiate for extended payment period",
                    "priority": "medium"
                }
            ]

        state["identified_potentials"] = potentials
        state["progress"] = 0.7

        await progress_tracker.publish(job_id, {
            "agent": "potential",
            "status": "completed",
            "message": f"Identified {len(potentials)} negotiation potentials",
            "progress": 0.7
        })

    except Exception as e:
        error_msg = f"Potential analysis error: {str(e)}"
        state["errors"].append(error_msg)

        # Fallback
        state["identified_potentials"] = []

        await progress_tracker.publish(job_id, {
            "agent": "potential",
            "status": "error",
            "message": error_msg,
            "progress": 0.7
        })

    return state
