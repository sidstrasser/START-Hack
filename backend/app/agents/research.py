import json
from app.agents.state import NegotiationState
from app.utils.llm import get_llm
from app.services.progress_tracker import progress_tracker
from app.config import get_settings
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.prompts import ChatPromptTemplate


async def research_node(state: NegotiationState) -> NegotiationState:
    """
    Research agent: Researches the negotiation partner using web search.

    Uses Tavily to gather information about the company.
    """
    job_id = state["job_id"]

    await progress_tracker.publish(job_id, {
        "agent": "research",
        "status": "running",
        "message": "Researching negotiation partner...",
        "progress": 0.4
    })

    state["current_agent"] = "research"

    # Get supplier name
    supplier = state["extracted_data"].get("supplier", "Unknown Company")

    if supplier == "Unknown Company" or not supplier:
        # Skip research if no supplier identified
        state["research_results"] = {
            "company_info": {"name": "Unknown", "note": "No supplier identified"},
            "recent_news": [],
            "key_people": [],
            "pricing_history": []
        }
        state["progress"] = 0.5
        return state

    settings = get_settings()

    try:
        # Initialize Tavily search
        search_tool = TavilySearchResults(
            api_key=settings.tavily_api_key,
            max_results=3
        )

        # Perform searches
        company_info_query = f"{supplier} company information business profile"
        news_query = f"{supplier} recent news 2024 2025"
        pricing_query = f"{supplier} pricing strategy customer reviews"

        # Execute searches
        company_results = await search_tool.ainvoke(company_info_query)
        news_results = await search_tool.ainvoke(news_query)
        pricing_results = await search_tool.ainvoke(pricing_query)

        # Aggregate results with LLM
        llm = get_llm(temperature=0.3)

        aggregation_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a business intelligence analyst. Analyze the web search results and create a structured summary.

Return a JSON object with:
{
  "company_info": {
    "name": "Company name",
    "size": "Company size (employees/revenue if available)",
    "market_position": "Market position description",
    "industry": "Industry sector"
  },
  "recent_news": ["List of recent news items"],
  "key_people": ["Key executives or contacts"],
  "pricing_history": ["Any pricing or contract information found"]
}"""),
            ("user", """Web search results:

Company Info Search:
{company_results}

Recent News Search:
{news_results}

Pricing/Reviews Search:
{pricing_results}

Analyze and structure this information as JSON.""")
        ])

        chain = aggregation_prompt | llm

        response = await chain.ainvoke({
            "company_results": json.dumps(company_results, indent=2),
            "news_results": json.dumps(news_results, indent=2),
            "pricing_results": json.dumps(pricing_results, indent=2)
        })

        # Parse result
        try:
            research_results = json.loads(response.content)
        except json.JSONDecodeError:
            research_results = {
                "company_info": {"name": supplier, "size": "Unknown", "market_position": "Unknown"},
                "recent_news": [],
                "key_people": [],
                "pricing_history": []
            }

        state["research_results"] = research_results
        state["progress"] = 0.5

        await progress_tracker.publish(job_id, {
            "agent": "research",
            "status": "completed",
            "message": f"Research completed for {supplier}",
            "progress": 0.5
        })

    except Exception as e:
        error_msg = f"Research error: {str(e)}"
        state["errors"].append(error_msg)

        # Provide fallback research
        state["research_results"] = {
            "company_info": {"name": supplier, "error": str(e)},
            "recent_news": [],
            "key_people": [],
            "pricing_history": []
        }

        await progress_tracker.publish(job_id, {
            "agent": "research",
            "status": "completed",
            "message": f"Research completed with limited data: {error_msg}",
            "progress": 0.5
        })

    return state
