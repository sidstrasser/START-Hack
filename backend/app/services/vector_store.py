import json
from typing import Dict, Any, List
from app.config import get_settings
from app.utils.llm import get_llm
from langchain.prompts import ChatPromptTemplate
from langchain_openai import OpenAIEmbeddings
from pinecone import Pinecone
import logging

logger = logging.getLogger(__name__)

# Initialize Pinecone client
settings = get_settings()
pc = Pinecone(api_key=settings.pinecone_api_key)

# Connect to the Accordio index
index = pc.Index(settings.pinecone_index_name)


def get_namespace_for_job(job_id: str) -> str:
    """
    Derive namespace from job_id.
    
    This ensures namespace is always server-derived, not client-provided.
    In the future, this can be extended to include user_id for multi-user support:
    namespace = f"{user_id}_{job_id}" or namespace = user_id
    
    Args:
        job_id: Job ID (unique identifier for each user flow)
        
    Returns:
        Namespace string for Pinecone operations
    """
    return job_id


async def store_briefing_in_vector_db(job_id: str, briefing: Dict[str, Any]) -> str:
    """
    Store briefing in Pinecone for RAG queries.

    Chunks the briefing into sections and stores with embeddings.
    Each job_id uses its own namespace for data isolation.

    Args:
        job_id: Job ID (used as vector_db_id and namespace)
        briefing: Briefing dictionary

    Returns:
        Vector DB ID (same as job_id)
    """
    # Get namespace for this job (server-derived, not client-provided)
    namespace = get_namespace_for_job(job_id)
    
    # Initialize embeddings
    embeddings_model = OpenAIEmbeddings(
        api_key=settings.openai_api_key,
        model="text-embedding-3-small"
    )

    # Create chunks from briefing sections
    vectors_to_upsert = []

    # Chunk 1: Executive Summary
    if "executive_summary" in briefing:
        text = f"Executive Summary:\n{briefing['executive_summary']}"
        section = "executive_summary"
        vector_id = f"{job_id}_exec_summary"
        vectors_to_upsert.append({
            "text": text,
            "section": section,
            "vector_id": vector_id
        })

    # Chunk 2: Supplier Overview
    if "supplier_overview" in briefing:
        text = f"Supplier Overview:\n{json.dumps(briefing['supplier_overview'], indent=2)}"
        section = "supplier_overview"
        vector_id = f"{job_id}_supplier"
        vectors_to_upsert.append({
            "text": text,
            "section": section,
            "vector_id": vector_id
        })

    # Chunk 3: Offer Analysis
    if "offer_analysis" in briefing:
        text = f"Offer Analysis:\n{json.dumps(briefing['offer_analysis'], indent=2)}"
        section = "offer_analysis"
        vector_id = f"{job_id}_offer"
        vectors_to_upsert.append({
            "text": text,
            "section": section,
            "vector_id": vector_id
        })

    # Chunk 4: Negotiation Strategy
    if "negotiation_strategy" in briefing:
        text = f"Negotiation Strategy:\n{json.dumps(briefing['negotiation_strategy'], indent=2)}"
        section = "negotiation_strategy"
        vector_id = f"{job_id}_strategy"
        vectors_to_upsert.append({
            "text": text,
            "section": section,
            "vector_id": vector_id
        })

    # Chunk 5: Key Talking Points
    if "key_talking_points" in briefing:
        text = f"Key Talking Points:\n{json.dumps(briefing['key_talking_points'], indent=2)}"
        section = "talking_points"
        vector_id = f"{job_id}_talking_points"
        vectors_to_upsert.append({
            "text": text,
            "section": section,
            "vector_id": vector_id
        })

    # Chunk 6: Leverage Points
    if "leverage_points" in briefing:
        text = f"Leverage Points:\n{json.dumps(briefing['leverage_points'], indent=2)}"
        section = "leverage_points"
        vector_id = f"{job_id}_leverage"
        vectors_to_upsert.append({
            "text": text,
            "section": section,
            "vector_id": vector_id
        })

    # Chunk 7: Potential Objections
    if "potential_objections" in briefing:
        text = f"Potential Objections:\n{json.dumps(briefing['potential_objections'], indent=2)}"
        section = "objections"
        vector_id = f"{job_id}_objections"
        vectors_to_upsert.append({
            "text": text,
            "section": section,
            "vector_id": vector_id
        })

    # Chunk 8: Risk Assessment
    if "risk_assessment" in briefing:
        text = f"Risk Assessment:\n{json.dumps(briefing['risk_assessment'], indent=2)}"
        section = "risk_assessment"
        vector_id = f"{job_id}_risks"
        vectors_to_upsert.append({
            "text": text,
            "section": section,
            "vector_id": vector_id
        })

    if not vectors_to_upsert:
        logger.warning(f"No briefing sections to store for job_id={job_id}")
        return job_id

    # Generate embeddings for all chunks
    texts = [v["text"] for v in vectors_to_upsert]
    embeddings = await embeddings_model.aembed_documents(texts)

    # Prepare vectors for Pinecone upsert
    pinecone_vectors = []
    for i, vector_data in enumerate(vectors_to_upsert):
        pinecone_vectors.append({
            "id": vector_data["vector_id"],
            "values": embeddings[i],
            "metadata": {
                "text": vector_data["text"],
                "user": job_id,  # Using job_id as user identifier
                "flow": job_id,  # Using job_id as flow identifier
                "section": vector_data["section"],
                "job_id": job_id
            }
        })

    # Upsert into Pinecone with namespace
    try:
        index.upsert(vectors=pinecone_vectors, namespace=namespace)
        logger.info(f"Successfully stored {len(pinecone_vectors)} vectors in Pinecone namespace={namespace}")
    except Exception as e:
        logger.error(f"Error upserting to Pinecone: {str(e)}", exc_info=True)
        raise

    return job_id


