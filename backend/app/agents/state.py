"""
State schema for the negotiation briefing LangGraph workflow.

This module defines the shared state that flows through all nodes:
- parse → [5 parallel agents] → END
"""

from typing import TypedDict, Dict, List, Any, Optional, Annotated
from operator import add


def merge_dicts(left: Optional[Dict], right: Optional[Dict]) -> Optional[Dict]:
    """Merge two dicts, with right taking precedence. Used for parallel agent updates."""
    if left is None:
        return right
    if right is None:
        return left
    return {**left, **right}


class NegotiationState(TypedDict):
    """State shared across all agents in the negotiation briefing workflow."""

    # ========================================================================
    # INPUTS (3 Document Types) - Single value, set once by parse
    # ========================================================================
    document_id: str  # Unique ID for the uploaded documents
    supplier_offer_pdf: str  # Raw text from supplier offer PDF (contains pricing = max price orientation)
    initial_request_pdf: str  # Raw text from initial request PDF (what we're looking for, requirements)
    alternatives_pdf: Optional[str]  # Raw text from potential suppliers list (optional, for comparison)
    form_data: Dict[str, Any]  # User-provided structured form data (FormDataInput schema)

    # ========================================================================
    # NODE OUTPUTS - Each agent writes to its own key (no conflicts)
    # ========================================================================
    parsed_input: Optional[Dict[str, Any]]  # Output from parse node (ParsedInput schema)

    # Parallel agent outputs - each agent has exclusive write access to its own field
    supplier_summary: Optional[Dict[str, Any]]  # Output from supplier_summary agent
    market_analysis: Optional[Dict[str, Any]]  # Output from market_analysis agent
    offer_analysis: Optional[Dict[str, Any]]  # Output from offer_analysis agent
    outcome_assessment: Optional[Dict[str, Any]]  # Output from outcome_assessment agent
    action_items: Optional[Dict[str, Any]]  # Output from action_items agent (separate from briefing)

    # ========================================================================
    # META/TRACKING - Use Annotated with reducers for concurrent updates
    # ========================================================================
    current_agent: str  # Name of currently executing agent
    errors: Annotated[List[str], add]  # List of error messages (use add operator for concurrent appends)
    progress: float  # Global progress indicator 0.0-1.0 for frontend
    agent_progress: Annotated[Dict[str, float], merge_dicts]  # Per-agent progress tracking {agent_name: 0.0-1.0}
    job_id: str  # Unique job identifier for tracking and storage
