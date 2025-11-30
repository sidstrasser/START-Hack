"""
Vector store service - Uses in-memory briefing context for action insights.
"""
import json
import logging
from typing import Dict, Any
from app.config import get_settings
from app.utils.llm import get_llm
from langchain.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)
settings = get_settings()


def get_namespace_for_job(job_id: str) -> str:
    """Derive namespace from job_id."""
    return job_id


def get_briefing_data(vector_db_id: str) -> dict | None:
    """
    Get raw briefing data from in-memory store.
    
    Args:
        vector_db_id: The job_id used to look up the briefing
        
    Returns:
        Briefing dictionary or None
    """
    from app.api.routes import get_briefings_store
    
    briefings_store = get_briefings_store()
    
    logger.info(f"[BRIEFING DEBUG] Looking for vector_db_id={vector_db_id}")
    logger.info(f"[BRIEFING DEBUG] Available keys in store: {list(briefings_store.keys())}")
    
    if vector_db_id not in briefings_store:
        logger.warning(f"[BRIEFING DEBUG] Briefing NOT FOUND for vector_db_id={vector_db_id}")
        return None
    
    briefing_data = briefings_store[vector_db_id]
    briefing = briefing_data.get("briefing", {})
    logger.info(f"[BRIEFING DEBUG] Found briefing with keys: {list(briefing.keys()) if briefing else 'EMPTY'}")
    return briefing


def get_arguments_context(briefing: dict) -> str:
    """
    Build context optimized for generating argument suggestions.
    
    Focuses on:
    - Supplier Summary
    - Leverage Points (from outcome_assessment)
    - Recommended Tactics (from outcome_assessment)
    - Key Risks (from market_analysis)
    """
    if not briefing:
        return "No briefing context available."
    
    context_parts = []
    
    # Supplier Summary - overall context
    if briefing.get("supplier_summary"):
        supplier = briefing["supplier_summary"]
        if supplier.get("company_overview"):
            context_parts.append(f"## SUPPLIER OVERVIEW\n{supplier['company_overview']}")
        if supplier.get("key_facts"):
            facts_text = "\n".join([f"• {fact}" for fact in supplier.get("key_facts", [])])
            context_parts.append(f"## KEY FACTS\n{facts_text}")
    
    # Leverage Points - from outcome_assessment
    if briefing.get("outcome_assessment"):
        outcome = briefing["outcome_assessment"]
        if outcome.get("negotiation_leverage"):
            leverage_text = "\n".join([f"• {lever}" for lever in outcome.get("negotiation_leverage", [])])
            context_parts.append(f"## NEGOTIATION LEVERAGE\n{leverage_text}")
        if outcome.get("recommended_tactics"):
            tactics_text = "\n".join([f"• {tactic}" for tactic in outcome.get("recommended_tactics", [])])
            context_parts.append(f"## RECOMMENDED TACTICS\n{tactics_text}")
    
    # Key Risks - from market_analysis
    if briefing.get("market_analysis"):
        market = briefing["market_analysis"]
        if market.get("key_risks"):
            risks_text = "\n".join([f"• {risk}" for risk in market.get("key_risks", [])])
            context_parts.append(f"## KEY RISKS\n{risks_text}")
    
    # Offer Analysis - price context
    if briefing.get("offer_analysis"):
        offer = briefing["offer_analysis"]
        if offer.get("price_assessment"):
            context_parts.append(f"## PRICE ASSESSMENT\n{offer['price_assessment']}")
        if offer.get("hidden_cost_warnings"):
            warnings_text = "\n".join([f"• {warning}" for warning in offer.get("hidden_cost_warnings", [])])
            context_parts.append(f"## HIDDEN COST WARNINGS\n{warnings_text}")
    
    return "\n\n".join(context_parts) if context_parts else "No briefing context available."


