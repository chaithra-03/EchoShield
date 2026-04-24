from fastapi import APIRouter, Request
from app.core.config import get_settings

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health")
async def health_check(request: Request):
    """Health check endpoint with vector store and cache stats."""
    try:
        vs = request.app.state.vector_store
        stats = vs.get_stats()
        cache_stats = vs.embedding_service.get_cache_stats()
        vs_status = "ok"
    except Exception as e:
        stats = {}
        cache_stats = {}
        vs_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "app": settings.APP_NAME,
        "vector_store": vs_status,
        "vector_store_stats": stats,
        "embedding_cache": cache_stats,
        "gemini_model": settings.GEMINI_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
    }


@router.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "AI PR & Crisis Management Copilot",
        "docs": "/docs",
        "health": "/health",
    }
