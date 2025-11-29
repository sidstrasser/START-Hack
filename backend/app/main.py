from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from app.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Create FastAPI app
app = FastAPI(
    title="Negotiation Briefing MAS API",
    description="Multi-Agent System for automated negotiation briefing generation",
    version="1.0.0",
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize app on startup."""
    settings = get_settings()

    # Create upload directory if not exists
    os.makedirs(settings.upload_dir, exist_ok=True)

    # Initialize Pinecone connection
    try:
        from pinecone import Pinecone
        pc = Pinecone(api_key=settings.pinecone_api_key)
        index = pc.Index(settings.pinecone_index_name)
        # Test connection
        index.describe_index_stats()
        print("✅ Negotiation Briefing MAS API started")
        print(f"📁 Upload directory: {settings.upload_dir}")
        print(f"🔍 Pinecone index: {settings.pinecone_index_name}")
    except Exception as e:
        print(f"⚠️  Warning: Could not connect to Pinecone: {str(e)}")
        print("✅ Negotiation Briefing MAS API started (Pinecone connection will be retried on first use)")
        print(f"📁 Upload directory: {settings.upload_dir}")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "message": "Negotiation Briefing MAS API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    settings = get_settings()
    pinecone_status = "unknown"
    try:
        from pinecone import Pinecone
        pc = Pinecone(api_key=settings.pinecone_api_key)
        index = pc.Index(settings.pinecone_index_name)
        stats = index.describe_index_stats()
        pinecone_status = "connected"
    except Exception as e:
        pinecone_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "upload_dir_exists": os.path.exists(settings.upload_dir),
        "pinecone_index": settings.pinecone_index_name,
        "pinecone_status": pinecone_status,
    }


# Import and include API routes
from app.api.routes import router as api_router
from app.api.elevenlabs_routes import router as elevenlabs_router
app.include_router(api_router, prefix="/api")
app.include_router(elevenlabs_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
