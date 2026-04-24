"""
ResearchAgent + WriterAgent
- ResearchAgent: RAG retrieval + web search
- WriterAgent: streams Gemini response using asyncio.to_thread to avoid blocking the event loop
"""

import asyncio
import structlog
from typing import AsyncGenerator, List, Dict, Any
from app.core.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class ResearchAgent:
    """Gathers context via RAG + optional web search."""

    def __init__(self, vector_store):
        self.vector_store = vector_store

    async def run(self, query: str, use_web: bool = True, company: str = None) -> Dict[str, Any]:
        from app.tools.web_search import web_search, format_search_results
        import asyncio

        result = {
            "rag_chunks": [],
            "web_results": [],
            "rag_context": "",
            "web_context": "",
            "has_documents": False,
        }

        # RAG retrieval — only if documents exist
        if self.vector_store.count() > 0:
            chunks = self.vector_store.retrieve(query, filter_company=company)
            result["rag_chunks"] = chunks
            result["has_documents"] = True
            result["rag_context"] = self._format_rag_context(chunks)
            logger.info("RAG retrieval done", chunks=len(chunks), company_filter=company)

        # Dual web search: Social Sentiment + General News
        if use_web:
            try:
                social_query = query + " (site:reddit.com OR site:twitter.com)"
                news_query = query + " complaint controversy backlash"

                social_task = web_search(social_query, max_results=3)
                news_task = web_search(news_query, max_results=3)

                social_results, news_results = await asyncio.gather(
                    social_task, news_task, return_exceptions=True
                )

                all_results = []
                if isinstance(social_results, list):
                    for r in social_results:
                        r["source"] = "Social Media"
                    all_results.extend(social_results)
                if isinstance(news_results, list):
                    for r in news_results:
                        r["source"] = "News/Web"
                    all_results.extend(news_results)

                result["web_results"] = all_results
                result["web_context"] = format_search_results(all_results)
                logger.info("Dual web search done", social=len(social_results if isinstance(social_results, list) else []), news=len(news_results if isinstance(news_results, list) else []))
            except Exception as e:
                logger.warning("Web search failed", error=str(e))

        return result

    def _format_rag_context(self, chunks: List[Dict[str, Any]]) -> str:
        if not chunks:
            return ""
        lines = ["**Retrieved Document Context:**\n"]
        for i, chunk in enumerate(chunks, 1):
            lines.append(
                f"{i}. [Score: {chunk['score']:.2f}] (Source: {chunk['filename']})\n"
                f"   {chunk['text'][:500]}"
            )
            lines.append("")
        return "\n".join(lines)


class WriterAgent:
    """
    Synthesizes context into a streaming response.
    Uses asyncio.to_thread so the synchronous Gemini SDK doesn't block the event loop.
    """

    def __init__(self):
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self._genai = genai
        self.model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            generation_config=genai.types.GenerationConfig(
                temperature=settings.TEMPERATURE,
                max_output_tokens=settings.MAX_OUTPUT_TOKENS,
            ),
        )

    async def stream(
        self,
        query: str,
        research: Dict[str, Any],
        chat_history: List[Dict[str, str]] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream answer tokens via an async queue backed by a thread."""
        prompt = self._build_prompt(query, research, chat_history)

        queue: asyncio.Queue = asyncio.Queue()

        def _run_in_thread():
            """Runs in a worker thread — calls sync Gemini SDK."""
            try:
                response = self.model.generate_content(prompt, stream=True)
                for chunk in response:
                    try:
                        text = chunk.text  # may raise if chunk is empty
                        if text:
                            queue.put_nowait(("token", text))
                    except Exception:
                        pass  # skip empty/metadata chunks
                queue.put_nowait(("done", None))
            except Exception as e:
                queue.put_nowait(("error", str(e)))

        # Start the blocking SDK call in a thread pool
        loop = asyncio.get_event_loop()
        thread_future = loop.run_in_executor(None, _run_in_thread)

        # Yield tokens as they arrive from the queue
        while True:
            try:
                kind, value = await asyncio.wait_for(queue.get(), timeout=60.0)
            except asyncio.TimeoutError:
                logger.error("WriterAgent stream timed out")
                yield "\n\n*Response timed out. Please try again.*"
                break

            if kind == "done":
                break
            elif kind == "error":
                logger.error("WriterAgent error", error=value)
                yield f"\n\n*Error generating response: {value}*"
                break
            else:
                yield value

        await thread_future  # ensure thread cleanup

    def _build_prompt(
        self,
        query: str,
        research: Dict[str, Any],
        chat_history: List[Dict[str, str]] = None,
    ) -> str:
        from datetime import datetime
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        system = f"""You are **EchoShield**, an Expert Corporate PR & Crisis Communication Director. Today's date is {current_date}. 
Your role is to manage brand reputation by analyzing live social media sentiment and generating legally sound PR responses.

**MISSION CRITICAL DIRECTIVES:**
1. **Live Sentiment Analysis**: Read the provided 'Web Search Results' (which contain live Reddit/Twitter data) to gauge public anger or sentiment regarding the user's query.
2. **Internal Policy Adherence**: Strictly cross-reference the public complaints against the 'Retrieved Document Context' (internal company policies). 
3. **Drafting Policy**: Write highly empathetic, professional PR responses. **NEVER** admit legal liability or promise refunds explicitly unless the retrieved internal policy documents strictly authorize it.
4. **Risk Score**: Start your response by calculating a `[Crisis Risk Score: X/10]` based on the severity of the social media complaints.
5. **No Hallucinations**: Do not invent policies. If internal documents are missing, state that you need Legal's review before commenting.
6. Use clean markdown formatting.

Format your response as:
- **Crisis Risk Score**: (Your 1-10 assessment)
- **Sentiment Summary**: (Brief summary of what the internet is saying)
- **Policy Alignment**: (How this aligns with uploaded guidelines)
- **Drafted PR Statement**: (The final, ready-to-publish statement)"""

        history_text = ""
        if chat_history:
            history_lines = []
            for msg in chat_history[-6:]:
                role = "User" if msg["role"] == "user" else "Assistant"
                history_lines.append(f"{role}: {msg['content'][:300]}")
            history_text = "\n\nConversation History:\n" + "\n".join(history_lines)

        rag_section = ""
        if research.get("rag_context"):
            rag_section = f"\n\n{research['rag_context']}"

        web_section = ""
        if research.get("web_context"):
            web_section = f"\n\n{research['web_context']}"

        no_context_note = ""
        if not rag_section and not web_section:
            no_context_note = "\n\n(No external context available — answer from your training knowledge.)"

        return f"""{system}{history_text}{rag_section}{web_section}{no_context_note}

User Question: {query}

Provide a comprehensive, well-structured response:"""
