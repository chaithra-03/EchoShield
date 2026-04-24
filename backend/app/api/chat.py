import json
import structlog
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from app.agents.orchestrator import AgentOrchestrator
from app.rag.vector_store import VectorStore
from app.core.config import get_settings

logger = structlog.get_logger()
router = APIRouter(prefix="/api/chat", tags=["chat"])
settings = get_settings()

# In-memory session store (replace with Redis in production)
_sessions: Dict[str, List[Dict]] = {}


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(..., min_length=1, max_length=100)
    use_web: bool = True
    company: Optional[str] = None


def get_vector_store(request: Request) -> VectorStore:
    return request.app.state.vector_store


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    vector_store: VectorStore = Depends(get_vector_store),
):
    """Stream chat response via Server-Sent Events (SSE)."""
    history = _sessions.get(body.session_id, [])
    orchestrator = AgentOrchestrator(vector_store)

    async def event_generator():
        full_response: List[str] = []

        try:
            async for event in orchestrator.run_stream(
                query=body.query,
                session_id=body.session_id,
                chat_history=history,
                use_web=body.use_web,
                company=body.company,
            ):
                # Collect tokens for session history
                try:
                    raw = event.strip()
                    if raw.startswith("data: "):
                        data = json.loads(raw[6:])
                        if data.get("type") == "token" and data.get("text"):
                            full_response.append(data["text"])
                except Exception:
                    pass
                yield event

        except Exception as e:
            logger.error("chat_stream event_generator error", error=str(e))
            error_event = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {error_event}\n\n"

        # Update session history
        _sessions.setdefault(body.session_id, [])
        _sessions[body.session_id].append({"role": "user", "content": body.query})
        _sessions[body.session_id].append(
            {"role": "assistant", "content": "".join(full_response)}
        )
        # Keep last 20 messages
        _sessions[body.session_id] = _sessions[body.session_id][-20:]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    """Get conversation history for a session."""
    return {"session_id": session_id, "history": _sessions.get(session_id, [])}


@router.delete("/history/{session_id}")
async def clear_history(session_id: str):
    """Clear conversation history for a session."""
    _sessions.pop(session_id, None)
    return {"message": "History cleared", "session_id": session_id}
