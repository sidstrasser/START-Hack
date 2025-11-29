#!/usr/bin/env python3
"""
Quick setup test script to verify all imports work.
"""

print("Testing imports...")

try:
    import fastapi
    print("✅ FastAPI")
except ImportError as e:
    print(f"❌ FastAPI: {e}")

try:
    import uvicorn
    print("✅ Uvicorn")
except ImportError as e:
    print(f"❌ Uvicorn: {e}")

try:
    import pydantic
    print("✅ Pydantic")
except ImportError as e:
    print(f"❌ Pydantic: {e}")

try:
    import langgraph
    print("✅ LangGraph")
except ImportError as e:
    print(f"❌ LangGraph: {e}")

try:
    import langchain
    print("✅ LangChain")
except ImportError as e:
    print(f"❌ LangChain: {e}")

try:
    import openai
    print("✅ OpenAI")
except ImportError as e:
    print(f"❌ OpenAI: {e}")

try:
    import chromadb
    print("✅ ChromaDB")
except ImportError as e:
    print(f"❌ ChromaDB: {e}")

try:
    import pdfplumber
    print("✅ pdfplumber")
except ImportError as e:
    print(f"❌ pdfplumber: {e}")

try:
    import tavily
    print("✅ Tavily")
except ImportError as e:
    print(f"❌ Tavily: {e}")

print("\n" + "="*50)
print("Testing app imports...")

try:
    from app.config import get_settings
    print("✅ app.config")
except ImportError as e:
    print(f"❌ app.config: {e}")

try:
    from app.utils.llm import get_llm
    print("✅ app.utils.llm")
except ImportError as e:
    print(f"❌ app.utils.llm: {e}")

try:
    from app.agents.state import NegotiationState
    print("✅ app.agents.state")
except ImportError as e:
    print(f"❌ app.agents.state: {e}")

try:
    from app.agents.graph import negotiation_graph
    print("✅ app.agents.graph")
except ImportError as e:
    print(f"❌ app.agents.graph: {e}")

try:
    from app.services.progress_tracker import progress_tracker
    print("✅ app.services.progress_tracker")
except ImportError as e:
    print(f"❌ app.services.progress_tracker: {e}")

try:
    from app.api.routes import router
    print("✅ app.api.routes")
except ImportError as e:
    print(f"❌ app.api.routes: {e}")

print("\n" + "="*50)
print("All imports successful! Ready to run.")
print("\nNext steps:")
print("1. Copy .env.example to .env and add your API keys")
print("2. Run: uvicorn app.main:app --reload")
