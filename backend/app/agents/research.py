import json
from app.agents.state import NegotiationState
from app.utils.llm import get_llm
from app.services.progress_tracker import progress_tracker
from app.config import get_settings
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field


class CompanyInfo(BaseModel):
    """Company information."""
    name: str = Field(description="Company name")
    size: str = Field(description="Company size (employees/revenue if available)")
    market_position: str = Field(description="Market position description")
    industry: str = Field(description="Industry sector")


class ResearchResults(BaseModel):
    """Structured research results about a company."""
    company_info: CompanyInfo = Field(description="Company information")
    recent_news: list[str] = Field(description="List of recent news items")
    key_people: list[str] = Field(description="Key executives or contacts")
    pricing_history: list[str] = Field(description="Any pricing or contract information found")


async def research_node(state: NegotiationState) -> NegotiationState:
    """
    Research agent: Researches the negotiation partner using web search.

    Uses Tavily to gather information about the company.
    """
    import logging
    logger = logging.getLogger(__name__)

    job_id = state["job_id"]
    logger.info(f"[RESEARCH] Starting for job_id={job_id}")

    await progress_tracker.publish(job_id, {
        "agent": "research",
        "status": "running",
        "message": "Researching negotiation partner...",
        "progress": 0.4
    })
    logger.info(f"[RESEARCH] Progress published")

    state["current_agent"] = "research"

    # Get supplier name
    supplier = state["extracted_data"].get("supplier", "Unknown Company")
    logger.info(f"[RESEARCH] Supplier: {supplier}")

    if supplier == "Unknown Company" or not supplier:
        # Skip research if no supplier identified
        logger.info(f"[RESEARCH] Skipping research - no supplier identified")
        state["research_results"] = {
            "company_info": {"name": "Unknown", "note": "No supplier identified"},
            "recent_news": [],
            "key_people": [],
            "pricing_history": []
        }
        state["progress"] = 0.5

        # Publish progress event for skipped research
        await progress_tracker.publish(job_id, {
            "agent": "research",
            "status": "completed",
            "message": "Skipped research - no supplier information available",
            "progress": 0.5
        })

        return state

    settings = get_settings()

    try:
        logger.info(f"[RESEARCH] Starting web search for {supplier}")
        logger.info(f"[RESEARCH] Tavily API key available: {settings.tavily_api_key is not None}")

        # Initialize Tavily search
        search_tool = TavilySearchResults(
            tavily_api_key=settings.tavily_api_key,  # Use correct parameter name
            max_results=3
        )

        # Perform searches
        company_info_query = f"{supplier} company information business profile"
        news_query = f"{supplier} recent news 2024 2025"
        pricing_query = f"{supplier} pricing strategy customer reviews"

        # Execute searches
        logger.info(f"[RESEARCH] Executing web searches...")
        company_results = await search_tool.ainvoke(company_info_query)
        news_results = await search_tool.ainvoke(news_query)
        pricing_results = await search_tool.ainvoke(pricing_query)
        logger.info(f"[RESEARCH] Web searches completed")

        # Aggregate results with LLM using structured output
        llm = get_llm(temperature=0.3)
        structured_llm = llm.with_structured_output(ResearchResults)

        aggregation_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a business intelligence analyst. Analyze the web search results and create a structured summary."""),
            ("user", """Web search results:

Company Info Search:
{company_results}

Recent News Search:
{news_results}

Pricing/Reviews Search:
{pricing_results}

Analyze and structure this information.""")
        ])

        chain = aggregation_prompt | structured_llm

        logger.info(f"[RESEARCH] Invoking LLM for result aggregation...")
        response: ResearchResults = await chain.ainvoke({
            "company_results": json.dumps(company_results, indent=2),
            "news_results": json.dumps(news_results, indent=2),
            "pricing_results": json.dumps(pricing_results, indent=2)
        })
        logger.info(f"[RESEARCH] LLM aggregation completed")

        # Convert to dict
        research_results = response.model_dump()

        state["research_results"] = research_results
        state["progress"] = 0.5

        logger.info(f"[RESEARCH] Publishing completion event")
        await progress_tracker.publish(job_id, {
            "agent": "research",
            "status": "completed",
            "message": f"Research completed for {supplier}",
            "progress": 0.5
        })
        logger.info(f"[RESEARCH] Completed successfully")

    except Exception as e:
        error_msg = f"Research error: {str(e)}"
        logger.error(f"[RESEARCH] Exception: {error_msg}", exc_info=True)
        state["errors"].append(error_msg)

        # Provide fallback research
        state["research_results"] = {
            "company_info": {"name": supplier, "error": str(e)},
            "recent_news": [],
            "key_people": [],
            "pricing_history": []
        }

        logger.info(f"[RESEARCH] Publishing error event")
        await progress_tracker.publish(job_id, {
            "agent": "research",
            "status": "error",
            "message": f"Research failed: {error_msg}",
            "progress": 0.5
        })

    return state
