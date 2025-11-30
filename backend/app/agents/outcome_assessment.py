"""
Outcome Assessment Agent - Parallel agent for negotiation strategy and outcome prediction.

Responsibilities:
1. Research negotiation tactics using Perplexity
2. Calculate target achievability
3. Generate negotiation leverage points and tactics using GPT
4. Structure output as OutcomeAssessment schema
"""

import logging
from langchain_core.runnables import RunnableConfig
from langchain.prompts import ChatPromptTemplate

from app.agents.state import NegotiationState
from app.agents.schemas import OutcomeAssessment
from app.utils.perplexity import perplexity_batch_search
from app.utils.llm import get_llm
from app.config import get_settings
from app.services.progress_tracker import get_progress_tracker

logger = logging.getLogger(__name__)
progress_tracker = get_progress_tracker()


def parse_price(price_str: str) -> float:
    """Extract numeric value from price string."""
    try:
        # Remove currency symbols and commas
        clean_price = ''.join(c for c in str(price_str) if c.isdigit() or c == '.')
        return float(clean_price) if clean_price else 0.0
    except:
        return 0.0


async def outcome_assessment_node(state: NegotiationState, config: RunnableConfig) -> NegotiationState:
    """
    Assess negotiation outcomes and generate strategy.

    Flow:
    1. Research negotiation tactics using Perplexity
    2. Calculate target_achievable (offer_price <= target_price)
    3. Use GPT to generate tactics and leverage points
    4. Structure results as OutcomeAssessment
    5. Update state and progress

    Args:
        state: Current negotiation state
        config: Runnable config

    Returns:
        Updated state with outcome_assessment populated
    """
    job_id = state["job_id"]
    settings = get_settings()

    logger.info(f"[OUTCOME_ASSESSMENT] Starting for job_id={job_id}")

    await progress_tracker.publish(job_id, {
        "agent": "outcome_assessment",
        "status": "running",
        "message": "Starting outcome assessment...",
        "detail": "Researching negotiation tactics",
        "progress": 0.15,
        "agentProgress": 0.0
    })

    # Small delay to ensure SSE sends the message before blocking on Perplexity
    import asyncio
    await asyncio.sleep(0.1)

    try:
        # Extract parsed input
        parsed_input = state.get("parsed_input")
        if not parsed_input:
            error_msg = "Missing parsed_input"
            logger.error(f"[OUTCOME_ASSESSMENT] {error_msg}")
            state["errors"].append(error_msg)
            return state

        supplier_name = parsed_input["form_data"]["supplier_name"]
        product_type = parsed_input["form_data"]["product_type"]
        offer_price_str = parsed_input["form_data"]["offer_price"]
        target_price_str = parsed_input["form_data"]["target_price"]
        max_price_str = parsed_input["form_data"]["max_price"]
        value_assessment = parsed_input["form_data"]["value_assessment"]

        # Parse prices
        offer_price = parse_price(offer_price_str)
        target_price = parse_price(target_price_str)
        max_price = parse_price(max_price_str)

        logger.info(f"[OUTCOME_ASSESSMENT] Prices - Offer: {offer_price}, Target: {target_price}, Max: {max_price}")

        # ========================================================================
        # STEP 1: PERPLEXITY RESEARCH
        # ========================================================================
        await progress_tracker.publish(job_id, {
            "agent": "outcome_assessment",
            "status": "running",
            "message": "Researching negotiation tactics...",
            "detail": f"Finding leverage for {product_type} deals",
            "progress": 0.18,
            "agentProgress": 0.2
        })

        queries = [
            {
                "key": "tactics",
                "query": f'negotiation tactics {product_type} contracts best practices',
                "system_prompt": "Provide specific, actionable negotiation tactics for this type of deal."
            },
            {
                "key": "leverage",
                "query": f'supplier negotiation leverage points {product_type} procurement',
                "system_prompt": "Identify common leverage points buyers have in these negotiations."
            }
        ]

        search_results = await perplexity_batch_search(
            queries=queries,
            api_key=settings.perplexity_api_key,
            model="sonar-reasoning"
        )

        await progress_tracker.publish(job_id, {
            "agent": "outcome_assessment",
            "status": "running",
            "message": "Research complete, building strategy...",
            "detail": "Generating negotiation recommendations",
            "progress": 0.25,
            "agentProgress": 0.5
        })

        # ========================================================================
        # STEP 2: CALCULATE TARGET ACHIEVABLE
        # ========================================================================
        target_achievable = offer_price <= target_price if offer_price and target_price else False

        # Map value_assessment to confidence
        confidence_map = {
            "urgent": "High",
            "high_impact": "High",
            "medium_impact": "Medium",
            "low_impact": "Low"
        }
        confidence = confidence_map.get(value_assessment, "Medium")

        # Map value_assessment to partnership recommendation
        partnership_map = {
            "urgent": "Strategic Partner",
            "high_impact": "Strategic Partner",
            "medium_impact": "Preferred Vendor",
            "low_impact": "Transactional"
        }
        partnership_recommendation = partnership_map.get(value_assessment, "Preferred Vendor")

        # ========================================================================
        # STEP 3: GPT ANALYSIS
        # ========================================================================

        # Build research context
        research_context = ""
        for key, result in search_results.items():
            if result.get("success"):
                research_context += f"\n\n{key.upper()}:\n{result['content'][:500]}"

        # Get market analysis and offer analysis results
        # Note: This agent runs after market_analysis and offer_analysis have completed,
        # so their outputs are guaranteed to be available
        market_analysis = state.get("market_analysis", {})
        offer_analysis = state.get("offer_analysis", {})

        alternatives_overview = market_analysis.get("alternatives_overview", "No alternatives data")
        completeness_score = offer_analysis.get("completeness_score", 5)
        key_risks = market_analysis.get("key_risks", [])

        # Create analysis prompt
        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a strategic negotiation advisor. Based on the research and analysis, provide:

