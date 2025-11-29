# Negotiation Briefing MAS Backend

Multi-Agent System (MAS) for automated negotiation briefing generation using LangGraph, OpenAI GPT-4o, and Pinecone.

## Features

- **PDF Upload & Parsing**: Extract structured data from procurement offers
- **5-Agent LangGraph Workflow**:
  - Orchestrator: Validates inputs and controls flow
  - Goal Normalizer: Structures negotiation goals from freetext
  - Research Agent: Web research on negotiation partner (Tavily)
  - Potential Agent: Identifies leverage points and opportunities
  - Briefing Agent: Creates comprehensive negotiation briefing
- **Real-time Progress Tracking**: Server-Sent Events (SSE) for live updates
- **Vector Database**: Pinecone for RAG queries during calls with namespace isolation
- **RESTful API**: FastAPI endpoints for Next.js frontend

## Tech Stack

- FastAPI
- LangGraph + LangChain
- OpenAI GPT-4o
- Pinecone (cloud vector database)
- pdfplumber
- Tavily Search API

## Setup

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Variables

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env`:
```env
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=Accordio
```

### 3. Run the Server

```bash
# From backend/ directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server runs at: http://localhost:8000

API Docs: http://localhost:8000/docs

## API Endpoints

### 1. Upload PDF
```bash
POST /api/upload-pdf
Content-Type: multipart/form-data

# Response
{
  "document_id": "uuid",
  "extracted_data": {...}
}
```

### 2. Generate Briefing
```bash
POST /api/generate-briefing
Content-Type: application/json

{
  "document_id": "uuid",
  "additional_context": {}
}

# Response
{
  "job_id": "uuid"
}
```

### 3. Stream Progress (SSE)
```bash
GET /api/progress/{job_id}

# Server-Sent Events stream
data: {"agent": "orchestrator", "status": "running", "message": "...", "progress": 0.1}
data: {"agent": "goal_normalizer", "status": "completed", "message": "...", "progress": 0.3}
...
```

### 4. Get Briefing
```bash
GET /api/briefing/{job_id}

# Response
{
  "briefing": {...},
  "status": "completed",
  "vector_db_id": "uuid"
}
```

### 5. Query Briefing (RAG)
```bash
POST /api/query-briefing
Content-Type: application/json

{
  "vector_db_id": "uuid",
  "query": "What are the key leverage points?"
}

# Response
{
  "answer": "...",
  "sources": ["negotiation_strategy", "leverage_points"]
}
```

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app
│   ├── config.py                  # Settings
│   ├── api/
│   │   ├── routes.py              # API endpoints
│   │   └── models.py              # Pydantic models
│   ├── services/
│   │   ├── pdf_parser.py          # PDF extraction
│   │   ├── vector_store.py        # Pinecone + RAG
│   │   ├── progress_tracker.py    # SSE progress
│   │   └── mas_pipeline.py        # MAS orchestration
│   ├── agents/
│   │   ├── graph.py               # LangGraph definition
│   │   ├── state.py               # Shared state
│   │   ├── orchestrator.py
│   │   ├── goal_normalizer.py
│   │   ├── research.py
│   │   ├── potential.py
│   │   └── briefing.py
│   └── utils/
│       └── llm.py                 # LLM setup
├── uploads/                       # PDF uploads
└── requirements.txt
```

## Development

### Test Upload Endpoint
```bash
curl -X POST -F "file=@test.pdf" http://localhost:8000/api/upload-pdf
```

### Test Full Pipeline
```python
import requests

# 1. Upload PDF
response = requests.post(
    "http://localhost:8000/api/upload-pdf",
    files={"file": open("offer.pdf", "rb")}
)
doc_id = response.json()["document_id"]

# 2. Generate briefing
response = requests.post(
    "http://localhost:8000/api/generate-briefing",
    json={"document_id": doc_id}
)
job_id = response.json()["job_id"]

# 3. Stream progress
import sseclient  # pip install sseclient-py
response = requests.get(f"http://localhost:8000/api/progress/{job_id}", stream=True)
client = sseclient.SSEClient(response)
for event in client.events():
    print(event.data)
```

## Notes

- Pinecone provides cloud-based vector storage with namespace isolation per user flow
- Each job_id uses its own namespace to ensure data isolation
- Background tasks use FastAPI's built-in BackgroundTasks (no Celery needed)
- Progress tracking via in-memory queues (sufficient for hackathon)
- For production: Add database, job queue (Redis), authentication

## Troubleshooting

**Issue**: `ModuleNotFoundError`
- Make sure virtual environment is activated
- Run `pip install -r requirements.txt`

**Issue**: OpenAI API errors
- Check your API key in `.env`
- Verify you have credits

**Issue**: Tavily search fails
- Check Tavily API key
- Research agent will use fallback data if search fails

**Issue**: Pinecone connection errors
- Check your Pinecone API key in `.env`
- Verify the index name matches your Pinecone index (default: "Accordio")
- Ensure the index exists in your Pinecone project

## License

Hackathon project - MIT License
