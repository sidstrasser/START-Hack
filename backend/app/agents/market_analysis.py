"""
Market Analysis Agent - Parallel agent for market positioning and competitive analysis.

Responsibilities:
1. Research alternative suppliers using Perplexity
2. Analyze market pricing and positioning using GPT
3. Identify key risks
4. Structure output as MarketAnalysis schema
"""

import logging
from langchain_core.runnables import RunnableConfig
from langchain.prompts import ChatPromptTemplate

from app.agents.state import NegotiationState
from app.agents.schemas import MarketAnalysis
from app.utils.perplexity import perplexity_batch_search
from app.utils.llm import get_llm
from app.config import get_settings
from app.services.progress_tracker import get_progress_tracker

logger = logging.getLogger(__name__)
progress_tracker = get_progress_tracker()


async def market_analysis_node(state: NegotiationState, config: RunnableConfig) -> NegotiationState:
    """
    Analyze market position and competitive landscape.

    Flow:
    1. Research alternatives using Perplexity
    2. Research market pricing benchmarks
    3. Use GPT to synthesize analysis
    4. Structure results as MarketAnalysis
    5. Update state and progress

    Args:
        state: Current negotiation state
        config: Runnable config

    Returns:
        Updated state with market_analysis populated
    """
    job_id = state["job_id"]
    settings = get_settings()

    logger.info(f"[MARKET_ANALYSIS] Starting for job_id={job_id}")

    await progress_tracker.publish(job_id, {
        "agent": "market_analysis",
        "status": "running",
        "message": "Starting market analysis...",
        "detail": "Researching competitive landscape",
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
            logger.error(f"[MARKET_ANALYSIS] {error_msg}")
            state["errors"].append(error_msg)
            return state

        supplier_name = parsed_input["form_data"]["supplier_name"]
        product_type = parsed_input["form_data"]["product_type"]
        offer_price = parsed_input["form_data"]["offer_price"]
        alternatives = parsed_input.get("alternatives", [])

        logger.info(f"[MARKET_ANALYSIS] Analyzing {len(alternatives)} alternatives")

        # ========================================================================
        # STEP 1: PERPLEXITY RESEARCH
        # ========================================================================
        await progress_tracker.publish(job_id, {
            "agent": "market_analysis",
            "status": "running",
            "message": "Researching alternatives and pricing...",
            "detail": f"Comparing {supplier_name} to market",
            "progress": 0.18,
            "agentProgress": 0.2
        })

        queries = []

        # Research each alternative
        for i, alt in enumerate(alternatives[:3]):  # Limit to top 3 alternatives
            queries.append({
                "key": f"alternative_{i}",
                "query": f'"{alt["name"]}" vs "{supplier_name}" comparison pricing {product_type}',
                "system_prompt": "Compare these suppliers objectively, focusing on pricing and key differences."
            })

        # Market positioning query
        queries.append({
            "key": "market_position",
            "query": f'{supplier_name} market share position {product_type} industry',
            "system_prompt": "Analyze this company's market position and reputation."
        })

        # Pricing benchmarks query
        queries.append({
            "key": "pricing_benchmarks",
            "query": f'{product_type} pricing benchmarks industry standard 2025',
            "system_prompt": "Provide typical pricing ranges for this product/service type."
        })

        # Execute all queries in parallel
        search_results = await perplexity_batch_search(
            queries=queries,
            api_key=settings.perplexity_api_key,
            model="sonar-reasoning"
        )

        await progress_tracker.publish(job_id, {
            "agent": "market_analysis",
            "status": "running",
            "message": "Research complete, analyzing data...",
            "detail": "Using GPT to synthesize findings",
            "progress": 0.25,
            "agentProgress": 0.5
        })

        # ========================================================================
        # STEP 2: GPT ANALYSIS
        # ========================================================================

        # Build comprehensive research context
        research_context = ""
        for key, result in search_results.items():
            if result.get("success"):
                research_context += f"\n\n{key.upper()}:\n{result['content'][:500]}"

        # Build alternatives context
        alternatives_text = "\n".join([f"- {alt['name']}: {alt.get('description', 'N/A')}" for alt in alternatives])
        if not alternatives_text:
            alternatives_text = "No alternatives provided"

        # Create analysis prompt
        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a strategic procurement analyst. Analyze the market data and provide:

1. Alternatives Overview: Synthesize information about alternative suppliers into a coherent 2-3 sentence overview
2. Price Positioning: Analyze if the offer price is competitive, premium, or budget compared to market rates
3. Key Risks: Identify exactly 3 key risks based on supplier research, offer gaps, and market position

Be concise, factual, and focused on negotiation leverage."""),
            ("user", """Supplier: {supplier_name}
Product Type: {product_type}
Offer Price: {offer_price}

Alternatives:
{alternatives_text}

Market Research:
{research_context}

Provide your analysis in this exact format:
ALTERNATIVES OVERVIEW: [2-3 sentences]
PRICE POSITIONING: [2-3 sentences]
KEY RISK 1: [specific risk]
KEY RISK 2: [specific risk]
KEY RISK 3: [specific risk]""")
        ])

        llm = get_llm(temperature=0.3)
        chain = analysis_prompt | llm

        response = await chain.ainvoke({
            "supplier_name": supplier_name,
            "product_type": product_type,
            "offer_price": offer_price,
            "alternatives_text": alternatives_text,
            "research_context": research_context
        })

        # Parse GPT response
        response_text = response.content

        # Extract sections
        alternatives_overview = "No alternatives analysis available"
        price_positioning = "Insufficient data for price positioning"
        key_risks = ["Market data unavailable", "Limited competitive intelligence", "Unable to assess positioning"]

        if "ALTERNATIVES OVERVIEW:" in response_text:
            parts = response_text.split("PRICE POSITIONING:")
            alternatives_overview = parts[0].split("ALTERNATIVES OVERVIEW:")[1].strip()

            if len(parts) > 1:
                risk_parts = parts[1].split("KEY RISK")
                price_positioning = risk_parts[0].strip()

                # Extract risks
                key_risks = []
                for risk_part in risk_parts[1:]:
                    risk_text = risk_part.split(":", 1)[1].strip() if ":" in risk_part else risk_part.strip()
                    risk_text = risk_text.split("\n")[0].strip()  # Get first line
                    key_risks.append(risk_text)

        # Ensure exactly 3 risks
        key_risks = key_risks[:3]
        while len(key_risks) < 3:
            key_risks.append("Additional market analysis recommended")

        # Build MarketAnalysis
        market_analysis = MarketAnalysis(
            alternatives_overview=alternatives_overview,
            price_positioning=price_positioning,
            key_risks=key_risks
        )

        logger.info(f"[MARKET_ANALYSIS] Completed successfully")
        await progress_tracker.publish(job_id, {
            "agent": "market_analysis",
            "status": "completed",
            "message": "✓ Market analysis complete",
            "detail": f"Analyzed {len(alternatives)} alternatives",
            "progress": 0.35,
            "agentProgress": 1.0
        })

        # Return ONLY the keys this agent updates
        return {
            "market_analysis": market_analysis.dict(),
            "agent_progress": {"market_analysis": 1.0}
        }

    except Exception as e:
        error_msg = f"Market analysis error: {str(e)}"
        logger.error(f"[MARKET_ANALYSIS] {error_msg}", exc_info=True)

        await progress_tracker.publish(job_id, {
            "agent": "market_analysis",
            "status": "error",
            "message": "Market analysis failed",
            "detail": error_msg,
            "progress": 0.15,
            "agentProgress": 0.0
        })

        return {
            "errors": [error_msg]
        }