def get_outcome_context(briefing: dict) -> str:
    """
    Build context optimized for outcome analysis.
    
    Focuses on:
    - Outcome Assessment (target_achievable, confidence, partnership_recommendation)
    - Negotiation Leverage
    - Recommended Tactics
    """
    if not briefing:
        return "No briefing context available."
    
    context_parts = []
    
    # Outcome Assessment - main section
    if briefing.get("outcome_assessment"):
        outcome = briefing["outcome_assessment"]
        outcome_text = f"""## OUTCOME ASSESSMENT
- Target Achievable: {'Yes' if outcome.get('target_achievable') else 'No'}
- Confidence Level: {outcome.get('confidence', 'Unknown')}
- Partnership Recommendation: {outcome.get('partnership_recommendation', 'Not specified')}"""
        context_parts.append(outcome_text)
        
        if outcome.get("negotiation_leverage"):
            leverage_text = "\n".join([f"• {lever}" for lever in outcome.get("negotiation_leverage", [])])
            context_parts.append(f"## NEGOTIATION LEVERAGE\n{leverage_text}")
        
        if outcome.get("recommended_tactics"):
            tactics_text = "\n".join([f"• {tactic}" for tactic in outcome.get("recommended_tactics", [])])
            context_parts.append(f"## RECOMMENDED TACTICS\n{tactics_text}")
    
    # Offer Analysis - price context
    if briefing.get("offer_analysis"):
        offer = briefing["offer_analysis"]
        if offer.get("price_assessment"):
            context_parts.append(f"## PRICE ASSESSMENT\n{offer['price_assessment']}")
    
    return "\n\n".join(context_parts) if context_parts else "No briefing context available."


def get_metrics_context(briefing: dict) -> str:
    """
    Build context optimized for metrics calculation.
    
    Focuses on:
    - Outcome assessment (target_achievable, confidence) for outcome scoring
    - Market analysis (key_risks) for risk scoring
    - Offer analysis (price_assessment) for value scoring
    """
    if not briefing:
        return "No briefing context available."
    
    context_parts = []
    
    # Outcome Assessment - for outcome scoring
    if briefing.get("outcome_assessment"):
        outcome = briefing["outcome_assessment"]
        outcome_text = f"""## OUTCOME TARGETS
- Target Achievable: {'Yes' if outcome.get('target_achievable') else 'No'}
- Confidence Level: {outcome.get('confidence', 'Unknown')}
- Partnership Recommendation: {outcome.get('partnership_recommendation', 'Not specified')}"""
        context_parts.append(outcome_text)
    
    # Risk factors - from market_analysis
    if briefing.get("market_analysis"):
        market = briefing["market_analysis"]
        if market.get("key_risks"):
            risks_text = "\n".join([f"• {risk}" for risk in market.get("key_risks", [])])
            context_parts.append(f"## RISK FACTORS\n{risks_text}")
    
    # Offer Analysis - for value scoring
    if briefing.get("offer_analysis"):
        offer = briefing["offer_analysis"]
        offer_parts = []
        if offer.get("price_assessment"):
            offer_parts.append(f"Price Assessment: {offer['price_assessment']}")
        if offer.get("completeness_score"):
            offer_parts.append(f"Completeness Score: {offer['completeness_score']}/10")
        if offer.get("completeness_notes"):
            offer_parts.append(f"Completeness Notes: {offer['completeness_notes']}")
        if offer_parts:
            context_parts.append(f"## OFFER ANALYSIS\n{chr(10).join(offer_parts)}")
    
    return "\n\n".join(context_parts) if context_parts else "No briefing context available."


def get_briefing_context(vector_db_id: str, action_type: str = None) -> str:
    """
    Get briefing context from in-memory store.
    
    Returns the full briefing context for all action types.

    Args:
        vector_db_id: The job_id used to look up the briefing
        action_type: Optional - ignored, always returns full context

    Returns:
        Formatted context string with all briefing sections
    """
    # Get briefing data from in-memory store
    briefing = get_briefing_data(vector_db_id)
    
    if not briefing:
        return "No briefing context available."
    
    # Always return comprehensive context combining all sections
    context_parts = []
    context_parts.append(get_arguments_context(briefing))
    context_parts.append("\n---\n")
    context_parts.append(get_outcome_context(briefing))
    context_parts.append("\n---\n")
    context_parts.append(get_metrics_context(briefing))
    return "\n".join(context_parts)


