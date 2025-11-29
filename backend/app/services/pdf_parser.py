import pdfplumber
import uuid
from typing import Dict, Any


async def extract_offer_data(pdf_path: str) -> Dict[str, Any]:
    """
    Extract structured data from PDF offer document using the Data Extraction Agent.

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

    # Use the specialized Data Extraction Agent for better reliability
    from app.agents.data_extractor import get_extraction_agent

    extraction_agent = get_extraction_agent()
    extracted_data = await extraction_agent.extract(raw_text)

    # Combine raw text with extracted structured data
    return {
        "raw_text": raw_text,
        **extracted_data  # Merge extracted fields (supplier, total_price, etc.)
    }


def generate_document_id() -> str:
    """Generate unique document ID."""
    return str(uuid.uuid4())
