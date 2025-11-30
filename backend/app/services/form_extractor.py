"""
Form Data Extractor - Extracts structured form data from supplier offer PDF.

Uses LLM with temperature=0 for deterministic extraction to pre-fill the form.
"""

import logging
from typing import Dict, Any
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from app.utils.llm import get_llm

logger = logging.getLogger(__name__)


class ExtractedFormData(BaseModel):
    """Extracted form data from supplier offer PDF."""
    supplier_name: str = Field(description="Supplier company name")
    supplier_contact: str | None = Field(default=None, description="Contact email or phone")
    product_description: str = Field(description="Description of product/service")
    product_type: str = Field(description="Type: software, hardware, or service")
    offer_price: str = Field(description="Offered price from supplier")
    pricing_model: str = Field(description="Pricing model: yearly, monthly, or one-time")
    max_price: str = Field(description="Maximum acceptable price (estimate if not provided)")
    target_price: str = Field(description="Target price to negotiate to (estimate if not provided)")
    value_assessment: str = Field(description="Business value: urgent, high_impact, medium_impact, or low_impact")


async def extract_form_data_from_pdf(pdf_text: str) -> Dict[str, Any]:
    """
    Extract structured form data from supplier offer PDF for form pre-filling.

    Uses LLM with temperature=0 for deterministic extraction.

    Args:
        pdf_text: Raw text extracted from supplier offer PDF

    Returns:
        Dictionary matching FormDataInput schema for form pre-filling
    """
    logger.info("[FORM EXTRACTOR] Starting form data extraction from PDF")

    # Define parser
    parser = PydanticOutputParser(pydantic_object=ExtractedFormData)

    # Build prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at extracting structured information from supplier offers and business documents.

Extract the following information from the supplier offer:

1. **supplier_name**: Company name of the supplier
2. **supplier_contact**: Email, phone, or website (if available)
3. **product_description**: Brief description of what product/service is being offered
4. **product_type**: Classify as "software", "hardware", or "service"
5. **offer_price**: The price offered by the supplier (with currency)
6. **pricing_model**: "yearly", "monthly", or "one-time"
7. **max_price**: Maximum price the buyer would accept (if mentioned, otherwise estimate 10-20% above offer)
8. **target_price**: Ideal target price for negotiation (if mentioned, otherwise estimate 10-15% below offer)
9. **value_assessment**: Assess business value/urgency as:
   - "urgent" if time-sensitive or critical
   - "high_impact" if strategically important
   - "medium_impact" if moderately important
   - "low_impact" if low priority

{format_instructions}

If information is missing, make reasonable estimates based on context."""),
        ("user", "Supplier offer document:\n\n{pdf_text}")
    ])

    # Get LLM with temperature=0 for deterministic extraction
    llm = get_llm(temperature=0.0)

    # Build chain
    chain = prompt | llm | parser

    # Execute
    try:
        result: ExtractedFormData = await chain.ainvoke({
            "pdf_text": pdf_text[:6000],  # Limit text length
            "format_instructions": parser.get_format_instructions()
        })

        logger.info(f"[FORM EXTRACTOR] Successfully extracted form data for supplier: {result.supplier_name}")

        return result.model_dump()

    except Exception as e:
        logger.error(f"[FORM EXTRACTOR] Extraction failed: {str(e)}", exc_info=True)

        # Return minimal fallback data
        return {
            "supplier_name": "Unknown Supplier",
            "supplier_contact": None,
            "product_description": "Product/service description not available",
            "product_type": "service",
            "offer_price": "0",
            "pricing_model": "one-time",
            "max_price": "0",
            "target_price": "0",
            "value_assessment": "medium_impact"
        }
