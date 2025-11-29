"""
Data Extraction Agent - Specialized agent for extracting structured data from offer PDFs.

This agent uses advanced prompting and structured output to ensure reliable extraction
of key fields for pre-filling the negotiation input form.
"""

from typing import Dict, Any
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from app.utils.llm import get_llm


class ExtractedOfferData(BaseModel):
    """Structured schema for extracted offer data."""

    # Cost & Savings
    offer_price: str | None = Field(
        default=None,
        description="The absolute price extracted from the offer (e.g., '€50,000')"
    )
    pricing_model: str | None = Field(
        default=None,
        description="The pricing model (e.g., 'Fixed Price', 'Subscription', 'Time & Material')"
    )
    desired_price: str | None = Field(
        default=None,
        description="Target or desired price if mentioned in internal documents"
    )
    is_substitute: bool = Field(
        default=False,
        description="True if this is a substitute for an existing solution, False if it is a new solution"
    )
    current_price: str | None = Field(
        default=None,
        description="Current price of the existing solution (if is_substitute is True)"
    )

    # Value / Requirements (Scale 1-10)
    added_value: int | None = Field(
        default=None,
        description="Estimated added value on a scale of 1-10"
    )
    need: int | None = Field(
        default=None,
        description="Urgency or need for this solution on a scale of 1-10"
    )

    # Risk / Contract (Scale 1-10)
    impact_of_outage: int | None = Field(
        default=None,
        description="Impact of service outage on a scale of 1-10"
    )
    risk_aversion: int | None = Field(
        default=None,
        description="Organizational risk aversion regarding this deal on a scale of 1-10"
    )
    target_support_availability: int | None = Field(
        default=None,
        description="Required support availability level on a scale of 1-10"
    )
    compliance_relevance: int | None = Field(
        default=None,
        description="Relevance of compliance requirements on a scale of 1-10"
    )
    
    # Keep supplier for reference
    supplier: str | None = Field(
        default=None,
        description="The name of the company or supplier"
    )

class DataExtractionAgent:
    """Agent specialized in extracting structured data from offer documents."""

    def __init__(self):
        """Initialize the Data Extraction Agent."""
        self.llm = get_llm(temperature=0.0)  # Zero temperature for consistent extraction
        self.parser = JsonOutputParser(pydantic_object=ExtractedOfferData)

        # Create extraction prompt with structured output instructions
        self.extraction_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert data extraction specialist for procurement.
Your task is to extract key information from one or multiple uploaded documents (offers, internal emails, requirements).

Extract the following fields based on the documents provided:

1. Cost & Savings:
- offer_price: The price from the offer document.
- pricing_model: How the price is structured.
- desired_price: Look for internal notes or emails mentioning a target price.
- is_substitute: Boolean. True if replacing an existing tool, False if new.
- current_price: If substitute, what is the cost of the current solution?

2. Value/Requirements (Infer 1-10 scale if not explicit, based on tone/urgency):
- added_value: How much value does this bring? (1=Low, 10=High)
- need: How urgent/critical is this? (1=Nice to have, 10=Critical)

3. Risk/Contract (Infer 1-10 scale):
- impact_of_outage: How bad is downtime? (1=Minor, 10=Catastrophic)
- risk_aversion: How cautious is the buyer? (1=Risk-taker, 10=Very cautious)
- target_support_availability: Support needs (1=Basic, 10=24/7 Dedicated)
- compliance_relevance: Regulatory importance (1=None, 10=Strict/GDPR/etc)

{format_instructions}

Return ONLY valid JSON."""),
            ("user", "Extract structured data from these documents:\n\n{text}")
        ])

        self.chain = self.extraction_prompt | self.llm | self.parser

    async def extract(self, raw_text: str) -> Dict[str, Any]:
        """
        Extract structured data from raw PDF text.

        Args:
            raw_text: Raw text extracted from PDF

        Returns:
            Dictionary with extracted fields matching ExtractedOfferData schema
        """
        # Truncate text to avoid token limits while keeping important content
        # Take first 10,000 chars (offers are usually front-loaded with key info)
        truncated_text = raw_text[:10000] if len(raw_text) > 10000 else raw_text

        try:
            # Invoke the chain with format instructions
            result = await self.chain.ainvoke({
                "text": truncated_text,
                "format_instructions": self.parser.get_format_instructions()
            })

            # Ensure we return a dict (parser should handle this)
            return result if isinstance(result, dict) else result.dict()

        except Exception as e:
            # Return empty structure on error
            print(f"Data extraction error: {str(e)}")
            return {
                "supplier": None,
                "total_price": None,
                "delivery_time": None,
                "contact_person": None,
                "payment_terms": None,
                "validity_period": None,
                "line_items": [],
            }


# Singleton instance
_extraction_agent = None

def get_extraction_agent() -> DataExtractionAgent:
    """Get or create the singleton extraction agent."""
    global _extraction_agent
    if _extraction_agent is None:
        _extraction_agent = DataExtractionAgent()
    return _extraction_agent
