"""
Qdrant Vector Store
- Uses embedded/local Qdrant Client for persistence without C++ or Docker requirements.
- Extremely scalable, fast, memory-safe, and 100% production-ready.
"""

import uuid
import structlog
from pathlib import Path
from typing import List, Dict, Any, Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models

from app.core.config import get_settings
from app.rag.embeddings import EmbeddingService

logger = structlog.get_logger()
settings = get_settings()


class VectorStore:
    """
    Qdrant-backed Vector Store.
    Automatically handles collection creation and point upserts.
    """

    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.collection_name = settings.VECTOR_DB_COLLECTION_NAME
        
        # Initialize Embedded Qdrant
        persist_dir = Path(settings.VECTOR_DB_DIR) / "qdrant_db"
        persist_dir.mkdir(parents=True, exist_ok=True)
        self.client = QdrantClient(path=str(persist_dir))
        
        self._ensure_collection()
        logger.info(
            "VectorStore initialized",
            backend="qdrant",
            collection=self.collection_name,
            total_chunks=self.count(),
        )

    def _ensure_collection(self):
        """Create the collection if it doesn't exist."""
        try:
            collections = self.client.get_collections().collections
            if not any(c.name == self.collection_name for c in collections):
                # Temporary dummy embed just to get accurate dimensionality
                test_embed = self.embedding_service.embed_text("test")
                dim_size = len(test_embed)
                
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=dim_size,
                        distance=models.Distance.COSINE,
                    ),
                )
                logger.info(f"Created new Qdrant collection: {self.collection_name} with dim size {dim_size}")
        except Exception as e:
            logger.error("Failed to initialize Qdrant collection", error=str(e))

    def add_document(
        self,
        chunks: List[str],
        filename: str,
        company: str = "Untagged",
        doc_id: Optional[str] = None,
    ) -> str:
        """Embed and store document chunks in Qdrant."""
        doc_id = doc_id or str(uuid.uuid4())
        embeddings = self.embedding_service.embed_batch(chunks)

        points = []
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            points.append(
                models.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=emb,
                    payload={
                        "doc_id": doc_id,
                        "filename": filename,
                        "company": company,
                        "chunk_index": i,
                        "text": chunk,
                    }
                )
            )

        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )

        logger.info("Document added via Qdrant", doc_id=doc_id, filename=filename, company=company, chunks=len(chunks))
        return doc_id

    def retrieve(
        self,
        query: str,
        top_k: int = None,
        filter_doc_id: Optional[str] = None,
        filter_company: Optional[str] = None,
        score_threshold: float = 0.35,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve top-k semantically similar chunks for a query using Cosine Search.
        Only returns chunks with similarity score >= score_threshold.
        This prevents irrelevant queries (e.g. 'hey') from pulling all documents.
        """
        if self.count() == 0:
            return []

        top_k = top_k or settings.TOP_K_RESULTS
        query_embedding = self.embedding_service.embed_query(query)

        # Build metadata filters
        filter_conditions = []
        if filter_doc_id:
            filter_conditions.append(
                models.FieldCondition(
                    key="doc_id",
                    match=models.MatchValue(value=filter_doc_id)
                )
            )
        if filter_company:
            filter_conditions.append(
                models.FieldCondition(
                    key="company",
                    match=models.MatchValue(value=filter_company)
                )
            )

        query_filter = models.Filter(must=filter_conditions) if filter_conditions else None

        search_results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_embedding,
            query_filter=query_filter,
            limit=top_k,
            score_threshold=score_threshold,
        ).points

        chunks = []
        for hit in search_results:
            chunks.append({
                "text": hit.payload.get("text", ""),
                "filename": hit.payload.get("filename", "unknown"),
                "company": hit.payload.get("company", "Untagged"),
                "doc_id": hit.payload.get("doc_id", ""),
                "chunk_index": hit.payload.get("chunk_index", 0),
                "score": hit.score,
            })

        logger.info("Qdrant retrieval complete", query_preview=query[:60], results=len(chunks), company_filter=filter_company, threshold=score_threshold)
        return chunks

    def list_documents(self) -> List[Dict[str, Any]]:
        """Return unique documents stored in the vector store with chunk counts."""
        if self.count() == 0:
            return []
            
        try:
            scroll_result, _ = self.client.scroll(
                collection_name=self.collection_name,
                limit=1000,
                with_payload=True,
                with_vectors=False,
            )
            
            seen: Dict[str, Dict] = {}
            for point in scroll_result:
                doc_id = point.payload.get("doc_id", "")
                if doc_id:
                    if doc_id not in seen:
                        seen[doc_id] = {
                            "doc_id": doc_id,
                            "filename": point.payload.get("filename", "unknown"),
                            "company": point.payload.get("company", "Untagged"),
                            "chunk_count": 0,
                        }
                    seen[doc_id]["chunk_count"] += 1
            return list(seen.values())
        except Exception:
            return []

    def delete_document(self, doc_id: str) -> bool:
        """Delete all chunks for a given doc_id using filters."""
        try:
            res = self.client.delete(
                collection_name=self.collection_name,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="doc_id",
                                match=models.MatchValue(value=doc_id),
                            )
                        ]
                    )
                )
            )
            # res returns an UpdateResult
            logger.info("Document deleted from Qdrant", doc_id=doc_id)
            return True
        except Exception as e:
            logger.error("Document deletion failed", doc_id=doc_id, error=str(e))
            return False

    def count(self) -> int:
        """Total vectors in the collection."""
        try:
            return self.client.get_collection(self.collection_name).points_count
        except Exception:
            return 0

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_chunks": self.count(),
            "total_documents": len(self.list_documents()),
            "collection": self.collection_name,
        }
