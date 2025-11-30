"""
Analyze Agent - Third and final node in the negotiation briefing pipeline.

Responsibilities:
1. Synthesize all inputs (parsed data, research results, form data)
2. Generate comprehensive negotiation briefing with 5 sections:
   - Supplier Summary
   - Market Analysis
   - Offer Analysis
   - Outcome Assessment
   - Action Items
3. Apply mocked/semi-mocked logic for certain sections
"""

import logging
import re
from langchain_core.runnables import RunnableConfig
from langchain.prompts import ChatPromptTemplate

from app.agents.state import NegotiationState
from app.agents.schemas import (
    FinalBriefing,
    SupplierSummary,
    MarketAnalysis,
    OfferAnalysis,
    OutcomeAssessment,
    ActionItem,
    CompanyOverview
)
from app.utils.llm import get_llm
from app.services.progress_tracker import get_progress_tracker

logger = logging.getLogger(__name__)
progress_tracker = get_progress_tracker()


async def analyze_node(state: NegotiationState, config: RunnableConfig) -> NegotiationState:
    """
    Synthesize all inputs into final negotiation briefing.

    Flow:
    1. Extract all context from parsed_input and research_output
    2. Build comprehensive prompt with all data
    3. Generate FinalBriefing using LLM with structured output
    4. Apply additional logic for calculated fields
    5. Update state and progress

    Args:
        state: Current negotiation state
        config: Runnable config

    Returns:
        Updated state with final_briefing populated
    """
    job_id = state["job_id"]
    logger.info(f"[ANALYZE] Starting analyze node for job_id={job_id}")

    await progress_tracker.publish(job_id, {
        "agent": "analyze",
        "status": "running",
        "message": "Generating negotiation briefing...",
        "progress": 0.7
    })

    state["current_agent"] = "analyze"

    # ========================================================================
    # STEP 1: EXTRACT ALL CONTEXT
    # ========================================================================
    parsed_input = state["parsed_input"]
    research_output = state["research_output"]

    supplier_offer_text = parsed_input["supplier_offer_text"]
    alternatives = parsed_input["alternatives"]
    form_data = parsed_input["form_data"]
    additional_context = parsed_input.get("additional_context", "")

    logger.info(f"[ANALYZE] Context extracted - {len(alternatives)} alternatives found")

    # ========================================================================
    # STEP 2: BUILD COMPREHENSIVE PROMPT
    # ========================================================================
    llm = get_llm(temperature=0.5)
    structured_llm = llm.with_structured_output(FinalBriefing)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert negotiation strategist creating a comprehensive briefing for procurement negotiations.

Generate a complete negotiation briefing with these 4 sections, plus a separate list of action items:

1. SUPPLIER SUMMARY
   - Use the provided research data for company overview, key facts, and recent news
   - Include contact information

2. MARKET ANALYSIS
   - Alternatives Overview: Synthesize the provided alternative suppliers into a coherent overview
   - Price Positioning: Analyze if offer price is competitive (use "Insufficient data" if no market pricing available)
   - Key Risks: Identify max 3 risks based on supplier research and offer

3. OFFER ANALYSIS
   - Completeness Score (1-10): Rate based on presence of key terms (SLA, cancellation policy, warranty, pricing breakdown, technical specs)
   - Completeness Notes: Explain what's present/missing
   - Price Assessment: Compare offer_price vs target_price and max_price
   - Hidden Cost Warnings: Identify potential hidden costs

4. OUTCOME ASSESSMENT
   - Target Achievable: true if offer_price <= target_price, false otherwise
   - Confidence: "High" if value_assessment is urgent/high_impact, "Medium" if medium_impact, "Low" if low_impact
   - Negotiation Leverage: List leverage points (alternatives, market position, urgency, etc.)
   - Recommended Tactics: Provide 3-5 concrete tactical tips
   - Partnership Recommendation: "Strategic Partner" if urgent/high_impact, "Preferred Vendor" if medium_impact, "Transactional" if low_impact

ACTION ITEMS (Separate from briefing):
   - Generate EXACTLY 5 most important action items
   - Each item must have: id (1-5) and description
   - Focus on the highest priority actions the negotiator should take
   - Be specific and actionable

Be specific and actionable. Use the provided data to create a practical negotiation guide."""),
        ("user", """Create a negotiation briefing using this information:

SUPPLIER OFFER (PDF Extract):
{supplier_offer_text}

FORM DATA:
- Supplier: {supplier_name}
- Product: {product_description} ({product_type})
- Offer Price: {offer_price} ({pricing_model})
- Target Price: {target_price}
- Max Price: {max_price}
- Value Assessment: {value_assessment}

RESEARCH RESULTS:
Company Overview: {company_overview}
Key Facts: {key_facts}
Recent News: {recent_news}

