# Accordion Backend

Backend service for **Accordion** - an AI-powered procurement support tool that generates comprehensive negotiation briefings using a Multi-Agent System (MAS).

## Overview

Accordion helps procurement professionals prepare for supplier negotiations by:

1. Analyzing procurement offers (PDF upload)
2. Researching the negotiation partner
3. Identifying leverage points and opportunities
4. Generating actionable negotiation briefings

The backend uses a LangGraph-based multi-agent workflow powered by OpenAI GPT-4o to automate the briefing generation process.

## Features

- **PDF Upload & Parsing**: Extract structured data from procurement offers
- **5-Agent LangGraph Workflow**:
  - **Orchestrator**: Validates inputs and controls agent flow
  - **Goal Normalizer**: Structures negotiation goals from freetext input
  - **Research Agent**: Conducts web research on negotiation partner (via Tavily)
  - **Potential Agent**: Identifies leverage points and negotiation opportunities
  - **Briefing Agent**: Creates comprehensive, actionable negotiation briefing
- **Real-time Progress Tracking**: Server-Sent Events (SSE) for live UI updates
- **RESTful API**: FastAPI endpoints for the Next.js frontend

## Tech Stack

- **FastAPI** - Web framework
- **LangGraph + LangChain** - Multi-agent orchestration
- **OpenAI GPT-4o** - LLM for analysis and generation
- **pdfplumber** - PDF text extraction
- **Tavily Search API** - Web research

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
│   │   ├── vector_store.py        # Vector DB (disabled)
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

- Vector database functionality is currently disabled (awaiting new instructions)
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

## License

Hackathon project - MIT License
