"""
LangGraph workflow definition for negotiation briefing generation.

Parallel execution flow:
START → parse → [5 parallel agents] → END

Agents run in parallel after parse completes:
- supplier_summary: Company research
- market_analysis: Competitive analysis
- offer_analysis: Gap analysis
- outcome_assessment: Strategy generation
- action_items: Action planning
"""

from langgraph.graph import StateGraph, END
from app.agents.state import NegotiationState
from app.agents.parse import parse_node
from app.agents.supplier_summary import supplier_summary_node
from app.agents.market_analysis import market_analysis_node
from app.agents.offer_analysis import offer_analysis_node
from app.agents.outcome_assessment import outcome_assessment_node
from app.agents.action_items import action_items_node


def should_continue_after_parse(state: NegotiationState) -> str:
    """
    Check if pipeline should continue after parse node.

    If parse fails with critical errors, stop the pipeline.
    Otherwise, continue to parallel agents.

    Args:
        state: Current negotiation state

    Returns:
        "continue" if no critical errors, "end" if parse failed
    """
    if state.get("errors") and len(state["errors"]) > 0:
        # Parse node had critical errors (missing documents)
        return "end"
    return "continue"


def create_negotiation_graph():
    """
    Create the LangGraph workflow with proper dependency ordering.

    Flow (based on data dependencies):
    START → parse → [Tier 1: supplier_summary, market_analysis, offer_analysis (parallel)]
                  → [Tier 2: outcome_assessment (waits for market + offer)]
                  → [Tier 3: action_items (waits for all above)]
                  → END

    Parse Node:
    - Validates inputs (supplier_offer_pdf, initial_request_pdf, form_data)
    - Extracts alternatives from PDF
    - Publishes progress: 0.0 → 0.15

    Tier 1 Agents (parallel - no dependencies on each other):
    - supplier_summary: Company research (independent)
    - market_analysis: Competitive analysis (independent)
    - offer_analysis: Gap analysis (independent)

    Tier 2 Agent (depends on Tier 1):
    - outcome_assessment: Needs market_analysis + offer_analysis

    Tier 3 Agent (depends on Tier 1 + Tier 2):
    - action_items: Needs offer_analysis + market_analysis + outcome_assessment

    Error Handling:
    - Parse failure stops entire pipeline (critical)
    - Individual agent failures don't block other agents
    - Errors stored in state["errors"] for reporting

    Returns:
        Compiled LangGraph workflow
    """
    workflow = StateGraph(NegotiationState)

    # ========================================================================
    # ADD NODES
    # Note: Node names must differ from state keys, so we use "_agent" suffix
    # ========================================================================
    workflow.add_node("parse", parse_node)
    workflow.add_node("supplier_summary_agent", supplier_summary_node)
    workflow.add_node("market_analysis_agent", market_analysis_node)
    workflow.add_node("offer_analysis_agent", offer_analysis_node)
    workflow.add_node("outcome_assessment_agent", outcome_assessment_node)
    workflow.add_node("action_items_agent", action_items_node)

    # ========================================================================
    # SET ENTRY POINT
    # ========================================================================
    workflow.set_entry_point("parse")

    # ========================================================================
    # ADD EDGES - TIERED EXECUTION WITH DEPENDENCIES
    # ========================================================================

    # After parse: check for critical errors
    workflow.add_conditional_edges(
        "parse",
        should_continue_after_parse,
        {
            "continue": "supplier_summary_agent",
            "end": END
        }
    )

    # TIER 1: Parallel execution from parse (no inter-dependencies)
    workflow.add_edge("parse", "market_analysis_agent")
    workflow.add_edge("parse", "offer_analysis_agent")

    # supplier_summary is independent, terminates at END
    workflow.add_edge("supplier_summary_agent", END)

    # TIER 2: outcome_assessment waits for market_analysis AND offer_analysis
    workflow.add_edge("market_analysis_agent", "outcome_assessment_agent")
    workflow.add_edge("offer_analysis_agent", "outcome_assessment_agent")

    # TIER 3: action_items waits for outcome_assessment (which already waited for tier 1)
    workflow.add_edge("outcome_assessment_agent", "action_items_agent")

    # Final agent terminates
    workflow.add_edge("action_items_agent", END)

    return workflow.compile()


# ============================================================================
# CREATE COMPILED GRAPH INSTANCE
# ============================================================================
negotiation_graph = create_negotiation_graph()
