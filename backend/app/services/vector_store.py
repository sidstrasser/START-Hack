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
    
    if vector_db_id not in briefings_store:
        logger.warning(f"Briefing not found for vector_db_id={vector_db_id}")
        return None
    
    briefing_data = briefings_store[vector_db_id]
    return briefing_data.get("briefing", {})


def get_arguments_context(briefing: dict) -> str:
    """
    Build context optimized for generating argument suggestions.
    
    Focuses on:
    - Executive Summary
    - Leverage Points
    - Potential Objections
    - Risk Assessment
    """
    if not briefing:
        return "No briefing context available."
    
    context_parts = []
    
    # Executive Summary - overall context and goals
    if briefing.get("executive_summary"):
        context_parts.append(f"## EXECUTIVE SUMMARY\n{briefing['executive_summary']}")
    
    # Leverage Points - the most actionable for arguments
    if briefing.get("leverage_points"):
        leverages = briefing["leverage_points"]
        leverage_text = "\n".join([f"• {lp.get('lever', '')}\n  How to use: {lp.get('how_to_use', '')}" for lp in leverages])
        context_parts.append(f"## LEVERAGE POINTS\n{leverage_text}")
    
    # Potential Objections & Counters
    if briefing.get("potential_objections"):
        objections = briefing["potential_objections"]
        objections_text = "\n".join([f"• If they say: \"{obj.get('objection', '')}\"\n  You respond: \"{obj.get('counter', '')}\"" for obj in objections])
        context_parts.append(f"## POTENTIAL OBJECTIONS & COUNTERS\n{objections_text}")
    
    # Risk Assessment
    if briefing.get("risk_assessment"):
        risks = briefing["risk_assessment"]
        if risks.get("risks"):
            context_parts.append(f"## RISK ASSESSMENT\n{chr(10).join(['• ' + r for r in risks['risks']])}")
        if risks.get("mitigation"):
            context_parts.append(f"Mitigation Strategies:\n{chr(10).join(['• ' + m for m in risks['mitigation']])}")
    
    return "\n\n".join(context_parts) if context_parts else "No briefing context available."


def get_outcome_context(briefing: dict) -> str:
    """
    Build context optimized for outcome analysis.
    
    Focuses on:
    - Success Metrics
    - Negotiation Strategy
    """
    if not briefing:
        return "No briefing context available."
    
    context_parts = []
    
    # Success Metrics - what defines a good outcome
    if briefing.get("success_metrics"):
        metrics = briefing["success_metrics"]
        metrics_text = "\n".join([f"• {m}" for m in metrics])
        context_parts.append(f"## SUCCESS METRICS\n{metrics_text}")
    
    # Negotiation Strategy - targets and positions
    if briefing.get("negotiation_strategy"):
        strategy = briefing["negotiation_strategy"]
        context_parts.append(f"""## NEGOTIATION STRATEGY
- Opening Position: {strategy.get('opening_position', 'Not specified')}
- Target Position: {strategy.get('target_position', 'Not specified')}
- Walkaway Point: {strategy.get('walkaway_point', 'Not specified')}""")
        if strategy.get("recommended_sequence"):
            sequence = "\n".join([f"  {i+1}. {step}" for i, step in enumerate(strategy['recommended_sequence'])])
            context_parts.append(f"- Recommended Sequence:\n{sequence}")
    
    return "\n\n".join(context_parts) if context_parts else "No briefing context available."


def get_metrics_context(briefing: dict) -> str:
    """
    Build context optimized for metrics calculation.
    
    Focuses on:
    - Negotiation strategy (for value/outcome scoring)
    - Risk assessment (for risk scoring)
    - Success metrics
    - Offer analysis
    """
    if not briefing:
        return "No briefing context available."
    
    context_parts = []
    
    # Negotiation targets for value scoring
    if briefing.get("negotiation_strategy"):
        strategy = briefing["negotiation_strategy"]
        context_parts.append(f"""## VALUE BENCHMARKS
- Opening (Best case): {strategy.get('opening_position', 'Not specified')}
- Target (Good outcome): {strategy.get('target_position', 'Not specified')}
- Walkaway (Minimum acceptable): {strategy.get('walkaway_point', 'Not specified')}""")
    
    # Risk factors
    if briefing.get("risk_assessment"):
        risks = briefing["risk_assessment"]
        if risks.get("risks"):
            context_parts.append(f"## RISK FACTORS\n{chr(10).join(['• ' + r for r in risks['risks']])}")
    
    # Success metrics
    if briefing.get("success_metrics"):
        metrics = briefing["success_metrics"]
        context_parts.append(f"## SUCCESS CRITERIA\n{chr(10).join(['• ' + m for m in metrics])}")
    
    # Offer details
    if briefing.get("offer_analysis"):
        offer = briefing["offer_analysis"]
        context_parts.append(f"## OFFER\n- Value: {offer.get('total_value', 'Unknown')}")
    
    return "\n\n".join(context_parts) if context_parts else "No briefing context available."


