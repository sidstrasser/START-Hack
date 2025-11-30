"""
State schema for the negotiation briefing LangGraph workflow.

This module defines the shared state that flows through all nodes:
- parse → research → analyze → END
"""

from typing import TypedDict, Dict, List, Any, Optional


class NegotiationState(TypedDict):
    """State shared across all agents in the negotiation briefing workflow."""

    # ========================================================================
    # INPUTS
    # ========================================================================
    document_id: str  # Unique ID for the uploaded documents
    supplier_offer_pdf: str  # Raw text extracted from supplier offer PDF
    alternatives_pdf: Optional[str]  # Raw text from alternatives PDF (optional)
    additional_context_pdf: Optional[str]  # Raw text from additional context PDF (optional)
    form_data: Dict[str, Any]  # User-provided structured form data (FormDataInput schema)

    # ========================================================================
    # NODE OUTPUTS
    # ========================================================================
    parsed_input: Optional[Dict[str, Any]]  # Output from parse node (ParsedInput schema)
    research_output: Optional[Dict[str, Any]]  # Output from research node (ResearchOutput schema)
    final_briefing: Optional[Dict[str, Any]]  # Output from analyze node (FinalBriefing schema)

    # ========================================================================
    # META/TRACKING
    # ========================================================================
    current_agent: str  # Name of currently executing agent (parse/research/analyze)
    errors: List[str]  # List of error messages (stops pipeline if non-empty)
    progress: float  # Progress indicator 0.0-1.0 for frontend
    job_id: str  # Unique job identifier for tracking and storage
