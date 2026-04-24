import json
import structlog
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.agents.research_agent import ResearchAgent, WriterAgent  # noqa: F401
from app.rag.vector_store import VectorStore

logger = structlog.get_logger()


class AgentOrchestrator:
    """
    Orchestrates the multi-agent pipeline:
    1. Research Agent  → Gather RAG + web context
    2. Writer Agent    → Stream synthesized answer
    
    Emits structured SSE events for real-time UI updates.
    """

    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.research_agent = ResearchAgent(vector_store)
        self.writer_agent = WriterAgent()

    async def run_stream(
        self,
        query: str,
        session_id: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        use_web: bool = True,
        company: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Full orchestrated pipeline yielding SSE-formatted events.
        Event types: agent_step | token | sources | error | done
        """
        chat_history = chat_history or []

        try:
            # ─── Step 1: Research ───────────────────────────────────────────
            yield self._event("agent_step", {
                "step": "research",
                "status": "running",
                "message": "🔍 Scanning social media & internal policies...",
            })

            research = await self.research_agent.run(query, use_web=use_web, company=company)

            rag_count = len(research["rag_chunks"])
            web_count = len(research["web_results"])

            yield self._event("agent_step", {
                "step": "research",
                "status": "done",
                "message": f"✅ Sentiment scan complete — {rag_count} policy chunks, {web_count} social results",
                "rag_chunks": rag_count,
                "web_results": web_count,
            })

            # ─── Step 2: Emit sources ───────────────────────────────────────
            sources = self._build_sources(research)
            if sources:
                yield self._event("sources", {"sources": sources})

            # ─── Step 3: Write ──────────────────────────────────────────────
            yield self._event("agent_step", {
                "step": "write",
                "status": "running",
                "message": "✍️ Drafting crisis response...",
            })

            async for token in self.writer_agent.stream(query, research, chat_history):
                yield self._event("token", {"text": token})

            yield self._event("agent_step", {
                "step": "write",
                "status": "done",
                "message": "✅ Response complete",
            })

            yield self._event("done", {"session_id": session_id})

        except Exception as e:
            logger.error("Orchestrator error", error=str(e), session_id=session_id)
            yield self._event("error", {"message": str(e)})

    def _event(self, event_type: str, data: Dict[str, Any]) -> str:
        """Format as SSE event string."""
        payload = json.dumps({"type": event_type, **data})
        return f"data: {payload}\n\n"

    def _build_sources(self, research: Dict[str, Any]) -> List[Dict[str, Any]]:
        sources = []
        for chunk in research.get("rag_chunks", []):
            sources.append({
                "type": "document",
                "title": chunk["filename"],
                "snippet": chunk["text"][:200],
                "score": chunk["score"],
                "url": None,
            })
        for result in research.get("web_results", [])[:3]:
            sources.append({
                "type": "web",
                "title": result.get("title", "Web Source"),
                "snippet": result.get("snippet", "")[:200],
                "url": result.get("url", ""),
                "score": None,
            })
        return sources
