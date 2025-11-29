import pdfplumber
import uuid
import json
from typing import Dict, Any
from app.utils.llm import get_llm
from langchain.prompts import ChatPromptTemplate


async def extract_offer_data(pdf_path: str) -> Dict[str, Any]:
    """
    Extract structured data from PDF offer document.

    Args:
        pdf_path: Path to the PDF file

    Returns:
        Dictionary with extracted data including raw text and structured fields
    """
    # Extract text from PDF
    with pdfplumber.open(pdf_path) as pdf:
        pages_text = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text)

        raw_text = "\n\n".join(pages_text)

    # Use LLM to extract structured data
    llm = get_llm(temperature=0.0)

    extraction_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at extracting structured data from business offers and proposals.
Extract the following information from the provided text:
- supplier: Company name providing the offer
- total_price: Total price (extract number and currency)
- delivery_time: Expected delivery timeframe
- contact_person: Main contact person name
- line_items: List of items/services being offered
- payment_terms: Payment conditions
- validity_period: How long the offer is valid

Return your response as a valid JSON object with these fields. If a field is not found, use null."""),
        ("user", "Extract data from this offer:\n\n{text}")
    ])

    chain = extraction_prompt | llm

    # Limit text to avoid token limits (first 8000 chars should be enough)
    truncated_text = raw_text[:8000] if len(raw_text) > 8000 else raw_text

    response = await chain.ainvoke({"text": truncated_text})

    try:
        # Parse LLM response as JSON
        extracted_json = json.loads(response.content)
    except json.JSONDecodeError:
        # Fallback if LLM doesn't return valid JSON
        extracted_json = {
            "supplier": None,
            "total_price": None,
            "delivery_time": None,
            "contact_person": None,
            "line_items": [],
            "payment_terms": None,
            "validity_period": None,
        }

    return {
        "raw_text": raw_text,
        "supplier": extracted_json.get("supplier"),
        "total_price": extracted_json.get("total_price"),
        "delivery_time": extracted_json.get("delivery_time"),
        "contact_person": extracted_json.get("contact_person"),
        "line_items": extracted_json.get("line_items", []),
        "payment_terms": extracted_json.get("payment_terms"),
        "validity_period": extracted_json.get("validity_period"),
    }


def generate_document_id() -> str:
    """Generate unique document ID."""
    return str(uuid.uuid4())
