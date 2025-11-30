"""
Form Data Extractor - Extracts structured form data from two PDF documents.

Uses LLM with temperature=0 for deterministic extraction to pre-fill the form.

Document Types:
- Supplier Offer: Contains pricing (= max price orientation), supplier info
- Initial Request: Contains what the company is looking for (product description, requirements)
"""

import logging
from typing import Dict, Any
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from app.utils.llm import get_llm

logger = logging.getLogger(__name__)


class ExtractedFormData(BaseModel):
    """Extracted form data from both documents."""
    supplier_name: str = Field(description="Supplier company name (from Supplier Offer)")
    supplier_contact: str | None = Field(default=None, description="Contact email or phone (from Supplier Offer)")
    product_description: str = Field(description="What the company is looking for (from Initial Request)")
    product_type: str = Field(description="Type: software, hardware, or service")
    offer_price: str = Field(description="Offered price from supplier (from Supplier Offer)")
    pricing_model: str = Field(description="Pricing model: yearly, monthly, or one-time")
    max_price: str = Field(description="The supplier's offer price IS the max price (ceiling for negotiation)")
    target_price: str = Field(description="Target price for negotiation (estimate 10-20% below offer price)")
    value_assessment: str = Field(description="Business value: urgent, high_impact, medium_impact, or low_impact")


async def extract_form_data_from_pdfs(
    supplier_offer_text: str,
    initial_request_text: str
) -> Dict[str, Any]:
    """
    Extract structured form data from both documents for form pre-filling.

    Extraction logic:
    - From Supplier Offer: supplier_name, supplier_contact, offer_price, pricing_model
    - From Initial Request: product_description, product_type, requirements
    - offer_price becomes max_price (the supplier's price is our ceiling)
    - target_price is estimated as 10-20% below offer_price

    Args:
        supplier_offer_text: Raw text from supplier offer PDF
        initial_request_text: Raw text from initial request PDF

    Returns:
        Dictionary matching FormDataInput schema for form pre-filling
    """
    logger.info("[FORM EXTRACTOR] Starting dual-document form data extraction")

    # Define parser
    parser = PydanticOutputParser(pydantic_object=ExtractedFormData)

    # Build prompt that uses BOTH documents
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at extracting structured information from business documents.

You will receive TWO documents:
1. **SUPPLIER OFFER**: The supplier's proposal/offer document containing pricing and supplier info
2. **INITIAL REQUEST**: What the buying company is looking for (their requirements, product description)

Extract the following information:

FROM SUPPLIER OFFER:
- **supplier_name**: Company name of the supplier
- **supplier_contact**: Email, phone, or website (if available)
- **offer_price**: The price offered by the supplier (with currency)
- **pricing_model**: "yearly", "monthly", or "one-time"

FROM INITIAL REQUEST:
- **product_description**: What the company is looking for, their requirements
- **product_type**: Classify as "software", "hardware", or "service"

CALCULATED/ESTIMATED:
- **max_price**: Use the offer_price as max_price (the supplier's offer IS our ceiling)
- **target_price**: Estimate 10-20% below offer_price as negotiation target
- **value_assessment**: Based on urgency/importance from Initial Request:
   - "urgent" if time-sensitive or critical
   - "high_impact" if strategically important
   - "medium_impact" if moderately important
   - "low_impact" if low priority

{format_instructions}

Important: The offer_price from the Supplier Offer should become the max_price - this is the ceiling we don't want to exceed."""),
        ("user", """SUPPLIER OFFER DOCUMENT:
{supplier_offer_text}

---

INITIAL REQUEST DOCUMENT:
{initial_request_text}""")
    ])

    # Get LLM with temperature=0 for deterministic extraction
    llm = get_llm(temperature=0.0)

    # Build chain
    chain = prompt | llm | parser

    # Execute
    try:
        result: ExtractedFormData = await chain.ainvoke({
            "supplier_offer_text": supplier_offer_text[:5000],
            "initial_request_text": initial_request_text[:5000],
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


# Keep old function for backwards compatibility
async def extract_form_data_from_pdf(pdf_text: str) -> Dict[str, Any]:
    """Legacy function - extracts from single PDF. Use extract_form_data_from_pdfs instead."""
    return await extract_form_data_from_pdfs(
        supplier_offer_text=pdf_text,
        initial_request_text=""
    )
