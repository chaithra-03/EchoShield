import hashlib
import google.generativeai as genai
import structlog
from typing import List, Dict, Tuple
from functools import lru_cache
from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class EmbeddingService:
    """
    Embedding service with built-in LRU cache.
    Caches query embeddings to avoid re-embedding identical queries,
    significantly reducing API calls and latency.
    """

    def __init__(self):
        self.model = settings.EMBEDDING_MODEL
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._query_cache: Dict[str, List[float]] = {}
        self._cache_hits = 0
        self._cache_misses = 0
        logger.info("EmbeddingService initialized", model=self.model)

    def embed_text(self, text: str) -> List[float]:
        """Embed a single text string (for documents)."""
        try:
            result = genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_document",
            )
            return result["embedding"]
        except Exception as e:
            logger.error("Embedding failed", error=str(e))
            raise

    def embed_query(self, query: str) -> List[float]:
        """Embed a query string for retrieval (with caching)."""
        cache_key = hashlib.md5(query.encode()).hexdigest()

        if cache_key in self._query_cache:
            self._cache_hits += 1
            logger.debug("Embedding cache HIT", query_preview=query[:40], hits=self._cache_hits)
            return self._query_cache[cache_key]

        try:
            result = genai.embed_content(
                model=self.model,
                content=query,
                task_type="retrieval_query",
            )
            embedding = result["embedding"]

            # Cache the result (limit to 200 entries)
            if len(self._query_cache) >= 200:
                oldest = next(iter(self._query_cache))
                del self._query_cache[oldest]
            self._query_cache[cache_key] = embedding

            self._cache_misses += 1
            logger.debug("Embedding cache MISS", query_preview=query[:40], misses=self._cache_misses)
            return embedding
        except Exception as e:
            logger.error("Query embedding failed", error=str(e))
            raise

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of texts."""
        embeddings = []
        for i, text in enumerate(texts):
            logger.debug("Embedding chunk", index=i, total=len(texts))
            embeddings.append(self.embed_text(text))
        return embeddings

    def get_cache_stats(self) -> Dict[str, int]:
        """Return cache statistics."""
        return {
            "cache_size": len(self._query_cache),
            "cache_hits": self._cache_hits,
            "cache_misses": self._cache_misses,
        }
