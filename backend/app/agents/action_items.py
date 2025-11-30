"""
Action Items Agent - Parallel agent for generating prioritized action items.

Responsibilities:
1. Research best practices using Perplexity
2. Generate exactly 5 action items based on gap analysis using GPT
3. Structure output as ActionItemsList schema
"""

import logging
from langchain_core.runnables import RunnableConfig
from langchain.prompts import ChatPromptTemplate

from app.agents.state import NegotiationState
from app.agents.schemas import ActionItemsList, ActionItem
from app.utils.perplexity import perplexity_search
from app.utils.llm import get_llm
from app.config import get_settings
from app.services.progress_tracker import get_progress_tracker

logger = logging.getLogger(__name__)
progress_tracker = get_progress_tracker()


async def action_items_node(state: NegotiationState, config: RunnableConfig) -> NegotiationState:
    """
    Generate prioritized action items for the negotiation.

    Flow:
    1. Research best practices using Perplexity
    2. Use GPT to generate exactly 5 action items based on gaps
    3. Structure results as ActionItemsList
    4. Update state and progress

    Args:
        state: Current negotiation state
        config: Runnable config

    Returns:
        Updated state with action_items populated
    """
    job_id = state["job_id"]
    settings = get_settings()

    logger.info(f"[ACTION_ITEMS] Starting for job_id={job_id}")

    await progress_tracker.publish(job_id, {
        "agent": "action_items",
        "status": "running",
        "message": "Generating action items...",
        "detail": "Researching best practices",
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
            logger.error(f"[ACTION_ITEMS] {error_msg}")
            state["errors"].append(error_msg)
            return state

        product_type = parsed_input["form_data"]["product_type"]
        supplier_name = parsed_input["form_data"]["supplier_name"]

        # ========================================================================
        # STEP 1: PERPLEXITY RESEARCH
        # ========================================================================
        await progress_tracker.publish(job_id, {
            "agent": "action_items",
            "status": "running",
            "message": "Researching best practices...",
            "detail": f"Looking up {product_type} negotiation checklists",
            "progress": 0.18,
            "agentProgress": 0.2
        })

        search_result = await perplexity_search(
            query=f'contract negotiation action items checklist {product_type} procurement',
            system_prompt="Provide a checklist of important action items for contract negotiations.",
            api_key=settings.perplexity_api_key,
            model="sonar-reasoning"
        )

        research_content = search_result.get("content", "") if search_result.get("success") else ""

        await progress_tracker.publish(job_id, {
            "agent": "action_items",
            "status": "running",
            "message": "Research complete, generating items...",
            "detail": "Creating prioritized action list",
            "progress": 0.25,
            "agentProgress": 0.5
        })

        # ========================================================================
        # STEP 2: GATHER CONTEXT FROM OTHER AGENTS
        # ========================================================================
        # Note: This agent runs after offer_analysis, market_analysis, and outcome_assessment
        # have completed, so their outputs are guaranteed to be available

        # Get analysis results from other agents
        offer_analysis = state.get("offer_analysis", {})
        market_analysis = state.get("market_analysis", {})
        outcome_assessment = state.get("outcome_assessment", {})

        completeness_score = offer_analysis.get("completeness_score", 5)
        completeness_notes = offer_analysis.get("completeness_notes", "")
        hidden_cost_warnings = offer_analysis.get("hidden_cost_warnings", [])
        key_risks = market_analysis.get("key_risks", [])
        target_achievable = outcome_assessment.get("target_achievable", False)

        # ========================================================================
        # STEP 3: GPT GENERATION
        # ========================================================================

        # Create analysis prompt
        analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a procurement action planning expert. Generate EXACTLY 5 most important action items based on the gap analysis.

Each action item should:
- Be specific and actionable
- Address gaps between request and offer
- Be prioritized by impact
- Focus on preparing for negotiation
- Be categorized as one of: PRICE, TERMS, TIMELINE, or SCOPE

The top 2 most impactful actions should be marked as RECOMMENDED.

Format each item exactly as:
[CATEGORY] Action description here

Where CATEGORY is one of: PRICE, TERMS, TIMELINE, SCOPE
Mark the top 2 with (RECOMMENDED) at the end."""),
            ("user", """Supplier: {supplier_name}
Product Type: {product_type}

Offer Completeness: {completeness_score}/10
Gaps: {completeness_notes}

Hidden Cost Warnings:
{hidden_cost_warnings}

Key Risks:
{key_risks}

Target Achievable: {target_achievable}

Best Practices Research:
{research_content}

Generate EXACTLY 5 action items in this format:
1. [CATEGORY] Action description here (RECOMMENDED if top 2)
2. [CATEGORY] Action description here (RECOMMENDED if top 2)
3. [CATEGORY] Action description here
4. [CATEGORY] Action description here
5. [CATEGORY] Action description here

Example:
1. [PRICE] Request detailed breakdown of all costs and fees (RECOMMENDED)
2. [TERMS] Negotiate payment terms from 30 to 60 days net (RECOMMENDED)
3. [TIMELINE] Clarify delivery schedule and milestone dates
4. [SCOPE] Define exact features included in base price
5. [TERMS] Add termination clause with 90-day notice period""")
        ])

        llm = get_llm(temperature=0.5)
        chain = analysis_prompt | llm

        response = await chain.ainvoke({
            "supplier_name": supplier_name,
            "product_type": product_type,
            "completeness_score": completeness_score,
            "completeness_notes": completeness_notes,
            "hidden_cost_warnings": "\n".join(f"- {w}" for w in hidden_cost_warnings) if hidden_cost_warnings else "None",
            "key_risks": "\n".join(f"- {r}" for r in key_risks) if key_risks else "None",
            "target_achievable": "Yes" if target_achievable else "No",
            "research_content": research_content[:800]
        })

        # Parse GPT response
        response_text = response.content

        # Extract numbered items with category and recommended flag
        action_items_list = []
        lines = response_text.split("\n")

        import re
        for line in lines:
            line = line.strip()
            # Look for numbered items (1., 2., etc.)
            if line and len(line) > 2:
                if line[0].isdigit() and (line[1] == '.' or line[1] == ')'):
                    # Extract the content after the number
                    content = line[2:].strip()

                    # Parse format: [CATEGORY] Action description (RECOMMENDED)
                    # Extract category using regex
                    category_match = re.match(r'\[([A-Z]+)\]\s*(.*)', content)
                    if category_match:
                        category_raw = category_match.group(1).lower()
                        remaining = category_match.group(2).strip()

                        # Check if it's recommended
                        is_recommended = "(recommended)" in remaining.lower()

                        # Remove (RECOMMENDED) marker from action text
                        action_text = re.sub(r'\(recommended\)', '', remaining, flags=re.IGNORECASE).strip()

                        # Validate category
                        if category_raw in ["price", "terms", "timeline", "scope"]:
                            action_items_list.append(ActionItem(
                                category=category_raw,
                                action=action_text,
                                recommended=is_recommended
                            ))

        # Ensure exactly 5 items (fallback)
        while len(action_items_list) < 5:
            # Add generic fallback items if parsing failed
            fallback_categories = ["price", "terms", "timeline", "scope", "terms"]
            category = fallback_categories[len(action_items_list)]
            action_items_list.append(ActionItem(
                category=category,
                action=f"Review and address {category} requirements",
                recommended=False
            ))

        # Take only first 5 if we got more
        action_items_list = action_items_list[:5]

        # Ensure exactly 2 items are marked as recommended
        recommended_count = sum(1 for item in action_items_list if item.recommended)
        if recommended_count != 2:
            # Reset all to False
            for item in action_items_list:
                item.recommended = False
            # Mark first 2 as recommended
            action_items_list[0].recommended = True
            action_items_list[1].recommended = True

        # Build ActionItemsList
        action_items = ActionItemsList(items=action_items_list)

        logger.info(f"[ACTION_ITEMS] Completed successfully (generated {len(action_items_list)} items)")
        await progress_tracker.publish(job_id, {
            "agent": "action_items",
            "status": "completed",
            "message": "✓ Action items ready",
            "detail": "5 priority actions identified",
            "progress": 0.35,
            "agentProgress": 1.0
        })

        # Return ONLY the keys this agent updates
        return {
            "action_items": action_items.dict(),
            "agent_progress": {"action_items": 1.0}
        }

    except Exception as e:
        error_msg = f"Action items error: {str(e)}"
        logger.error(f"[ACTION_ITEMS] {error_msg}", exc_info=True)

        await progress_tracker.publish(job_id, {
            "agent": "action_items",
            "status": "error",
            "message": "Action items generation failed",
            "detail": error_msg,
            "progress": 0.15,
            "agentProgress": 0.0
        })

        return {
            "errors": [error_msg]
        }