async def query_briefing_rag(vector_db_id: str, query: str) -> Dict[str, Any]:
    """
    Query the briefing using the in-memory context.
    """
    logger.info(f"query_briefing_rag called for vector_db_id={vector_db_id}")
    
    briefing_context = get_briefing_context(vector_db_id)
    
    if briefing_context == "No briefing context available.":
        return {
            "answer": "No briefing data available to answer your question.",
            "sources": []
        }

    llm = get_llm(temperature=0.3)

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful assistant answering questions about a negotiation briefing.
Use the provided context to answer the question accurately and concisely.
If the context doesn't contain enough information, say so."""),
        ("user", """Briefing Context:
{context}

Question: {question}

Answer:""")
    ])

    chain = prompt | llm

    try:
        response = await chain.ainvoke({
            "context": briefing_context,
            "question": query
        })
        return {
            "answer": response.content,
            "sources": ["briefing"]
        }
    except Exception as e:
        logger.error(f"Error in query_briefing_rag: {str(e)}", exc_info=True)
        return {
            "answer": "Error generating response.",
            "sources": []
        }


# Action-specific system prompts
ACTION_PROMPTS = {
    "arguments": """You are a real-time negotiation coach. Provide 1-3 SHORT argument suggestions.

CRITICAL FORMAT RULES:
• Start each point with a bullet (•)
• Each point must be ONE short sentence (max 10-15 words)
• Use simple, direct language that can be read at a glance
• No explanations, no context, no fluff - just the argument
• Reference specific facts/numbers from the briefing

Example format:
• Point to their 15% market share decline as leverage
• Counter their price claim with competitor's $X offer
• Mention the 90-day payment terms flexibility""",

    "outcome": """You are a real-time negotiation analyst. Provide 1-3 SHORT outcome observations.

CRITICAL FORMAT RULES:
• Start each point with a bullet (•)
• Each point must be ONE short sentence (max 10-15 words)
• Focus on: progress toward goals, risks emerging, opportunities spotted
• No explanations, no context - just the observation
• Be direct and actionable

Example format:
• On track for target price, watch delivery timeline
• Risk: they're pushing for exclusivity clause
• Opportunity: they mentioned budget flexibility"""
}


async def query_for_action_insights(
    vector_db_id: str,
    conversation_messages: list,
    action_type: str,
    goals: str | None = None
) -> dict:
    """
    Query for action-specific insights using briefing context.
    
    Args:
        vector_db_id: Job ID to look up briefing
        conversation_messages: List of conversation messages
        action_type: Either "arguments" or "outcome"
        goals: Optional goals string
        
    Returns:
        Dictionary with insights
    """
    logger.info(f"query_for_action_insights called for vector_db_id={vector_db_id}, action_type={action_type}")
    
    # Get action-specific briefing context
    briefing_context = get_briefing_context(vector_db_id, action_type=action_type)
    
    # Build conversation context
    conversation_text = "\n".join([
        f"{'User' if msg.get('speaker_id') == 'user' else 'Other'}: {msg.get('text', '')}"
        for msg in conversation_messages[-10:]
    ]) if conversation_messages else "No conversation yet."
    
    # Get system prompt
    system_prompt = ACTION_PROMPTS.get(action_type, ACTION_PROMPTS["arguments"])
    goals_section = f"User's Goals:\n{goals}" if goals else ""
    
    llm = get_llm(temperature=0.4)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", """Briefing Context:
{briefing_context}

{goals_section}

Current Conversation:
{conversation}

Provide your insights:""")
    ])
    
    chain = prompt | llm
    
    try:
        response = await chain.ainvoke({
            "briefing_context": briefing_context,
            "goals_section": goals_section,
            "conversation": conversation_text
        })
        return {
            "insights": response.content,
            "action_type": action_type
        }
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}", exc_info=True)
        return {
            "insights": "Unable to generate insights at this time.",
            "action_type": action_type
        }


async def stream_action_insights(
    vector_db_id: str,
    conversation_messages: list,
    action_type: str,
    goals: str | None = None
):
    """
    Stream action-specific insights using briefing context.
    
    Yields chunks of the response as they are generated.
    """
    logger.info(f"stream_action_insights called for vector_db_id={vector_db_id}, action_type={action_type}")
    
    # Get action-specific briefing context
    briefing_context = get_briefing_context(vector_db_id, action_type=action_type)
    
    # Build conversation context
    conversation_text = "\n".join([
        f"{'User' if msg.get('speaker_id') == 'user' else 'Other'}: {msg.get('text', '')}"
        for msg in conversation_messages[-10:]
    ]) if conversation_messages else "No conversation yet."
    
    # Get system prompt
    system_prompt = ACTION_PROMPTS.get(action_type, ACTION_PROMPTS["arguments"])
    goals_section = f"User's Goals:\n{goals}" if goals else ""
    
    # Use streaming LLM
    from langchain_openai import ChatOpenAI
    
    streaming_llm = ChatOpenAI(
        api_key=settings.openai_api_key,
        model="gpt-4o",
        temperature=0.4,
        streaming=True
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", """Briefing Context:
{briefing_context}

