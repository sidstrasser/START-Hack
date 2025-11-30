"""
Pydantic schemas for the negotiation briefing system.

This module defines all structured data models used throughout the pipeline:
- Input models (FormData, AlternativeSupplier)
- Node output models (ParsedInput, SupplierSummary, MarketAnalysis, OfferAnalysis, OutcomeAssessment, ActionItemsList)
- Sub-models for complex nested structures
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal


# ============================================================================
# INPUT MODELS
# ============================================================================

class FormData(BaseModel):
    """User-provided form data about the negotiation context."""

    supplier_name: str = Field(description="Name of the supplier company")
    supplier_contact: Optional[str] = Field(default=None, description="Contact email or phone")
    product_description: str = Field(description="Description of the product/service being negotiated")
    product_type: Literal["software", "hardware", "service"] = Field(description="Type of product")
    offer_price: str = Field(description="Offered price from supplier")
    pricing_model: Literal["yearly", "monthly", "one-time"] = Field(description="Pricing model")
    max_price: str = Field(description="Maximum acceptable price")
    target_price: str = Field(description="Target price to negotiate to")
    value_assessment: Literal["urgent", "high_impact", "medium_impact", "low_impact"] = Field(
        description="Assessment of business value/urgency"
    )


class AlternativeSupplier(BaseModel):
    """Information about an alternative supplier option."""

    name: str = Field(description="Supplier company name")
    description: Optional[str] = Field(default=None, description="Brief description of what they offer")
    contact: Optional[str] = Field(default=None, description="Contact information")


# ============================================================================
# PARSE NODE OUTPUT
# ============================================================================

class ParsedInput(BaseModel):
    """Output from the parse node - validated and structured inputs."""

    supplier_offer_text: str = Field(description="Full text from supplier offer PDF (contains pricing = max price)")
    initial_request_text: str = Field(description="Full text from initial request PDF (what we're looking for)")
    alternatives_text: Optional[str] = Field(
        default=None,
        description="Full text from alternatives PDF (raw text for agent analysis)"
    )
    alternatives: List[AlternativeSupplier] = Field(
        default_factory=list,
        description="List of alternative suppliers extracted from PDF (structured data)"
    )
    form_data: FormData = Field(description="User-provided structured form data")


# ============================================================================
# SHARED MODELS
# ============================================================================

class CompanyOverview(BaseModel):
    """Overview of a company from web research."""

    description: str = Field(description="Company description and business overview")
    size: Optional[str] = Field(default=None, description="Company size (e.g., employees, revenue)")
    location: Optional[str] = Field(default=None, description="Company headquarters location")
    industry: Optional[str] = Field(default=None, description="Primary industry/sector")


# ============================================================================
# PARALLEL AGENT OUTPUTS
# ============================================================================

class SupplierSummary(BaseModel):
    """Section 1: Summary of the supplier being negotiated with."""

    company_overview: CompanyOverview = Field(description="Company profile")
    key_facts: List[str] = Field(description="Key facts about the supplier")
    recent_news: List[str] = Field(description="Recent news items (max 3)")
    contact_info: str = Field(description="Contact information")


class MarketAnalysis(BaseModel):
    """Section 2: Market analysis including alternatives and positioning."""

    alternatives_overview: str = Field(
        description="Overview of alternative supplier options available"
    )
    price_positioning: str = Field(
        description="Analysis of how the offer price compares to market rates"
    )
    key_risks: List[str] = Field(
        description="Key risks identified (max 3)",
        max_length=3
    )


class OfferAnalysis(BaseModel):
    """Section 3: Analysis of the supplier's offer."""

    completeness_score: int = Field(
        ge=1,
        le=10,
        description="Completeness score (1-10) based on presence of key terms"
    )
    completeness_notes: str = Field(
        description="Notes explaining the completeness score"
    )
    price_assessment: str = Field(
        description="Assessment comparing offer price vs target and max price"
    )
    hidden_cost_warnings: List[str] = Field(
        description="Potential hidden costs to watch out for"
    )


class OutcomeAssessment(BaseModel):
    """Section 4: Assessment of negotiation outcomes and strategy."""

    target_achievable: bool = Field(
        description="Whether the target price appears achievable"
    )
    confidence: str = Field(
        description="Confidence level (High/Medium/Low)"
    )
    negotiation_leverage: List[str] = Field(
        description="Leverage points available for negotiation"
    )
    recommended_tactics: List[str] = Field(
        description="Recommended negotiation tactics (3-5 concrete tips)",
        min_length=3,
        max_length=5
    )
    partnership_recommendation: str = Field(
        description="Strategic partnership level recommendation (e.g., Transactional, Preferred Vendor, Strategic Partner)"
    )


class ActionItem(BaseModel):
    """Individual action item for the negotiation."""

    category: Literal["price", "terms", "timeline", "scope"] = Field(
        description="Category of the action item"
    )
    action: str = Field(description="Description of the action to take")
    recommended: bool = Field(
        default=False,
        description="Whether this is a recommended action item (exactly 2 should be marked as recommended)"
    )


class ActionItemsList(BaseModel):
    """Output from the action_items agent - exactly 5 prioritized action items."""

    items: List[ActionItem] = Field(
        description="Exactly 5 most important action items to take",
        min_length=5,
        max_length=5
    )
