"""
Parse Agent - First node in the negotiation briefing pipeline.

Responsibilities:
1. Validate all required inputs
2. Parse alternatives PDF (if provided) to extract supplier list
3. Structure all inputs into ParsedInput format
"""

import logging
from typing import List
from langchain_core.runnables import RunnableConfig
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser

from app.agents.state import NegotiationState
from app.agents.schemas import ParsedInput, FormData, AlternativeSupplier
from app.utils.llm import get_llm
from app.services.progress_tracker import get_progress_tracker

logger = logging.getLogger(__name__)
progress_tracker = get_progress_tracker()


async def parse_node(state: NegotiationState, config: RunnableConfig) -> NegotiationState:
    """
    Parse and validate all inputs.

    Flow:
    1. Validate required inputs (supplier_offer_pdf, form_data)
    2. Extract alternatives from PDF if provided
    3. Build ParsedInput structure
    4. Update state and progress

    Args:
        state: Current negotiation state
        config: Runnable config

    Returns:
        Updated state with parsed_input populated
    """
    job_id = state["job_id"]
    logger.info(f"[PARSE] Starting parse node for job_id={job_id}")

    # Publish progress event
    await progress_tracker.publish(job_id, {
        "agent": "parse",
        "status": "running",
        "message": "Starting input validation...",
        "detail": "Checking required documents and form data",
        "progress": 0.05
    })

    # ========================================================================
    # STEP 1: VALIDATE REQUIRED INPUTS (3 document types)
    # ========================================================================
    if not state.get("supplier_offer_pdf"):
        error_msg = "Missing supplier offer PDF text"
        logger.error(f"[PARSE] {error_msg}")
        state["errors"].append(error_msg)
        await progress_tracker.publish(job_id, {
            "agent": "parse",
            "status": "error",
            "message": error_msg,
            "progress": 0.1
        })
        return state

    if not state.get("initial_request_pdf"):
        error_msg = "Missing initial request PDF text"
        logger.error(f"[PARSE] {error_msg}")
        state["errors"].append(error_msg)
        await progress_tracker.publish(job_id, {
            "agent": "parse",
            "status": "error",
            "message": error_msg,
            "progress": 0.1
        })
        return state

    if not state.get("form_data"):
        error_msg = "Missing form data"
        logger.error(f"[PARSE] {error_msg}")
        state["errors"].append(error_msg)
        await progress_tracker.publish(job_id, {
            "agent": "parse",
            "status": "error",
            "message": error_msg,
            "progress": 0.1
        })
        return state

    # Validate form_data structure
    try:
        form_data = FormData(**state["form_data"])
    except Exception as e:
        error_msg = f"Invalid form data: {str(e)}"
        logger.error(f"[PARSE] {error_msg}")
        state["errors"].append(error_msg)
        await progress_tracker.publish(job_id, {
            "agent": "parse",
            "status": "error",
            "message": error_msg,
            "progress": 0.1
        })
        return state

    logger.info(f"[PARSE] Inputs validated successfully")

    await progress_tracker.publish(job_id, {
        "agent": "parse",
        "status": "running",
        "message": "Validation complete",
        "detail": f"Processing supplier: {form_data.supplier_name}",
        "progress": 0.08
    })

    # ========================================================================
    # STEP 2: EXTRACT ALTERNATIVES FROM PDF (IF PROVIDED)
    # ========================================================================
    alternatives: List[AlternativeSupplier] = []

    if state.get("alternatives_pdf"):
        logger.info(f"[PARSE] Extracting alternatives from PDF")
        await progress_tracker.publish(job_id, {
            "agent": "parse",
            "status": "running",
            "message": "Analyzing alternatives document...",
            "detail": "Using AI to extract competitor information",
            "progress": 0.10
        })

        try:
            alternatives = await extract_alternatives_from_pdf(state["alternatives_pdf"])
            logger.info(f"[PARSE] Extracted {len(alternatives)} alternative suppliers")
            await progress_tracker.publish(job_id, {
                "agent": "parse",
                "status": "running",
                "message": f"Found {len(alternatives)} alternative suppliers",
                "detail": "Structuring competitor data for analysis",
                "progress": 0.12
            })
        except Exception as e:
            # Don't fail the pipeline if alternatives extraction fails
            logger.warning(f"[PARSE] Failed to extract alternatives: {str(e)}")
            alternatives = []
    else:
        logger.info(f"[PARSE] No alternatives PDF provided")

    # ========================================================================
    # STEP 3: BUILD PARSED INPUT
    # ========================================================================
    await progress_tracker.publish(job_id, {
        "agent": "parse",
        "status": "running",
        "message": "Building structured data...",
        "detail": "Finalizing input preparation for analysis",
        "progress": 0.13
    })

    parsed_input = ParsedInput(
        supplier_offer_text=state["supplier_offer_pdf"],
        initial_request_text=state["initial_request_pdf"],
        alternatives_text=state.get("alternatives_pdf"),  # Store full PDF text for agent analysis
        alternatives=alternatives,  # Store structured list of suppliers
        form_data=form_data
    )

    # Update state
    state["parsed_input"] = parsed_input.dict()
    state["current_agent"] = "parse"
    state["progress"] = 0.15

    logger.info(f"[PARSE] Parse node completed successfully")
    await progress_tracker.publish(job_id, {
        "agent": "parse",
        "status": "completed",
        "message": "✓ Input validation & parsing complete",
        "detail": f"Ready to analyze {form_data.supplier_name}",
        "progress": 0.15
    })

    return state


async def extract_alternatives_from_pdf(pdf_text: str) -> List[AlternativeSupplier]:
    """
    Extract structured list of alternative suppliers from PDF text.

    Uses LLM with temperature=0 for deterministic extraction.

    Args:
        pdf_text: Raw text from alternatives PDF

    Returns:
        List of AlternativeSupplier objects
    """
    logger.info("[PARSE] Starting LLM-based alternatives extraction")

    # Define parser
    parser = PydanticOutputParser(pydantic_object=List[AlternativeSupplier])

    # Build prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert at extracting structured information from documents.
Extract a list of alternative suppliers from the provided text.

For each supplier, extract:
- name (required): The company name
- description (optional): What product/service they offer
- contact (optional): Email, phone, or website

{format_instructions}

If the document doesn't contain any supplier information, return an empty list."""),
        ("user", "Document text:\n\n{text}")
    ])

    # Get LLM with temperature=0 for deterministic extraction
    llm = get_llm(temperature=0.0)

    # Build chain
    chain = prompt | llm | parser

    # Execute
    try:
        result = await chain.ainvoke({
            "text": pdf_text[:4000],  # Limit text length to avoid token limits
            "format_instructions": parser.get_format_instructions()
        })

        # Handle both list and single object returns
        if isinstance(result, list):
            return result
        else:
            return [result] if result else []

    except Exception as e:
        logger.error(f"[PARSE] LLM extraction failed: {str(e)}")
        # Return empty list on failure rather than raising
        return []