{goals_section}

Current Conversation:
{conversation}

Provide your insights:""")
    ])
    
    chain = prompt | streaming_llm
    
    try:
        async for chunk in chain.astream({
            "briefing_context": briefing_context,
            "goals_section": goals_section,
            "conversation": conversation_text
        }):
            if hasattr(chunk, 'content') and chunk.content:
                yield chunk.content
    except Exception as e:
        logger.error(f"Error streaming insights: {str(e)}", exc_info=True)
        yield "Unable to generate insights at this time."


# Metrics analysis prompt
METRICS_PROMPT = """You are a real-time negotiation metrics analyzer. Based on the briefing context and conversation, evaluate the current negotiation state.

Return ONLY a JSON object with exactly these three metrics (0-100 scale):
- value: How much value is the user capturing? (0=poor deal, 100=excellent deal based on target position)
- risk: Current risk level for the user (0=very safe, 100=very risky based on briefing risks)
- outcome: Likelihood of achieving stated goals (0=unlikely, 100=very likely based on strategy)

Consider from the briefing:
- Target position vs current discussion points
- Identified risks and whether they're being mitigated
- Leverage points being used or missed
- Progress toward opening/target/walkaway positions

Respond with ONLY valid JSON, no other text:
{{"value": <number>, "risk": <number>, "outcome": <number>}}"""


async def analyze_conversation_metrics(
    vector_db_id: str,
    conversation_messages: list,
    goals: str | None = None
) -> dict:
    """
    Analyze conversation to produce real-time metrics using briefing context.
    
    Args:
        vector_db_id: Job ID to look up briefing
        conversation_messages: List of conversation messages
        goals: Optional goals string
        
    Returns:
        Dictionary with value, risk, outcome (0-100 each)
    """
    logger.info(f"[METRICS DEBUG] Called with vector_db_id={vector_db_id}")
    logger.info(f"[METRICS DEBUG] conversation_messages count: {len(conversation_messages) if conversation_messages else 0}")
    logger.info(f"[METRICS DEBUG] goals: {goals[:100] if goals else 'None'}...")
    
    # Get metrics-specific briefing context
    briefing_context = get_briefing_context(vector_db_id, action_type="metrics")
    logger.info(f"[METRICS DEBUG] briefing_context length: {len(briefing_context)}")
    logger.info(f"[METRICS DEBUG] briefing_context preview: {briefing_context[:200]}...")
    
    # Build conversation context
    conversation_text = "\n".join([
        f"{'User' if msg.get('speaker_id') == 'user' else 'Other'}: {msg.get('text', '')}"
        for msg in conversation_messages[-15:]
    ]) if conversation_messages else ""
    
    logger.info(f"[METRICS DEBUG] conversation_text length: {len(conversation_text)}")
    logger.info(f"[METRICS DEBUG] conversation_text: {conversation_text[:300]}...")
    
    # If no conversation, return neutral metrics
    if not conversation_text.strip():
        logger.info("[METRICS DEBUG] No conversation text - returning neutral 50s")
        return {"value": 50, "risk": 50, "outcome": 50}
    
    goals_section = f"User's Goals:\n{goals}" if goals else ""
    
    llm = get_llm(temperature=0.2)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", METRICS_PROMPT),
        ("user", """Briefing Context:
{briefing_context}

{goals_section}

Current Conversation:
{conversation}

