import os
import structlog
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "EchoShield"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # API Keys
    GEMINI_API_KEY: str = ""

    # CORS — localhost + deployed frontends
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
    ]
    # Extra origins from env (comma-separated)
    EXTRA_ORIGINS: str = ""

    # Vector DB (path used for numpy-based store)
    VECTOR_DB_DIR: str = "./vector_db"
    VECTOR_DB_COLLECTION_NAME: str = "echoshield_docs"

    # RAG
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    TOP_K_RESULTS: int = 5

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 30

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 20
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".txt", ".md", ".docx"]

    # LLM
    GEMINI_MODEL: str = "gemini-flash-latest"
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    MAX_OUTPUT_TOKENS: int = 2048
    TEMPERATURE: float = 0.7

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


def setup_logging():
    """Configure structlog for structured console logging (compatible with structlog 24.x)."""
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.ExceptionRenderer(),
            structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO level
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