1. Negotiation Leverage: List 3-5 specific leverage points based on alternatives, gaps, market position, urgency
2. Recommended Tactics: Provide 3-5 concrete tactical tips for this specific negotiation

Be specific and actionable. Focus on what gives the buyer power in this negotiation."""),
            ("user", """Supplier: {supplier_name}
Target Achievable: {target_achievable}
Confidence: {confidence}

Pricing:
- Offer: {offer_price}
- Target: {target_price}
- Max: {max_price}

Offer Completeness Score: {completeness_score}/10

Alternatives: {alternatives_overview}

Key Risks: {key_risks}

Industry Research:
{research_context}

Provide your analysis in this exact format:
LEVERAGE 1: [specific leverage point]
LEVERAGE 2: [specific leverage point]
LEVERAGE 3: [specific leverage point]
LEVERAGE 4: [specific leverage point]
LEVERAGE 5: [specific leverage point]
TACTIC 1: [specific tactic]
TACTIC 2: [specific tactic]
TACTIC 3: [specific tactic]
TACTIC 4: [specific tactic]
TACTIC 5: [specific tactic]""")
        ])

        llm = get_llm(temperature=0.4)
        chain = analysis_prompt | llm

        response = await chain.ainvoke({
            "supplier_name": supplier_name,
            "target_achievable": "Yes" if target_achievable else "No",
            "confidence": confidence,
            "offer_price": offer_price_str,
            "target_price": target_price_str,
            "max_price": max_price_str,
            "completeness_score": completeness_score,
            "alternatives_overview": alternatives_overview,
            "key_risks": ", ".join(key_risks) if key_risks else "None identified",
            "research_context": research_context
        })

        # Parse GPT response
        response_text = response.content

        # Extract leverage points and tactics
        negotiation_leverage = []
        recommended_tactics = []

        lines = response_text.split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("LEVERAGE"):
                leverage_text = line.split(":", 1)[1].strip() if ":" in line else line
                negotiation_leverage.append(leverage_text)
            elif line.startswith("TACTIC"):
                tactic_text = line.split(":", 1)[1].strip() if ":" in line else line
                recommended_tactics.append(tactic_text)

        # Ensure we have at least 3 of each
        if not negotiation_leverage:
            negotiation_leverage = ["Multiple alternatives available", "Gaps in offer provide leverage", "Market competition"]

        if not recommended_tactics:
            recommended_tactics = ["Highlight offer gaps", "Reference alternatives", "Emphasize value assessment"]

        # Clamp to 3-5 items
        negotiation_leverage = negotiation_leverage[:5]
        recommended_tactics = recommended_tactics[:5]

        while len(recommended_tactics) < 3:
            recommended_tactics.append("Request additional concessions")

        # Build OutcomeAssessment
        outcome_assessment = OutcomeAssessment(
            target_achievable=target_achievable,
            confidence=confidence,
            negotiation_leverage=negotiation_leverage,
            recommended_tactics=recommended_tactics,
            partnership_recommendation=partnership_recommendation
        )

        logger.info(f"[OUTCOME_ASSESSMENT] Completed successfully (target achievable: {target_achievable})")
        await progress_tracker.publish(job_id, {
            "agent": "outcome_assessment",
            "status": "completed",
            "message": "✓ Outcome assessment complete",
            "detail": f"Strategy ready - {'Target achievable' if target_achievable else 'Negotiate hard'}",
            "progress": 0.35,
            "agentProgress": 1.0
        })

        # Return ONLY the keys this agent updates
        return {
            "outcome_assessment": outcome_assessment.dict(),
            "agent_progress": {"outcome_assessment": 1.0}
        }

    except Exception as e:
        error_msg = f"Outcome assessment error: {str(e)}"
        logger.error(f"[OUTCOME_ASSESSMENT] {error_msg}", exc_info=True)

        await progress_tracker.publish(job_id, {
            "agent": "outcome_assessment",
            "status": "error",
            "message": "Outcome assessment failed",
            "detail": error_msg,
            "progress": 0.15,
            "agentProgress": 0.0
        })

        return {
            "errors": [error_msg]
        }
