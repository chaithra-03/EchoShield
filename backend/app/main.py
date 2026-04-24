from contextlib import asynccontextmanager
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings, setup_logging
from app.rag.vector_store import VectorStore
from app.api import chat, documents, health

setup_logging()
logger = structlog.get_logger()
settings = get_settings()

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize shared resources on startup."""
    logger.info("Starting EchoShield backend", version=settings.APP_VERSION)

    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here":
        logger.warning(
            "⚠️  GEMINI_API_KEY is not set! "
            "Edit backend/.env and add your key from https://aistudio.google.com/"
        )

    app.state.vector_store = VectorStore()
    logger.info("Vector store ready", chunks=app.state.vector_store.count())
    yield
    logger.info("Shutting down EchoShield backend")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI PR & Crisis Management Copilot — social sentiment analysis with policy-grounded RAG",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(documents.router)
