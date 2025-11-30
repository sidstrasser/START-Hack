from pydantic import BaseModel
from typing import Optional, Dict, List, Any, Literal


class FormDataInput(BaseModel):
    """User-provided form data for briefing generation."""
    supplier_name: str
    supplier_contact: Optional[str] = None
    product_description: str
    product_type: Literal["software", "hardware", "service"]
    offer_price: str
    pricing_model: Literal["yearly", "monthly", "one-time"]
    max_price: str
    target_price: str
    value_assessment: Literal["urgent", "high_impact", "medium_impact", "low_impact"]


class UploadResponse(BaseModel):
    """Response from PDF upload endpoint."""
    document_id: str
    extracted_data: Dict[str, Any]  # Auto-extracted form data for pre-filling


class BriefingRequest(BaseModel):
    """Request to generate briefing."""
    document_id: str
    form_data: FormDataInput
    additional_context: Optional[str] = None


class BriefingResponse(BaseModel):
    """Response from generate briefing endpoint."""
    job_id: str


class ProgressEvent(BaseModel):
    """Progress update event."""
    agent: str
    status: str  # "running", "completed", "error"
    message: str
    progress: float  # 0.0 to 1.0


class BriefingResult(BaseModel):
    """Final briefing result."""
    briefing: Dict[str, Any] | None = None
    status: str
    vector_db_id: Optional[str] = None
    stored_to_pinecone: bool = False


class QueryBriefingRequest(BaseModel):
    """Request to query briefing."""
    vector_db_id: str
    query: str


class QueryBriefingResponse(BaseModel):
    """Response from briefing query."""
    answer: str
    sources: List[str]


class StoreToPineconeResponse(BaseModel):
    """Response from store to Pinecone endpoint."""
    success: bool
    vector_db_id: str
    message: str
