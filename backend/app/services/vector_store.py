import json
from typing import Dict, Any, List
from app.config import get_settings
from app.utils.llm import get_llm
from langchain.prompts import ChatPromptTemplate
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
    Store briefing in Pinecone for RAG queries using Pinecone Inference API.

    Chunks the briefing into sections and generates embeddings using Pinecone's
    hosted multilingual-e5-large model (1024 dimensions).
    Each job_id uses its own namespace for data isolation.

    Args:
        job_id: Job ID (used as vector_db_id and namespace)
        briefing: Briefing dictionary

    Returns:
        Vector DB ID (same as job_id)
    """
    # Get namespace for this job (server-derived, not client-provided)
    namespace = get_namespace_for_job(job_id)

    # Create data records from NEW briefing sections (5 sections)
    data_records = []

    # Record 1: Supplier Summary
    if "supplier_summary" in briefing:
        text = f"Supplier Summary:\n{json.dumps(briefing['supplier_summary'], indent=2)}"
        data_records.append({
            "id": f"{job_id}_supplier_summary",
            "text": text,
            "section": "supplier_summary",
            "job_id": job_id
        })

    # Record 2: Market Analysis
    if "market_analysis" in briefing:
        text = f"Market Analysis:\n{json.dumps(briefing['market_analysis'], indent=2)}"
        data_records.append({
            "id": f"{job_id}_market_analysis",
            "text": text,
            "section": "market_analysis",
            "job_id": job_id
        })

    # Record 3: Offer Analysis
    if "offer_analysis" in briefing:
        text = f"Offer Analysis:\n{json.dumps(briefing['offer_analysis'], indent=2)}"
        data_records.append({
            "id": f"{job_id}_offer_analysis",
            "text": text,
            "section": "offer_analysis",
            "job_id": job_id
        })

    # Record 4: Outcome Assessment
    if "outcome_assessment" in briefing:
        text = f"Outcome Assessment:\n{json.dumps(briefing['outcome_assessment'], indent=2)}"
        data_records.append({
            "id": f"{job_id}_outcome_assessment",
            "text": text,
            "section": "outcome_assessment",
            "job_id": job_id
        })

    # Record 5: Action Items
    if "action_items" in briefing:
        text = f"Action Items:\n{json.dumps(briefing['action_items'], indent=2)}"
        data_records.append({
            "id": f"{job_id}_action_items",
            "text": text,
            "section": "action_items",
            "job_id": job_id
        })

    if not data_records:
        logger.warning(f"No briefing sections to store for job_id={job_id}")
        return job_id

    # Generate embeddings using Pinecone Inference API
    # Uses multilingual-e5-large model (1024 dimensions)
    try:
        texts = [record["text"] for record in data_records]

        # Generate embeddings using Pinecone's hosted model
        embeddings_response = pc.inference.embed(
            model="multilingual-e5-large",
            inputs=texts,
            parameters={
                "input_type": "passage",
                "truncate": "END"
            }
        )

        # Prepare vectors for upsert
        vectors = []
        for i, record in enumerate(data_records):
            vectors.append({
                "id": record["id"],
                "values": embeddings_response[i]["values"],
                "metadata": {
                    "text": record["text"],
                    "section": record["section"],
                    "job_id": record["job_id"]
                }
            })

        # Upsert vectors to Pinecone
        index.upsert(
            vectors=vectors,
            namespace=namespace
        )

        logger.info(f"Successfully stored {len(vectors)} vectors in Pinecone namespace={namespace}")
    except Exception as e:
        logger.error(f"Error upserting to Pinecone: {str(e)}", exc_info=True)
        raise

    return job_id


async def query_briefing_rag(vector_db_id: str, query: str) -> Dict[str, Any]:
    """
    Query the briefing using RAG with Pinecone Inference API.

    Args:
        vector_db_id: Vector DB ID (job_id) - used to derive namespace
        query: User query

    Returns:
        Dictionary with answer and sources
    """
    # Derive namespace from vector_db_id (server-side, not client-provided)
    namespace = get_namespace_for_job(vector_db_id)

    # Generate query embedding using Pinecone Inference API
    try:
        # Generate query embedding using Pinecone's hosted model
        query_embedding_response = pc.inference.embed(
            model="multilingual-e5-large",
            inputs=[query],
            parameters={
                "input_type": "query",
                "truncate": "END"
            }
        )

        # Extract the embedding values
        query_embedding = query_embedding_response[0]["values"]

        # Search Pinecone with the query embedding
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

    if hasattr(results, 'matches') and results.matches:
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
