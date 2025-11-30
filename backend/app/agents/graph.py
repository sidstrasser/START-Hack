"""
LangGraph workflow definition for negotiation briefing generation.

New simplified flow:
START → parse → research → analyze → END

Each node has conditional error checking to stop pipeline on failures.
"""

from langgraph.graph import StateGraph, END
from app.agents.state import NegotiationState
from app.agents.parse import parse_node
from app.agents.research import research_node
from app.agents.analyze import analyze_node


def should_continue_after_node(state: NegotiationState) -> str:
    """
    Conditional edge: Check if pipeline should continue or stop due to errors.

    This is used after each node to stop the pipeline if errors occurred.

    Args:
        state: Current negotiation state

    Returns:
        "continue" if no errors, "end" if errors exist
    """
    if state.get("errors") and len(state["errors"]) > 0:
        return "end"
    return "continue"


def create_negotiation_graph():
    """
    Create the LangGraph workflow for negotiation briefing generation.

    New Flow:
    START → parse → research → analyze → END

    Each node:
    - parse: Validates inputs, extracts alternatives from PDF
    - research: Web search for company info and news
    - analyze: Generates final briefing with 5 sections

    Error Handling:
    - After each node, check for errors in state
    - If errors exist, terminate pipeline early
    - Each node publishes progress events via SSE

    Returns:
        Compiled LangGraph workflow
    """
    workflow = StateGraph(NegotiationState)

    # ========================================================================
    # ADD NODES
    # ========================================================================
    workflow.add_node("parse", parse_node)
    workflow.add_node("research", research_node)
    workflow.add_node("analyze", analyze_node)

    # ========================================================================
    # SET ENTRY POINT
    # ========================================================================
    workflow.set_entry_point("parse")

    # ========================================================================
    # ADD CONDITIONAL EDGES WITH ERROR CHECKING
    # ========================================================================

    # After parse: continue to research or end if errors
    workflow.add_conditional_edges(
        "parse",
        should_continue_after_node,
        {
            "continue": "research",
            "end": END
        }
    )

    # After research: continue to analyze or end if errors
    workflow.add_conditional_edges(
        "research",
        should_continue_after_node,
        {
            "continue": "analyze",
            "end": END
        }
    )

    # After analyze: always end (final node)
    workflow.add_edge("analyze", END)

    return workflow.compile()


# ============================================================================
# CREATE COMPILED GRAPH INSTANCE
# ============================================================================
negotiation_graph = create_negotiation_graph()