async def query_briefing_rag(vector_db_id: str, query: str) -> Dict[str, Any]:
    """
    Query the briefing using RAG.

    Args:
        vector_db_id: Vector DB ID (job_id) - used to derive namespace
        query: User query

    Returns:
        Dictionary with answer and sources
    """
    # Derive namespace from vector_db_id (server-side, not client-provided)
    namespace = get_namespace_for_job(vector_db_id)
    
    # Initialize embeddings
    embeddings_model = OpenAIEmbeddings(
        api_key=settings.openai_api_key,
        model="text-embedding-3-small"
    )

    # Generate query embedding
    query_embedding = await embeddings_model.aembed_query(query)
    
    # Ensure embedding is a list (Pinecone expects list format)
    if not isinstance(query_embedding, list):
        query_embedding = list(query_embedding)

    # Search Pinecone
    try:
        results = index.query(
            vector=query_embedding,
            top_k=3,
            namespace=namespace,
            include_metadata=True
        )
    except Exception as e:
        logger.error(f"Error querying Pinecone: {str(e)}", exc_info=True)
        return {
            "answer": "Error querying the briefing database.",
            "sources": []
        }

    # Extract documents and metadata from results
    documents = []
    metadatas = []
    
    if results.matches:
        for match in results.matches:
            if match.metadata:
                documents.append(match.metadata.get("text", ""))
                metadatas.append(match.metadata)
    
    if not documents:
        return {
            "answer": "No relevant information found in the briefing.",
            "sources": []
        }

    # Use LLM to generate answer
    llm = get_llm(temperature=0.3)

    rag_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful assistant answering questions about a negotiation briefing.
Use the provided context to answer the question accurately and concisely.
If the context doesn't contain enough information, say so."""),
        ("user", """Context from briefing:
{context}

Question: {question}

Answer:""")
    ])

    chain = rag_prompt | llm

    context = "\n\n".join(documents)

    response = await chain.ainvoke({
        "context": context,
        "question": query
    })

    # Extract sources
    sources = [meta.get("section", "unknown") for meta in metadatas]

    return {
        "answer": response.content,
        "sources": sources
    }