Analyze and return metrics JSON:""")
    ])
    
    chain = prompt | llm
    
    try:
        logger.info("[METRICS DEBUG] Calling LLM...")
        response = await chain.ainvoke({
            "briefing_context": briefing_context,
            "goals_section": goals_section,
            "conversation": conversation_text
        })
        
        # Parse JSON response
        import re
        content = response.content.strip()
        logger.info(f"[METRICS DEBUG] LLM response: {content}")
        
        # Try to extract JSON from response
        json_match = re.search(r'\{[^}]+\}', content)
        if json_match:
            metrics = json.loads(json_match.group())
            logger.info(f"[METRICS DEBUG] Parsed metrics: {metrics}")
            
            # Validate and clamp values
            result = {
                "value": max(0, min(100, int(metrics.get("value", 50)))),
                "risk": max(0, min(100, int(metrics.get("risk", 50)))),
                "outcome": max(0, min(100, int(metrics.get("outcome", 50))))
            }
            logger.info(f"[METRICS DEBUG] Final result: {result}")
            return result
        else:
            logger.warning(f"[METRICS DEBUG] Could not parse metrics JSON: {content}")
            return {"value": 50, "risk": 50, "outcome": 50}
            
    except Exception as e:
        logger.error(f"[METRICS DEBUG] Error analyzing metrics: {str(e)}", exc_info=True)
        return {"value": 50, "risk": 50, "outcome": 50}


# Action items analysis prompt
ACTION_ITEMS_PROMPT = """You are analyzing a negotiation conversation to determine which action items have been completed.

Given the conversation transcript and a list of action items, determine which items have been accomplished based on what was discussed.

Action Items to evaluate:
{action_items}

Rules:
- Only mark an item as completed if there's clear evidence in the conversation
- Be conservative - if unsure, don't mark as completed
- Look for explicit mentions, discussions, or clear indications that the action was taken

Return ONLY a JSON array of the IDs of completed items, like: [1, 3, 5]
If no items are completed, return: []"""


async def analyze_action_items_completion(
    vector_db_id: str,
    conversation_messages: list,
    action_items: list,
    already_completed_ids: list
) -> dict:
    """
    Analyze conversation to determine which action items have been completed.
    
    Args:
        vector_db_id: Job ID to look up briefing
        conversation_messages: List of conversation messages
        action_items: List of action items with id, text, completed
        already_completed_ids: IDs that are already completed (preserve these)
        
    Returns:
        Dictionary with completedIds and newlyCompletedIds
    """
    logger.info(f"[ACTION ITEMS] Analyzing {len(action_items)} items against {len(conversation_messages)} messages")
    
    # Build conversation context
    conversation_text = "\n".join([
        f"{'User' if msg.get('speaker_id') == 'user' else 'Other'}: {msg.get('text', '')}"
        for msg in conversation_messages[-20:]
    ]) if conversation_messages else ""
    
    if not conversation_text.strip():
        return {
            "completedIds": already_completed_ids,
            "newlyCompletedIds": []
        }
    
    # Format action items for the prompt
    items_text = "\n".join([
        f"- ID {item['id']}: {item['text']}"
        for item in action_items
    ])
    
    llm = get_llm(temperature=0.1)  # Low temperature for consistent results
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", ACTION_ITEMS_PROMPT),
        ("user", """Conversation:
{conversation}

Which action items (by ID) have been completed? Return ONLY a JSON array:""")
    ])
    
    chain = prompt | llm
    
    try:
        response = await chain.ainvoke({
            "action_items": items_text,
            "conversation": conversation_text
        })
        
        content = response.content.strip()
        logger.info(f"[ACTION ITEMS] LLM response: {content}")
        
        # Parse JSON array from response
        import re
        json_match = re.search(r'\[[\d,\s]*\]', content)
        if json_match:
            ai_completed_ids = json.loads(json_match.group())
            logger.info(f"[ACTION ITEMS] AI detected completed: {ai_completed_ids}")
        else:
            ai_completed_ids = []
            logger.warning(f"[ACTION ITEMS] Could not parse response: {content}")
        
        # Combine with already completed (preserve them)
        all_completed = set(already_completed_ids) | set(ai_completed_ids)
        
        # Find newly completed (in AI list but not in already completed)
        newly_completed = [id for id in ai_completed_ids if id not in already_completed_ids]
        
        result = {
            "completedIds": list(all_completed),
            "newlyCompletedIds": newly_completed
        }
        logger.info(f"[ACTION ITEMS] Result: {result}")
        return result
        
    except Exception as e:
        logger.error(f"[ACTION ITEMS] Error: {str(e)}", exc_info=True)
        return {
            "completedIds": already_completed_ids,
            "newlyCompletedIds": []
        }


# ============================================================
# Call Summary Generation
# ============================================================

SUMMARY_PROMPT = """You are analyzing a completed negotiation call. Based on the conversation transcript, briefing context, and goals, provide:

