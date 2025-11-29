from langgraph.graph import StateGraph, END
from app.agents.state import NegotiationState
from app.agents.orchestrator import orchestrator_node
from app.agents.goal_normalizer import goal_normalizer_node
from app.agents.research import research_node
from app.agents.potential import potential_node
from app.agents.briefing import briefing_node


def should_continue(state: NegotiationState) -> str:
    """
    Conditional edge: Check if we should continue after orchestrator.

    If there are validation errors, we end early.
    """
    if state.get("errors") and len(state["errors"]) > 0:
        return "end"
    return "continue"


def should_continue_after_agent(state: NegotiationState) -> str:
    """
    Conditional edge: Check if pipeline should continue or stop due to errors.

    This is used after each agent to stop the pipeline if errors occurred.
    """
    if state.get("errors") and len(state["errors"]) > 0:
        return "end"
    return "continue"


def create_negotiation_graph():
    """
    Create the LangGraph workflow for negotiation briefing generation.

    Flow:
    START -> Orchestrator -> Goal Normalizer -> Research -> Potential -> Briefing -> END
    """
    workflow = StateGraph(NegotiationState)

    # Add nodes
    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("goal_normalizer", goal_normalizer_node)
    workflow.add_node("research", research_node)
    workflow.add_node("potential", potential_node)
    workflow.add_node("briefing", briefing_node)

    # Set entry point
    workflow.set_entry_point("orchestrator")

    # Add edges with error checking after each agent
    workflow.add_conditional_edges(
        "orchestrator",
        should_continue,
        {
            "continue": "goal_normalizer",
            "end": END
        }
    )

    workflow.add_conditional_edges(
        "goal_normalizer",
        should_continue_after_agent,
        {
            "continue": "research",
            "end": END
        }
    )

    workflow.add_conditional_edges(
        "research",
        should_continue_after_agent,
        {
            "continue": "potential",
            "end": END
        }
    )

    workflow.add_conditional_edges(
        "potential",
        should_continue_after_agent,
        {
            "continue": "briefing",
            "end": END
        }
    )

    workflow.add_edge("briefing", END)

    return workflow.compile()


# Create compiled graph instance
negotiation_graph = create_negotiation_graph()
