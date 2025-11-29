from langchain_openai import ChatOpenAI
from app.config import get_settings


def get_llm(temperature: float = 0.7, model: str = "gpt-4o"):
    """Get configured LLM instance."""
    settings = get_settings()
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        api_key=settings.openai_api_key,
    )
