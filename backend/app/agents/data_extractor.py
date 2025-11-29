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

    supplier: str | None = Field(
        default=None,
        description="The name of the company or supplier providing the offer"
    )
    total_price: str | None = Field(
        default=None,
        description="Total price with currency (e.g., '€50,000', '$25,000 USD')"
    )
    delivery_time: str | None = Field(
        default=None,
        description="Expected delivery timeframe (e.g., '4-6 weeks', '2 months')"
    )
    contact_person: str | None = Field(
        default=None,
        description="Name of the main contact person from the supplier"
    )
    payment_terms: str | None = Field(
        default=None,
        description="Payment conditions (e.g., 'Net 30', '50% upfront, 50% on delivery')"
    )
    validity_period: str | None = Field(
        default=None,
        description="How long the offer is valid (e.g., '30 days', 'Valid until 2025-12-31')"
    )
    line_items: list[str] = Field(
        default_factory=list,
        description="List of items, products, or services being offered"
    )


class DataExtractionAgent:
    """Agent specialized in extracting structured data from offer documents."""

    def __init__(self):
        """Initialize the Data Extraction Agent."""
        self.llm = get_llm(temperature=0.0)  # Zero temperature for consistent extraction
        self.parser = JsonOutputParser(pydantic_object=ExtractedOfferData)

        # Create extraction prompt with structured output instructions
        self.extraction_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert data extraction specialist for business offers and procurement documents.

Your task is to extract key information from offer documents and return it in a structured JSON format.

Extract the following fields:
- supplier: Company/supplier name
- total_price: Total price with currency
- delivery_time: Expected delivery timeframe
- contact_person: Main contact person
- payment_terms: Payment conditions
- validity_period: Offer validity period
- line_items: List of items/services offered

CRITICAL INSTRUCTIONS:
1. Extract exact values as they appear in the document
2. If a field is not found or unclear, set it to null (not an empty string)
3. For total_price, include currency symbol or code
4. For line_items, extract a concise list (max 10 items)
5. Preserve original formatting for dates and numbers
6. Do not make assumptions - only extract what's explicitly stated

{format_instructions}

Return ONLY valid JSON, no additional text or explanation."""),
            ("user", "Extract structured data from this offer document:\n\n{text}")
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