1. A concise summary (2-3 paragraphs) of what happened in the call, key points discussed, agreements reached, and overall outcome.

2. A list of 3-5 recommended next action items to follow up on after this call.

BRIEFING CONTEXT:
{briefing_context}

NEGOTIATION GOALS:
{goals}

COMPLETED ACTION ITEMS FROM THE CALL:
{completed_actions}

CONVERSATION TRANSCRIPT:
{conversation}

CALL DURATION: {duration} minutes

Respond in the following JSON format ONLY:
{{
  "summary": "Your summary text here...",
  "nextActionItems": ["Action 1", "Action 2", "Action 3"]
}}"""


async def generate_call_summary_and_next_actions(
    vector_db_id: str,
    transcripts: list,
    action_points: list,
    goals: str = None,
    call_duration: int = 0
) -> dict:
    """
    Generate a summary and next action items for a completed call.
    """
    logger.info(f"[SUMMARY] Generating summary for {vector_db_id}")
    
    try:
        # Get briefing context
        briefing_context = get_briefing_context(vector_db_id, action_type="full")
        
        # Format conversation
        conversation_text = "\n".join([
            f"{t.get('speaker_id', 'Speaker')}: {t.get('text', '')}"
            for t in transcripts
        ]) if transcripts else "No conversation recorded."
        
        # Format completed actions
        completed_actions = "\n".join([
            f"✓ {ap.get('text', '')}" 
            for ap in action_points 
            if ap.get('completed', False)
        ]) or "None completed during the call."
        
        # Calculate duration in minutes
        duration_minutes = max(1, call_duration // 60)
        
        # Goals
        goals_text = goals or "No specific goals defined."
        
        # Create prompt
        prompt = ChatPromptTemplate.from_template(SUMMARY_PROMPT)
        chain = prompt | get_llm()
        
        response = await chain.ainvoke({
            "briefing_context": briefing_context,
            "goals": goals_text,
            "completed_actions": completed_actions,
            "conversation": conversation_text,
            "duration": duration_minutes
        })
        
        content = response.content.strip()
        logger.info(f"[SUMMARY] LLM response: {content[:500]}...")
        
        # Parse JSON response
        import re
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            result = json.loads(json_match.group())
            return {
                "summary": result.get("summary", "Unable to generate summary."),
                "nextActionItems": result.get("nextActionItems", [])
            }
        else:
            logger.warning(f"[SUMMARY] Could not parse JSON from response")
            return {
                "summary": content,
                "nextActionItems": []
            }
            
    except Exception as e:
        logger.error(f"[SUMMARY] Error: {str(e)}", exc_info=True)
        return {
            "summary": "Unable to generate summary due to an error.",
            "nextActionItems": ["Review the call recording", "Follow up with the other party"]
        }


# ============================================================
# Streaming Call Summary Generation
# ============================================================

STREAMING_SUMMARY_PROMPT = """You are analyzing a completed negotiation call. Based on the conversation transcript, briefing context, and goals, provide:

1. A concise summary (2-3 paragraphs) of what happened in the call, key points discussed, agreements reached, and overall outcome.

2. After the summary, provide exactly 3 next action items. Each action item must be MAX 5 WORDS.

BRIEFING CONTEXT:
{briefing_context}

NEGOTIATION GOALS:
{goals}

COMPLETED ACTION ITEMS FROM THE CALL:
{completed_actions}

CONVERSATION TRANSCRIPT:
{conversation}

CALL DURATION: {duration} minutes

FORMAT INSTRUCTIONS:
- First write the summary paragraphs
- Then write "###TODOS###" on its own line
- Then write exactly 3 action items as bullet points (- item)
- Each action item: MAX 5 WORDS

Example:
The negotiation covered pricing and delivery. Both parties showed willingness to compromise.

Key agreements were reached on payments. The supplier showed flexibility on timelines.

