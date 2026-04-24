import io
import re
import structlog
from typing import List, Dict, Any
from pathlib import Path
from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF bytes using PyPDF2."""
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        text_parts = []
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text_parts.append(f"[Page {page_num + 1}]\n{text}")
        return "\n\n".join(text_parts)
    except Exception as e:
        logger.error("PDF extraction failed", error=str(e))
        raise ValueError(f"Could not parse PDF: {e}")


def extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX bytes."""
    try:
        from docx import Document
        doc = Document(io.BytesIO(content))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except Exception as e:
        logger.error("DOCX extraction failed", error=str(e))
        raise ValueError(f"Could not parse DOCX: {e}")


def extract_text(content: bytes, filename: str) -> str:
    """Route to correct parser based on file extension."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(content)
    elif ext in (".txt", ".md"):
        return content.decode("utf-8", errors="replace")
    elif ext == ".docx":
        return extract_text_from_docx(content)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def chunk_text(text: str, chunk_size: int = None, overlap: int = None) -> List[str]:
    """
    Split text into overlapping chunks by token-approximate word count.
    Uses a sentence-aware splitter to avoid cutting mid-sentence.
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    overlap = overlap or settings.CHUNK_OVERLAP

    # Clean up whitespace
    text = re.sub(r"\n{3,}", "\n\n", text.strip())

    # Split into sentences roughly
    sentences = re.split(r"(?<=[.!?])\s+", text)

    chunks: List[str] = []
    current_chunk: List[str] = []
    current_len = 0

    for sentence in sentences:
        words = sentence.split()
        word_count = len(words)

        if current_len + word_count > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))
            # Keep overlap words
            overlap_words: List[str] = []
            overlap_count = 0
            for sent in reversed(current_chunk):
                sent_words = sent.split()
                if overlap_count + len(sent_words) <= overlap:
                    overlap_words = sent_words + overlap_words
                    overlap_count += len(sent_words)
                else:
                    break
            current_chunk = [" ".join(overlap_words)] if overlap_words else []
            current_len = len(overlap_words)

        current_chunk.append(sentence)
        current_len += word_count

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    logger.info("Text chunked", total_chunks=len(chunks), approx_words=len(text.split()))
    return [c for c in chunks if c.strip()]


def parse_document(content: bytes, filename: str) -> Dict[str, Any]:
    """Full pipeline: extract → chunk → return structured result."""
    text = extract_text(content, filename)
    chunks = chunk_text(text)
    return {
        "filename": filename,
        "text": text,
        "chunks": chunks,
        "chunk_count": len(chunks),
        "char_count": len(text),
    }
