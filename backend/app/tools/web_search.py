"""
Web search using the duckduckgo_search package (no API key needed).
Falls back gracefully if the search fails.
"""

import asyncio
import structlog
from typing import List, Dict, Any

logger = structlog.get_logger()


async def web_search(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search the web using DuckDuckGo (via duckduckgo_search package).
    Runs in a thread to keep the async event loop free.
    """
    def _search():
        try:
            from duckduckgo_search import DDGS
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=max_results):
                    results.append({
                        "title": r.get("title", "Web Source"),
                        "snippet": r.get("body", ""),
                        "url": r.get("href", ""),
                        "source": "DuckDuckGo",
                    })
            return results
        except Exception as e:
            logger.warning("DuckDuckGo search failed", error=str(e))
            return []

    try:
        results = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _search),
            timeout=15.0,
        )
        logger.info("Web search complete", query=query[:60], results=len(results))
        return results
    except asyncio.TimeoutError:
        logger.warning("Web search timed out", query=query[:60])
        return []
    except Exception as e:
        logger.warning("Web search error", error=str(e))
        return []


def format_search_results(results: List[Dict[str, Any]]) -> str:
    """Format search results into readable markdown for the LLM."""
    if not results:
        return ""
    lines = ["**Web Search Results:**\n"]
    for i, r in enumerate(results, 1):
        lines.append(f"{i}. **{r['title']}**")
        lines.append(f"   {r['snippet']}")
        if r.get("url"):
            lines.append(f"   Source: {r['url']}")
        lines.append("")
    return "\n".join(lines)
