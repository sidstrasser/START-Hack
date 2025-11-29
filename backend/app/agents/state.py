from typing import TypedDict, Dict, List, Any, Optional


class NegotiationState(TypedDict):
    """State shared across all agents in the negotiation briefing workflow."""

    # Inputs
    document_id: str
    raw_pdf_text: str
    extracted_data: Dict[str, Any]
    additional_context: Dict[str, Any]

    # Intermediate Results
    normalized_goals: Optional[Dict[str, Any]]
    deal_type: Optional[str]
    research_results: Optional[Dict[str, Any]]
    identified_potentials: Optional[List[Dict[str, Any]]]

    # Final Output
    final_briefing: Optional[Dict[str, Any]]

    # Meta
    current_agent: str
    errors: List[str]
    progress: float
    job_id: str