ALTERNATIVE SUPPLIERS:
{alternatives}

ADDITIONAL CONTEXT:
{additional_context}

Generate the complete briefing.""")
    ])

    chain = prompt | structured_llm

    # ========================================================================
    # STEP 3: GENERATE BRIEFING
    # ========================================================================
    try:
        logger.info(f"[ANALYZE] Invoking LLM for briefing generation...")

        # Prepare alternatives text
        alternatives_text = "\n".join([
            f"- {alt['name']}: {alt.get('description', 'No description')}"
            for alt in alternatives
        ]) if alternatives else "No alternatives provided"

        response: FinalBriefing = await chain.ainvoke({
            "supplier_offer_text": supplier_offer_text[:8000],  # Limit length
            "supplier_name": form_data["supplier_name"],
            "product_description": form_data["product_description"],
            "product_type": form_data["product_type"],
            "offer_price": form_data["offer_price"],
            "pricing_model": form_data["pricing_model"],
            "target_price": form_data["target_price"],
            "max_price": form_data["max_price"],
            "value_assessment": form_data["value_assessment"],
            "company_overview": research_output["company_overview"],
            "key_facts": "\n".join(research_output["key_facts"]) if research_output["key_facts"] else "No key facts available",
            "recent_news": "\n".join(research_output["recent_news"]) if research_output["recent_news"] else "No recent news available",
            "alternatives": alternatives_text,
            "additional_context": additional_context or "None provided"
        })

        logger.info(f"[ANALYZE] LLM generation completed")

        # ========================================================================
        # STEP 4: APPLY CALCULATED LOGIC (OVERRIDES)
        # ========================================================================

        # Override target_achievable with precise logic
        try:
            offer_numeric = parse_price(form_data["offer_price"])
            target_numeric = parse_price(form_data["target_price"])

            if offer_numeric is not None and target_numeric is not None:
                response.outcome_assessment.target_achievable = (offer_numeric <= target_numeric)
                logger.info(f"[ANALYZE] Target achievable: {response.outcome_assessment.target_achievable} (offer={offer_numeric}, target={target_numeric})")
        except Exception as e:
            logger.warning(f"[ANALYZE] Could not calculate target_achievable: {e}")

        # Override confidence based on value_assessment
        confidence_map = {
            "urgent": "High",
            "high_impact": "High",
            "medium_impact": "Medium",
            "low_impact": "Low"
        }
        response.outcome_assessment.confidence = confidence_map.get(
            form_data["value_assessment"],
            "Medium"
        )

        # Override partnership recommendation based on value_assessment
        partnership_map = {
            "urgent": "Strategic Partner",
            "high_impact": "Strategic Partner",
            "medium_impact": "Preferred Vendor",
            "low_impact": "Transactional"
        }
        response.outcome_assessment.partnership_recommendation = partnership_map.get(
            form_data["value_assessment"],
            "Preferred Vendor"
        )

        # Update state
        state["final_briefing"] = response.model_dump()
        state["progress"] = 1.0

        logger.info(f"[ANALYZE] Analyze node completed successfully")
        await progress_tracker.publish(job_id, {
            "agent": "analyze",
            "status": "completed",
            "message": "Briefing generation complete!",
            "progress": 1.0
        })

    except Exception as e:
        error_msg = f"Briefing generation error: {str(e)}"
        logger.error(f"[ANALYZE] Exception: {error_msg}", exc_info=True)
        state["errors"].append(error_msg)
        state["progress"] = 0.7

        await progress_tracker.publish(job_id, {
            "agent": "analyze",
            "status": "error",
            "message": error_msg,
            "progress": 0.7
        })

    return state


def parse_price(price_str: str) -> float | None:
    """
    Extract numeric value from price string.

    Examples:
    - "$10,000" -> 10000.0
    - "€5.000" -> 5000.0
    - "1000 USD" -> 1000.0

    Args:
        price_str: Price string with currency symbols/formatting

    Returns:
        Numeric value or None if parsing fails
    """
    try:
        # Remove currency symbols and common formatting
        cleaned = re.sub(r'[^\d.,]', '', price_str)

        # Handle European format (. as thousands separator, , as decimal)
        if ',' in cleaned and '.' in cleaned:
            # Determine format by position
            if cleaned.rindex(',') > cleaned.rindex('.'):
                # European: 1.000,50 -> 1000.50
                cleaned = cleaned.replace('.', '').replace(',', '.')
            else:
                # US: 1,000.50 -> 1000.50
                cleaned = cleaned.replace(',', '')
        elif ',' in cleaned:
            # Ambiguous - assume US format (1,000)
            cleaned = cleaned.replace(',', '')

        return float(cleaned)
    except Exception:
        return None
