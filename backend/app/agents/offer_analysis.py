"""
Offer Analysis Agent - Parallel agent for analyzing the supplier's offer.

Responsibilities:
1. Research industry standards using Perplexity
2. Compare offer against initial request using GPT
3. Identify completeness gaps and hidden costs
4. Structure output as OfferAnalysis schema
"""

import logging
from langchain_core.runnables import RunnableConfig
from langchain.prompts import ChatPromptTemplate

from app.agents.state import NegotiationState
from app.agents.schemas import OfferAnalysis
from app.utils.perplexity import perplexity_batch_search
from app.utils.llm import get_llm
from app.config import get_settings
from app.services.progress_tracker import get_progress_tracker

logger = logging.getLogger(__name__)
progress_tracker = get_progress_tracker()


async def offer_analysis_node(state: NegotiationState, config: RunnableConfig) -> NegotiationState:
    """
    Analyze the supplier's offer for completeness and pricing.

    Flow:
    1. Research industry standards using Perplexity
    2. Use GPT to compare offer vs initial request (gap analysis)
    3. Rate completeness and identify hidden costs
    4. Structure results as OfferAnalysis
    5. Update state and progress

    Args:
        state: Current negotiation state
        config: Runnable config

    Returns:
        Updated state with offer_analysis populated
    """
    job_id = state["job_id"]
    settings = get_settings()

    logger.info(f"[OFFER_ANALYSIS] Starting for job_id={job_id}")

    await progress_tracker.publish(job_id, {
        "agent": "offer_analysis",
        "status": "running",
        "message": "Starting offer analysis...",
        "detail": "Researching industry standards",
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
            logger.error(f"[OFFER_ANALYSIS] {error_msg}")
            state["errors"].append(error_msg)
            return state

        supplier_offer_text = parsed_input["supplier_offer_text"]
        initial_request_text = parsed_input["initial_request_text"]
        product_type = parsed_input["form_data"]["product_type"]
        offer_price = parsed_input["form_data"]["offer_price"]
        target_price = parsed_input["form_data"]["target_price"]
        max_price = parsed_input["form_data"]["max_price"]

        logger.info(f"[OFFER_ANALYSIS] Analyzing offer: {offer_price} vs target: {target_price}")

        # ========================================================================
        # STEP 1: PERPLEXITY RESEARCH
        # ========================================================================
        await progress_tracker.publish(job_id, {
            "agent": "offer_analysis",
            "status": "running",
            "message": "Researching industry standards...",
            "detail": f"Looking up typical {product_type} terms",
            "progress": 0.18,
            "agentProgress": 0.2
        })

        queries = [
            {
                "key": "standards",
                "query": f'{product_type} standard contract terms industry best practices',
                "system_prompt": "Provide typical contract terms and deliverables for this product type."
            },
            {
                "key": "deliverables",
                "query": f'{product_type} typical deliverables scope of work',
                "system_prompt": "List common deliverables and scope items for this product/service."
            },
            {
                "key": "hidden_costs",
                "query": f'{product_type} hidden costs common issues pitfalls',
                "system_prompt": "Identify potential hidden costs and common pricing pitfalls."
            }
        ]

        search_results = await perplexity_batch_search(
            queries=queries,
            api_key=settings.perplexity_api_key,
            model="sonar-reasoning"
        )

        await progress_tracker.publish(job_id, {
            "agent": "offer_analysis",
            "status": "running",
            "message": "Research complete, analyzing offer...",
            "detail": "Comparing offer to requirements",
            "progress": 0.25,
            "agentProgress": 0.5
        })

        # ========================================================================
        # STEP 2: GPT ANALYSIS
        # ========================================================================

        # Build research context
        research_context = ""
        for key, result in search_results.items():
            if result.get("success"):
                research_context += f"\n\n{key.upper()}:\n{result['content'][:400]}"

        # Create analysis prompt
        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a contract analysis expert. Compare the supplier's offer against the initial request and industry standards.

Provide:
1. Completeness Score (1-10): Rate how well the offer addresses the initial request requirements
2. Completeness Notes: Highlight specific gaps between what was requested and what is offered
3. Price Assessment: Compare offer_price (supplier's ask) to target_price (what we want) and max_price (our ceiling)
4. Hidden Cost Warnings: Identify 2-4 potential hidden costs or missing items

Be critical and specific. The offer_price is the MAXIMUM the supplier is willing to accept."""),
            ("user", """INITIAL REQUEST:
{initial_request}

SUPPLIER OFFER:
{supplier_offer}

PRICING:
- Offer Price: {offer_price} (supplier's maximum ask)
- Target Price: {target_price} (our goal)
- Max Price: {max_price} (our ceiling)

INDUSTRY STANDARDS:
{research_context}

Provide your analysis in this exact format:
COMPLETENESS SCORE: [number 1-10]
COMPLETENESS NOTES: [specific gaps and missing items]
PRICE ASSESSMENT: [analysis comparing the three prices]
HIDDEN COST 1: [specific warning]
HIDDEN COST 2: [specific warning]
HIDDEN COST 3: [specific warning]
HIDDEN COST 4: [specific warning]""")
        ])

        llm = get_llm(temperature=0.2)
        chain = analysis_prompt | llm

        response = await chain.ainvoke({
            "initial_request": initial_request_text[:1500],
            "supplier_offer": supplier_offer_text[:1500],
            "offer_price": offer_price,
            "target_price": target_price,
            "max_price": max_price,
            "research_context": research_context
        })

        # Parse GPT response
        response_text = response.content

        # Extract sections
        completeness_score = 5  # Default
        completeness_notes = "Unable to assess completeness"
        price_assessment = f"Offer price: {offer_price}, Target: {target_price}, Max: {max_price}"
        hidden_cost_warnings = []

        if "COMPLETENESS SCORE:" in response_text:
            try:
                score_line = response_text.split("COMPLETENESS SCORE:")[1].split("\n")[0]
                completeness_score = int(score_line.strip().split()[0])
                completeness_score = max(1, min(10, completeness_score))  # Clamp 1-10
            except:
                pass

        if "COMPLETENESS NOTES:" in response_text:
            parts = response_text.split("PRICE ASSESSMENT:")
            completeness_notes = parts[0].split("COMPLETENESS NOTES:")[1].strip()

            if len(parts) > 1:
                hidden_parts = parts[1].split("HIDDEN COST")
                price_assessment = hidden_parts[0].strip()

                # Extract hidden costs
                for hidden_part in hidden_parts[1:]:
                    cost_text = hidden_part.split(":", 1)[1].strip() if ":" in hidden_part else hidden_part.strip()
                    cost_text = cost_text.split("\n")[0].strip()
                    hidden_cost_warnings.append(cost_text)

        # Ensure we have warnings
        if not hidden_cost_warnings:
            hidden_cost_warnings = ["Review all line items carefully", "Check for implementation fees", "Verify ongoing costs"]

        # Build OfferAnalysis
        offer_analysis = OfferAnalysis(
            completeness_score=completeness_score,
            completeness_notes=completeness_notes,
            price_assessment=price_assessment,
            hidden_cost_warnings=hidden_cost_warnings
        )

        logger.info(f"[OFFER_ANALYSIS] Completed successfully (score: {completeness_score}/10)")
        await progress_tracker.publish(job_id, {
            "agent": "offer_analysis",
            "status": "completed",
            "message": "✓ Offer analysis complete",
            "detail": f"Completeness score: {completeness_score}/10",
            "progress": 0.35,
            "agentProgress": 1.0
        })

        # Return ONLY the keys this agent updates
        return {
            "offer_analysis": offer_analysis.dict(),
            "agent_progress": {"offer_analysis": 1.0}
        }

    except Exception as e:
        error_msg = f"Offer analysis error: {str(e)}"
        logger.error(f"[OFFER_ANALYSIS] {error_msg}", exc_info=True)

        await progress_tracker.publish(job_id, {
            "agent": "offer_analysis",
            "status": "error",
            "message": "Offer analysis failed",
            "detail": error_msg,
            "progress": 0.15,
            "agentProgress": 0.0
        })

        return {
            "errors": [error_msg]
        }
