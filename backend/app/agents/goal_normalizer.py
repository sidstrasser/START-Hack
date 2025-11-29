import json
from app.agents.state import NegotiationState
from app.utils.llm import get_llm
from app.services.progress_tracker import progress_tracker
from langchain.prompts import ChatPromptTemplate


async def goal_normalizer_node(state: NegotiationState) -> NegotiationState:
    """
    Goal Normalizer agent: Converts freetext goals to structured JSON.

    Extracts and normalizes negotiation goals from the PDF text.
    """
    job_id = state["job_id"]

    await progress_tracker.publish(job_id, {
        "agent": "goal_normalizer",
        "status": "running",
        "message": "Analyzing and structuring negotiation goals...",
        "progress": 0.2
    })

    state["current_agent"] = "goal_normalizer"

    llm = get_llm(temperature=0.3)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert procurement analyst. Analyze the provided offer document and extract structured negotiation goals.

Return a JSON object with this structure:
{
  "primary_goals": ["List of main negotiation objectives"],
  "secondary_goals": ["List of nice-to-have objectives"],
  "deal_type": "Category of the deal (e.g., IT_INFRASTRUCTURE, SOFTWARE_LICENSE, CONSULTING_SERVICES, etc.)",
  "budget_range": {"min": number, "max": number, "currency": "EUR/USD/CHF"},
  "critical_requirements": ["Must-have technical or business requirements"],
  "timeline": "Expected timeline for decision/implementation"
}

Extract realistic goals based on the document content. If information is missing, make reasonable inferences."""),
        ("user", """Extracted data from offer:
Supplier: {supplier}
Total Price: {total_price}
Delivery Time: {delivery_time}
Line Items: {line_items}
Payment Terms: {payment_terms}

Full document text (first 3000 chars):
{text}

Analyze this and return structured negotiation goals as JSON.""")
    ])

    chain = prompt | llm

    # Prepare input
    extracted = state["extracted_data"]
    text_preview = state["raw_pdf_text"][:3000]

    try:
        response = await chain.ainvoke({
            "supplier": extracted.get("supplier", "Unknown"),
            "total_price": extracted.get("total_price", "Unknown"),
            "delivery_time": extracted.get("delivery_time", "Unknown"),
            "line_items": json.dumps(extracted.get("line_items", [])[:5]),  # First 5 items
            "payment_terms": extracted.get("payment_terms", "Unknown"),
            "text": text_preview
        })

        # Parse JSON response
        try:
            normalized_goals = json.loads(response.content)
        except json.JSONDecodeError:
            # Fallback structure
            normalized_goals = {
                "primary_goals": ["Optimize pricing", "Ensure quality delivery"],
                "secondary_goals": ["Flexible payment terms"],
                "deal_type": "IT_INFRASTRUCTURE",
                "budget_range": {"min": 0, "max": 0, "currency": "EUR"},
                "critical_requirements": ["Reliable delivery", "Quality guarantee"],
                "timeline": "Unknown"
            }

        state["normalized_goals"] = normalized_goals
        state["deal_type"] = normalized_goals.get("deal_type", "GENERAL")
        state["progress"] = 0.3

        await progress_tracker.publish(job_id, {
            "agent": "goal_normalizer",
            "status": "completed",
            "message": f"Goals normalized. Deal type: {state['deal_type']}",
            "progress": 0.3
        })

    except Exception as e:
        error_msg = f"Goal normalization error: {str(e)}"
        state["errors"].append(error_msg)

        await progress_tracker.publish(job_id, {
            "agent": "goal_normalizer",
            "status": "error",
            "message": error_msg,
            "progress": 0.3
        })

    return state
