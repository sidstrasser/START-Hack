"""
Research Agent - Second node in the negotiation briefing pipeline.

Responsibilities:
1. Web search for company information (size, location, industry)
2. Web search for recent news (2024-2025)
3. Extract key facts from search results
4. Structure into ResearchOutput format

Note: Does NOT search for key people or pricing (removed from new spec)
"""

import json
import logging
from langchain_core.runnables import RunnableConfig
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.prompts import ChatPromptTemplate

from app.agents.state import NegotiationState
from app.agents.schemas import ResearchOutput, CompanyOverview
from app.utils.llm import get_llm
from app.services.progress_tracker import get_progress_tracker
from app.config import get_settings

logger = logging.getLogger(__name__)
progress_tracker = get_progress_tracker()


async def research_node(state: NegotiationState, config: RunnableConfig) -> NegotiationState:
    """
    Research supplier using web search.

    Flow:
    1. Extract supplier name from parsed input
    2. Perform 2 web searches (company info, recent news)
    3. Aggregate results into ResearchOutput using LLM
    4. Update state and progress

    Args:
        state: Current negotiation state
        config: Runnable config

    Returns:
        Updated state with research_output populated
    """
    job_id = state["job_id"]
    logger.info(f"[RESEARCH] Starting research node for job_id={job_id}")

    await progress_tracker.publish(job_id, {
        "agent": "research",
        "status": "running",
        "message": "Researching supplier...",
        "progress": 0.4
    })

    state["current_agent"] = "research"

    # ========================================================================
    # STEP 1: EXTRACT SUPPLIER NAME
    # ========================================================================
    supplier_name = state["parsed_input"]["form_data"]["supplier_name"]
    supplier_contact = state["parsed_input"]["form_data"].get("supplier_contact")

    logger.info(f"[RESEARCH] Supplier: {supplier_name}")

    if not supplier_name or supplier_name.lower() == "unknown":
        # Skip research if no valid supplier
        logger.info(f"[RESEARCH] Skipping research - no valid supplier name")
        state["research_output"] = {
            "company_overview": {
                "description": "No supplier information available",
                "size": None,
                "location": None,
                "industry": None
            },
            "key_facts": [],
            "recent_news": [],
            "contact_info": supplier_contact
        }
        state["progress"] = 0.6

        await progress_tracker.publish(job_id, {
            "agent": "research",
            "status": "completed",
            "message": "Skipped research - no supplier information",
            "progress": 0.6
        })

        return state

    # ========================================================================
    # STEP 2: PERFORM WEB SEARCHES
    # ========================================================================
    settings = get_settings()

    try:
        logger.info(f"[RESEARCH] Starting web searches for {supplier_name}")

        # Initialize Tavily search
        search_tool = TavilySearchResults(
            tavily_api_key=settings.tavily_api_key,
            max_results=3
        )

        # Define search queries (removed key_people and pricing searches)
        company_info_query = f"{supplier_name} company information business profile size location"
        news_query = f"{supplier_name} recent news 2024 2025"

        # Execute searches
        logger.info(f"[RESEARCH] Executing company info search...")
        company_results = await search_tool.ainvoke(company_info_query)

        logger.info(f"[RESEARCH] Executing news search...")
        news_results = await search_tool.ainvoke(news_query)

        logger.info(f"[RESEARCH] Web searches completed")

        # ========================================================================
        # STEP 3: AGGREGATE RESULTS WITH LLM
        # ========================================================================
        llm = get_llm(temperature=0.3)
        structured_llm = llm.with_structured_output(ResearchOutput)

        aggregation_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a business intelligence analyst. Analyze the web search results and create a structured summary.

Extract:
1. Company overview (description, size, location, industry)
2. Key facts (max 5 bullet points)
3. Recent news (max 3 items)

Be concise and factual. If information is not available, leave fields as null or empty."""),
            ("user", """Web search results for {supplier_name}:

Company Info Search:
{company_results}

Recent News Search:
{news_results}

Create a structured summary of this company.""")
        ])

        chain = aggregation_prompt | structured_llm

        logger.info(f"[RESEARCH] Invoking LLM for result aggregation...")
        response: ResearchOutput = await chain.ainvoke({
            "supplier_name": supplier_name,
            "company_results": json.dumps(company_results, indent=2),
            "news_results": json.dumps(news_results, indent=2)
        })
        logger.info(f"[RESEARCH] LLM aggregation completed")

        # Add contact info from form
        research_dict = response.model_dump()
        research_dict["contact_info"] = supplier_contact

        # Update state
        state["research_output"] = research_dict
        state["progress"] = 0.6

        logger.info(f"[RESEARCH] Research completed successfully")
        await progress_tracker.publish(job_id, {
            "agent": "research",
            "status": "completed",
            "message": f"Research completed for {supplier_name}",
            "progress": 0.6
        })

    except Exception as e:
        error_msg = f"Research error: {str(e)}"
        logger.error(f"[RESEARCH] Exception: {error_msg}", exc_info=True)

        # Don't add to errors list - provide fallback instead
        logger.warning(f"[RESEARCH] Using fallback research data")

        state["research_output"] = {
            "company_overview": {
                "description": f"{supplier_name} - research unavailable",
                "size": None,
                "location": None,
                "industry": None
            },
            "key_facts": [],
            "recent_news": [],
            "contact_info": supplier_contact
        }
        state["progress"] = 0.6

        await progress_tracker.publish(job_id, {
            "agent": "research",
            "status": "completed",
            "message": f"Research completed with limited data for {supplier_name}",
            "progress": 0.6
        })

    return state
