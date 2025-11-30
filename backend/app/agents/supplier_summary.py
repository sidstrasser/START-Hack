"""
Supplier Summary Agent - Parallel agent for gathering supplier intelligence.

Responsibilities:
1. Research company profile using Perplexity
2. Use GPT to synthesize and structure the research
3. Generate SupplierSummary schema output
"""

import logging
from langchain_core.runnables import RunnableConfig
from langchain.prompts import ChatPromptTemplate

from app.agents.state import NegotiationState
from app.agents.schemas import SupplierSummary, CompanyOverview
from app.utils.perplexity import perplexity_batch_search
from app.utils.llm import get_llm
from app.config import get_settings
from app.services.progress_tracker import get_progress_tracker

logger = logging.getLogger(__name__)
progress_tracker = get_progress_tracker()


async def supplier_summary_node(state: NegotiationState, config: RunnableConfig) -> NegotiationState:
    """
    Gather supplier intelligence using Perplexity research.

    Flow:
    1. Extract supplier info from parsed_input
    2. Execute Perplexity searches (company profile, LinkedIn, news, contact)
    3. Structure results as SupplierSummary
    4. Update state and progress

    Args:
        state: Current negotiation state
        config: Runnable config

    Returns:
        Updated state with supplier_summary populated
    """
    job_id = state["job_id"]
    settings = get_settings()

    logger.info(f"[SUPPLIER_SUMMARY] Starting for job_id={job_id}")

    # Publish initial progress
    await progress_tracker.publish(job_id, {
        "agent": "supplier_summary",
        "status": "running",
        "message": "Starting supplier research...",
        "detail": "Initializing Perplexity searches",
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
            logger.error(f"[SUPPLIER_SUMMARY] {error_msg}")
            state["errors"].append(error_msg)
            return state

        supplier_name = parsed_input["form_data"]["supplier_name"]
        supplier_contact = parsed_input["form_data"].get("supplier_contact", "")

        logger.info(f"[SUPPLIER_SUMMARY] Researching supplier: {supplier_name}")

        # ========================================================================
        # STEP 1: PERPLEXITY RESEARCH
        # ========================================================================
        await progress_tracker.publish(job_id, {
            "agent": "supplier_summary",
            "status": "running",
            "message": "Researching company profile...",
            "detail": f"Searching for {supplier_name}",
            "progress": 0.17,
            "agentProgress": 0.2
        })

        # Define research queries
        queries = [
            {
                "key": "company_profile",
                "query": f'"{supplier_name}" company overview about us',
                "system_prompt": "You are a business research assistant. Provide comprehensive company information."
            },
            {
                "key": "linkedin",
                "query": f"{supplier_name} site:linkedin.com",
                "system_prompt": "Extract company size, location, and industry from LinkedIn profile."
            },
            {
                "key": "recent_news",
                "query": f'"{supplier_name}" news 2024 OR 2025',
                "system_prompt": "Summarize the most recent and relevant news about this company."
            },
            {
                "key": "contact",
                "query": f"{supplier_name} contact information email phone",
                "system_prompt": "Find official contact information for this company."
            }
        ]

        # Execute all queries in parallel
        search_results = await perplexity_batch_search(
            queries=queries,
            api_key=settings.perplexity_api_key,
            model="sonar-reasoning"
        )

        await progress_tracker.publish(job_id, {
            "agent": "supplier_summary",
            "status": "running",
            "message": "Research complete, synthesizing with GPT...",
            "detail": "Structuring supplier profile",
            "progress": 0.25,
            "agentProgress": 0.5
        })

        # ========================================================================
        # STEP 2: GPT SYNTHESIS
        # ========================================================================

        # Build research context from all Perplexity results
        research_context = ""
        for key, result in search_results.items():
            if result.get("success"):
                research_context += f"\n\n{key.upper()}:\n{result['content'][:800]}"

        # Create synthesis prompt
        synthesis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a business intelligence analyst. Synthesize the research into a structured company profile.

Extract and provide:
1. Company Description: A clear 2-3 sentence overview
2. Company Size: Number of employees or size category (e.g., "50-200 employees", "Enterprise")
3. Location: Headquarters location (city, country)
4. Industry: Primary industry or sector
5. Key Facts: Exactly 5 important facts about the company
6. Recent News: Exactly 3 most recent/relevant news items
7. Contact Info: Official contact information

Be concise and factual. If information is not available, say "Not available" instead of making assumptions."""),
            ("user", """Company Name: {supplier_name}

Research Results:
{research_context}

User-Provided Contact: {supplier_contact}

Provide your analysis in this exact format:

DESCRIPTION: [2-3 sentences]
SIZE: [employee count or category]
LOCATION: [city, country]
INDUSTRY: [primary industry]
FACT 1: [important fact]
FACT 2: [important fact]
FACT 3: [important fact]
FACT 4: [important fact]
FACT 5: [important fact]
NEWS 1: [recent news item]
NEWS 2: [recent news item]
NEWS 3: [recent news item]
CONTACT: [official contact information]""")
        ])

        llm = get_llm(temperature=0.3)
        chain = synthesis_prompt | llm

        response = await chain.ainvoke({
            "supplier_name": supplier_name,
            "research_context": research_context,
            "supplier_contact": supplier_contact or "Not provided"
        })

        # Parse GPT response
        response_text = response.content

        # Extract structured data
        description = "No description available"
        size = None
        location = None
        industry = None
        key_facts = []
        recent_news = []
        contact_info = supplier_contact or "Contact information not available"

        lines = response_text.split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("DESCRIPTION:"):
                description = line.split("DESCRIPTION:", 1)[1].strip()
            elif line.startswith("SIZE:"):
                size_text = line.split("SIZE:", 1)[1].strip()
                size = size_text if size_text.lower() != "not available" else None
            elif line.startswith("LOCATION:"):
                location_text = line.split("LOCATION:", 1)[1].strip()
                location = location_text if location_text.lower() != "not available" else None
            elif line.startswith("INDUSTRY:"):
                industry_text = line.split("INDUSTRY:", 1)[1].strip()
                industry = industry_text if industry_text.lower() != "not available" else None
            elif line.startswith("FACT"):
                fact_text = line.split(":", 1)[1].strip() if ":" in line else line
                if fact_text and fact_text.lower() != "not available":
                    key_facts.append(fact_text)
            elif line.startswith("NEWS"):
                news_text = line.split(":", 1)[1].strip() if ":" in line else line
                if news_text and news_text.lower() != "not available":
                    recent_news.append(news_text)
            elif line.startswith("CONTACT:"):
                contact_text = line.split("CONTACT:", 1)[1].strip()
                if contact_text and contact_text.lower() != "not available":
                    contact_info = contact_text

        # Ensure we have at least some data
        if not key_facts:
            key_facts = [f"Supplier: {supplier_name}"]
        if not recent_news:
            recent_news = ["No recent news available"]

        # Limit to required counts
        key_facts = key_facts[:5]
        while len(key_facts) < 5:
            key_facts.append("Additional information not available")

        recent_news = recent_news[:3]
        while len(recent_news) < 3:
            recent_news.append("No additional news available")

        company_overview = CompanyOverview(
            description=description,
            size=size,
            location=location,
            industry=industry
        )

        # Build SupplierSummary
        supplier_summary = SupplierSummary(
            company_overview=company_overview,
            key_facts=key_facts,
            recent_news=recent_news,
            contact_info=contact_info
        )

        logger.info(f"[SUPPLIER_SUMMARY] Completed successfully")
        await progress_tracker.publish(job_id, {
            "agent": "supplier_summary",
            "status": "completed",
            "message": "✓ Supplier research complete",
            "detail": f"Profile for {supplier_name} ready",
            "progress": 0.35,
            "agentProgress": 1.0
        })

        # Return ONLY the keys this agent updates (for parallel execution)
        return {
            "supplier_summary": supplier_summary.dict(),
            "agent_progress": {"supplier_summary": 1.0}
        }

    except Exception as e:
        error_msg = f"Supplier summary error: {str(e)}"
        logger.error(f"[SUPPLIER_SUMMARY] {error_msg}", exc_info=True)

        await progress_tracker.publish(job_id, {
            "agent": "supplier_summary",
            "status": "error",
            "message": "Supplier research failed",
            "detail": error_msg,
            "progress": 0.15,
            "agentProgress": 0.0
        })

        # Return error update
        return {
            "errors": [error_msg]
        }
