from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # OpenAI
    openai_api_key: str

    # Tavily Search
    tavily_api_key: str

    # ElevenLabs
    elevenlabs_api_key: str = ""

    # Pinecone
    pinecone_api_key: str
    pinecone_index_name: str
    # HubSpot
    hubspot_api_key: str

    # App Config
    upload_dir: str = "./uploads"
    max_upload_size: int = 10485760  # 10MB

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
