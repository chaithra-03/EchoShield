import structlog
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException, Depends
from pathlib import Path
from app.rag.vector_store import VectorStore
from app.tools.document_parser import parse_document
from app.core.config import get_settings

logger = structlog.get_logger()
router = APIRouter(prefix="/api/documents", tags=["documents"])
settings = get_settings()

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def get_vector_store(request: Request) -> VectorStore:
    return request.app.state.vector_store


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    company: str = Form(""),
    vector_store: VectorStore = Depends(get_vector_store),
):
    """Upload, parse, and index a document into the vector store."""
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {settings.ALLOWED_EXTENSIONS}",
        )

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE_MB} MB",
        )

    try:
        parsed = parse_document(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not parsed["chunks"]:
        raise HTTPException(status_code=422, detail="No text could be extracted from this file.")

    company_name = company.strip() if company else "Untagged"

    doc_id = vector_store.add_document(
        chunks=parsed["chunks"],
        filename=file.filename,
        company=company_name,
    )

    logger.info(
        "Document uploaded",
        filename=file.filename,
        company=company_name,
        doc_id=doc_id,
        chunks=parsed["chunk_count"],
    )

    return {
        "doc_id": doc_id,
        "filename": file.filename,
        "company": company_name,
        "chunk_count": parsed["chunk_count"],
        "char_count": parsed["char_count"],
        "message": f"Successfully indexed {parsed['chunk_count']} chunks from '{file.filename}' for {company_name}",
    }


@router.get("/")
@router.get("/list")
async def list_documents(vector_store: VectorStore = Depends(get_vector_store)):
    """List all indexed documents."""
    docs = vector_store.list_documents()
    stats = vector_store.get_stats()
    return {"documents": docs, "stats": stats}


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, vector_store: VectorStore = Depends(get_vector_store)):
    """Delete a document and all its chunks from the vector store."""
    success = vector_store.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")
    return {"message": f"Document '{doc_id}' deleted successfully"}