###TODOS###
- Send revised pricing proposal
- Schedule follow-up call
- Review contract terms"""


async def stream_call_summary_and_next_actions(
    vector_db_id: str,
    transcripts: list,
    action_points: list,
    goals: str = None,
    call_duration: int = 0
):
    """
    Stream a summary and next action items for a completed call.
    
    Yields chunks with markers:
    - [SUMMARY] prefix for summary content
    - [ACTION] prefix for each action item
    - [DONE] when complete
    """
    logger.info(f"[STREAM SUMMARY] Starting stream for {vector_db_id}")
    
    try:
        # Get briefing context
        briefing_context = get_briefing_context(vector_db_id, action_type="full")
        
        # Check if briefing exists
        if briefing_context == "No briefing context available.":
            logger.warning(f"[STREAM SUMMARY] No briefing found for {vector_db_id}, using minimal context")
            yield "[SUMMARY]Unable to load briefing data. Generating summary from conversation only.\n\n"
        
        # Format conversation
        conversation_text = "\n".join([
            f"{t.get('speaker_id', 'Speaker')}: {t.get('text', '')}"
            for t in transcripts
        ]) if transcripts else "No conversation recorded."
        
        # Format completed actions
        completed_actions = "\n".join([
            f"✓ {ap.get('text', '')}" 
            for ap in action_points 
            if ap.get('completed', False)
        ]) or "None completed during the call."
        
        # Calculate duration in minutes
        duration_minutes = max(1, call_duration // 60)
        
        # Goals
        goals_text = goals or "No specific goals defined."
        
        # Use streaming LLM
        from langchain_openai import ChatOpenAI
        
        streaming_llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            model="gpt-4o",
            temperature=0.3,
            streaming=True
        )
        
        prompt = ChatPromptTemplate.from_template(STREAMING_SUMMARY_PROMPT)
        chain = prompt | streaming_llm
        
        logger.info(f"[STREAM SUMMARY] Starting LLM stream...")
        
        # Track state for parsing
        full_response = ""
        in_actions_section = False
        summary_yielded_length = 0
        chunk_count = 0
        
        async for chunk in chain.astream({
            "briefing_context": briefing_context,
            "goals": goals_text,
            "completed_actions": completed_actions,
            "conversation": conversation_text,
            "duration": duration_minutes
        }):
            chunk_count += 1
            content = chunk.content
            if chunk_count == 1:
                logger.info(f"[STREAM SUMMARY] Received first chunk from LLM")
            if not content:
                continue
            
            full_response += content
            
            # Check if we've hit the actions section (using ###TODOS### marker)
            if not in_actions_section:
                if "###TODOS###" in full_response:
                    in_actions_section = True
                    # Yield any remaining summary content before the marker
                    marker_idx = full_response.find("###TODOS###")
                    remaining_summary = full_response[summary_yielded_length:marker_idx].strip()
                    if remaining_summary:
                        yield f"[SUMMARY]{remaining_summary}"
                    summary_yielded_length = marker_idx
                else:
                    # Still in summary section - yield new content
                    new_content = full_response[summary_yielded_length:]
                    # Don't yield if it might contain start of the marker (###)
                    if new_content and "###" not in new_content and not new_content.rstrip().endswith("#"):
                        yield f"[SUMMARY]{new_content}"
                        summary_yielded_length = len(full_response)
        
        logger.info(f"[STREAM SUMMARY] LLM stream completed. Total chunks: {chunk_count}, response length: {len(full_response)}")
        
        # Now parse the complete response for action items
        if "###TODOS###" in full_response:
            actions_idx = full_response.find("###TODOS###")
            actions_section = full_response[actions_idx + len("###TODOS###"):]
            
            # Parse action items - look for bullet points or numbered items
            seen_actions = set()
            action_count = 0
            for line in actions_section.split('\n'):
                line = line.strip()
                action_text = None
                
                if line.startswith("- "):
                    action_text = line[2:].strip()
                elif line.startswith("• "):
                    action_text = line[2:].strip()
                elif line and line[0].isdigit() and ". " in line[:4]:
                    # Numbered item like "1. Action text"
                    action_text = line.split(". ", 1)[-1].strip()
                
                if action_text and action_text not in seen_actions and len(action_text) > 3:
                    seen_actions.add(action_text)
                    yield f"[ACTION]{action_text}"
                    action_count += 1
                    if action_count >= 3:  # Max 3 actions
                        break
        
        yield "[DONE]"
        logger.info(f"[STREAM SUMMARY] Completed stream for {vector_db_id}")
        
    except Exception as e:
        logger.error(f"[STREAM SUMMARY] Error: {str(e)}", exc_info=True)
        yield f"[ERROR]{str(e)}"
