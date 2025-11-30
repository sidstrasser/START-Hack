"""
PDF Text Extractor - Simple text extraction from PDFs without structured parsing.
"""

import pdfplumber
from typing import List
import logging

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract raw text from a single PDF file.

    Args:
        file_path: Path to PDF file

    Returns:
        Raw text content
    """
    try:
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)

        return "\n\n".join(text_parts)

    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {e}")
        return ""


def extract_text_from_pdfs(file_paths: List[str]) -> List[str]:
    """
    Extract raw text from multiple PDF files.

    Args:
        file_paths: List of PDF file paths

    Returns:
        List of text contents (one per PDF)
    """
    texts = []
    for path in file_paths:
        text = extract_text_from_pdf(path)
        texts.append(text)

    return texts
