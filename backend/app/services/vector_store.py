import chromadb
from chromadb.config import Settings
import json
from typing import Dict, Any, List
from app.config import get_settings
from app.utils.llm import get_llm
from langchain.prompts import ChatPromptTemplate
from langchain_openai import OpenAIEmbeddings

# Initialize ChromaDB client
settings = get_settings()
client = chromadb.PersistentClient(path=settings.chroma_db_path)

# Get or create collection
collection = client.get_or_create_collection(
    name="briefings",
    metadata={"description": "Negotiation briefings for RAG"}
)


async def store_briefing_in_vector_db(job_id: str, briefing: Dict[str, Any]) -> str:
    """
    Store briefing in ChromaDB for RAG queries.

    Chunks the briefing into sections and stores with embeddings.

    Args:
        job_id: Job ID (used as vector_db_id)
        briefing: Briefing dictionary

    Returns:
        Vector DB ID (same as job_id)
    """
    # Initialize embeddings
    embeddings_model = OpenAIEmbeddings(
        api_key=settings.openai_api_key,
        model="text-embedding-3-small"
    )

    # Create chunks from briefing sections
    chunks = []
    metadatas = []
    ids = []

    # Chunk 1: Executive Summary
    if "executive_summary" in briefing:
        chunks.append(f"Executive Summary:\n{briefing['executive_summary']}")
        metadatas.append({"job_id": job_id, "section": "executive_summary"})
        ids.append(f"{job_id}_exec_summary")

    # Chunk 2: Supplier Overview
    if "supplier_overview" in briefing:
        supplier_text = f"Supplier Overview:\n{json.dumps(briefing['supplier_overview'], indent=2)}"
        chunks.append(supplier_text)
        metadatas.append({"job_id": job_id, "section": "supplier_overview"})
        ids.append(f"{job_id}_supplier")

    # Chunk 3: Offer Analysis
    if "offer_analysis" in briefing:
        offer_text = f"Offer Analysis:\n{json.dumps(briefing['offer_analysis'], indent=2)}"
        chunks.append(offer_text)
        metadatas.append({"job_id": job_id, "section": "offer_analysis"})
        ids.append(f"{job_id}_offer")

    # Chunk 4: Negotiation Strategy
    if "negotiation_strategy" in briefing:
        strategy_text = f"Negotiation Strategy:\n{json.dumps(briefing['negotiation_strategy'], indent=2)}"
        chunks.append(strategy_text)
        metadatas.append({"job_id": job_id, "section": "negotiation_strategy"})
        ids.append(f"{job_id}_strategy")

    # Chunk 5: Key Talking Points
    if "key_talking_points" in briefing:
        talking_points_text = f"Key Talking Points:\n{json.dumps(briefing['key_talking_points'], indent=2)}"
        chunks.append(talking_points_text)
        metadatas.append({"job_id": job_id, "section": "talking_points"})
        ids.append(f"{job_id}_talking_points")

    # Chunk 6: Leverage Points
    if "leverage_points" in briefing:
        leverage_text = f"Leverage Points:\n{json.dumps(briefing['leverage_points'], indent=2)}"
        chunks.append(leverage_text)
        metadatas.append({"job_id": job_id, "section": "leverage_points"})
        ids.append(f"{job_id}_leverage")

    # Chunk 7: Potential Objections
    if "potential_objections" in briefing:
        objections_text = f"Potential Objections:\n{json.dumps(briefing['potential_objections'], indent=2)}"
        chunks.append(objections_text)
        metadatas.append({"job_id": job_id, "section": "objections"})
        ids.append(f"{job_id}_objections")

    # Chunk 8: Risk Assessment
    if "risk_assessment" in briefing:
        risk_text = f"Risk Assessment:\n{json.dumps(briefing['risk_assessment'], indent=2)}"
        chunks.append(risk_text)
        metadatas.append({"job_id": job_id, "section": "risk_assessment"})
        ids.append(f"{job_id}_risks")

    # Generate embeddings
    embeddings = await embeddings_model.aembed_documents(chunks)

    # Store in ChromaDB
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )

    return job_id


async def query_briefing_rag(vector_db_id: str, query: str) -> Dict[str, Any]:
    """
    Query the briefing using RAG.

    Args:
        vector_db_id: Vector DB ID (job_id)
        query: User query

    Returns:
        Dictionary with answer and sources
    """
    # Initialize embeddings
    embeddings_model = OpenAIEmbeddings(
        api_key=settings.openai_api_key,
        model="text-embedding-3-small"
    )

    # Generate query embedding
    query_embedding = await embeddings_model.aembed_query(query)

    # Search ChromaDB
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=3,
        where={"job_id": vector_db_id}
    )

    # Extract documents
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

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