def get_briefing_context(vector_db_id: str, action_type: str = None) -> str:
    """
    Get briefing context from in-memory store, optimized for the action type.

    Args:
        vector_db_id: The job_id used to look up the briefing
        action_type: Optional - "arguments", "outcome", or "metrics"

    Returns:
        Formatted briefing context string optimized for the action
    """
    briefing = get_briefing_data(vector_db_id)
    
    if not briefing:
        return "No briefing context available."
    
    # Return action-specific context
    if action_type == "arguments":
        return get_arguments_context(briefing)
    elif action_type == "outcome":
        return get_outcome_context(briefing)
    elif action_type == "metrics":
        return get_metrics_context(briefing)
    else:
        # Default: return full context (for RAG queries)
        return get_full_context(briefing)


def get_full_context(briefing: dict) -> str:
    """Build full briefing context (used for general RAG queries)."""
    if not briefing:
        return "No briefing context available."
    
    context_parts = []
    
    if briefing.get("executive_summary"):
        context_parts.append(f"## Executive Summary\n{briefing['executive_summary']}")
    
    if briefing.get("supplier_overview"):
        supplier = briefing["supplier_overview"]
        context_parts.append(f"## Supplier Overview\n- Name: {supplier.get('name', 'Unknown')}\n- Background: {supplier.get('background', '')}")
        if supplier.get("strengths"):
            context_parts.append(f"- Strengths: {', '.join(supplier['strengths'])}")
        if supplier.get("weaknesses"):
            context_parts.append(f"- Weaknesses: {', '.join(supplier['weaknesses'])}")
    
    if briefing.get("offer_analysis"):
        offer = briefing["offer_analysis"]
        context_parts.append(f"## Offer Analysis\n- Total Value: {offer.get('total_value', 'Unknown')}\n- Assessment: {offer.get('assessment', '')}")
        if offer.get("key_items"):
            context_parts.append(f"- Key Items: {', '.join(offer['key_items'])}")
    
    if briefing.get("negotiation_strategy"):
        strategy = briefing["negotiation_strategy"]
        context_parts.append(f"## Negotiation Strategy\n- Opening Position: {strategy.get('opening_position', '')}\n- Target Position: {strategy.get('target_position', '')}\n- Walkaway Point: {strategy.get('walkaway_point', '')}")
    
    if briefing.get("key_talking_points"):
        points = briefing["key_talking_points"]
        talking_points = "\n".join([f"- {tp.get('point', '')}: {tp.get('rationale', '')}" for tp in points])
        context_parts.append(f"## Key Talking Points\n{talking_points}")
    
    if briefing.get("leverage_points"):
        leverages = briefing["leverage_points"]
        leverage_text = "\n".join([f"- {lp.get('lever', '')}: {lp.get('how_to_use', '')}" for lp in leverages])
        context_parts.append(f"## Leverage Points\n{leverage_text}")
    
    if briefing.get("potential_objections"):
        objections = briefing["potential_objections"]
        objections_text = "\n".join([f"- Objection: {obj.get('objection', '')} → Counter: {obj.get('counter', '')}" for obj in objections])
        context_parts.append(f"## Potential Objections & Counters\n{objections_text}")
    
    if briefing.get("risk_assessment"):
        risks = briefing["risk_assessment"]
        if risks.get("risks"):
            context_parts.append(f"## Risks\n{', '.join(risks['risks'])}")
        if risks.get("mitigation"):
            context_parts.append(f"## Mitigation Strategies\n{', '.join(risks['mitigation'])}")
    
    return "\n\n".join(context_parts) if context_parts else "No briefing context available."


async def store_briefing_in_vector_db(job_id: str, briefing: Dict[str, Any]) -> str:
    """
    Store briefing - now just returns job_id since we use in-memory storage.
    """
    logger.info(f"store_briefing_in_vector_db called for job_id={job_id}")
    return job_id


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
{"value": <number>, "risk": <number>, "outcome": <number>}"""


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
    logger.info(f"analyze_conversation_metrics called for vector_db_id={vector_db_id}")
    
    # Get metrics-specific briefing context
    briefing_context = get_briefing_context(vector_db_id, action_type="metrics")
    
    # Build conversation context
    conversation_text = "\n".join([
        f"{'User' if msg.get('speaker_id') == 'user' else 'Other'}: {msg.get('text', '')}"
        for msg in conversation_messages[-15:]
    ]) if conversation_messages else ""
    
    # If no conversation, return neutral metrics
    if not conversation_text.strip():
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
        response = await chain.ainvoke({
            "briefing_context": briefing_context,
            "goals_section": goals_section,
            "conversation": conversation_text
        })
        
        # Parse JSON response
        import re
        content = response.content.strip()
        
        # Try to extract JSON from response
        json_match = re.search(r'\{[^}]+\}', content)
        if json_match:
            metrics = json.loads(json_match.group())
            
            # Validate and clamp values
            return {
                "value": max(0, min(100, int(metrics.get("value", 50)))),
                "risk": max(0, min(100, int(metrics.get("risk", 50)))),
                "outcome": max(0, min(100, int(metrics.get("outcome", 50))))
            }
        else:
            logger.warning(f"Could not parse metrics JSON: {content}")
            return {"value": 50, "risk": 50, "outcome": 50}
            
    except Exception as e:
        logger.error(f"Error analyzing metrics: {str(e)}", exc_info=True)
        return {"value": 50, "risk": 50, "outcome": 50}
