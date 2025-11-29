import pdfplumber
import uuid
from typing import Dict, Any, List


async def extract_data_from_docs(file_paths: List[str]) -> Dict[str, Any]:
    """
    Extract structured data from multiple PDF documents.

    Args:
        file_paths: List of paths to PDF files

    Returns:
        Dictionary with extracted data including raw text and structured fields
    """
    all_text_parts = []
    
    for path in file_paths:
        try:
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        all_text_parts.append(text)
        except Exception as e:
            print(f"Error reading {path}: {e}")
            continue

    raw_text = "\n\n--- NEXT DOCUMENT ---\n\n".join(all_text_parts)

    # Use the specialized Data Extraction Agent
    from app.agents.data_extractor import get_extraction_agent

    extraction_agent = get_extraction_agent()
    extracted_data = await extraction_agent.extract(raw_text)

    return {
        "raw_text": raw_text,
        **extracted_data
    }


def generate_document_id() -> str:
    """Generate unique document ID."""
    return str(uuid.uuid4())
