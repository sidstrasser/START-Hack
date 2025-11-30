"""Perplexity API client utility for research queries."""

import asyncio
import json
import logging
from typing import Dict, List, Optional
import requests

logger = logging.getLogger(__name__)


async def perplexity_search(
    query: str,
    system_prompt: str = "You are a helpful research assistant.",
    model: str = "sonar-reasoning",
    api_key: str = "",
    max_retries: int = 3,
) -> Dict:
    """
    Execute a search query using the Perplexity API.

    Args:
        query: The search query string
        system_prompt: System prompt to guide the response
        model: Perplexity model to use (default: sonar-reasoning)
        api_key: Perplexity API key
        max_retries: Maximum number of retry attempts

    Returns:
        Dict containing:
        - content: The response text
        - citations: List of sources (if available)
        - success: Boolean indicating success
        - error: Error message (if failed)
    """
    url = "https://api.perplexity.ai/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]
    }

    for attempt in range(max_retries):
        try:
            # Run in executor to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(url, headers=headers, json=payload, timeout=30)
            )

            if response.status_code == 200:
                data = response.json()

                # Extract content from response
                content = ""
                citations = []

                if "choices" in data and len(data["choices"]) > 0:
                    choice = data["choices"][0]
                    content = choice.get("message", {}).get("content", "")

                    # Clean up reasoning traces from sonar-reasoning model
                    # Remove <think>...</think> tags and their content
                    import re
                    content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
                    content = content.strip()

                    # Extract citations if available
                    if "citations" in choice:
                        citations = choice["citations"]

                return {
                    "content": content,
                    "citations": citations,
                    "success": True,
                    "error": None
                }

            elif response.status_code == 429:
                # Rate limit hit, wait and retry
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"[PERPLEXITY] Rate limit hit, waiting {wait_time}s before retry {attempt + 1}/{max_retries}")
                await asyncio.sleep(wait_time)
                continue

            else:
                error_msg = f"API returned status {response.status_code}: {response.text}"
                logger.error(f"[PERPLEXITY] {error_msg}")

                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue

                return {
                    "content": "",
                    "citations": [],
                    "success": False,
                    "error": error_msg
                }

        except requests.exceptions.Timeout:
            logger.warning(f"[PERPLEXITY] Timeout on attempt {attempt + 1}/{max_retries}")
            if attempt < max_retries - 1:
                await asyncio.sleep(1)
                continue

            return {
                "content": "",
                "citations": [],
                "success": False,
                "error": "Request timeout"
            }

        except Exception as e:
            logger.error(f"[PERPLEXITY] Error: {str(e)}", exc_info=True)
            if attempt < max_retries - 1:
                await asyncio.sleep(1)
                continue

            return {
                "content": "",
                "citations": [],
                "success": False,
                "error": str(e)
            }

    # All retries exhausted
    return {
        "content": "",
        "citations": [],
        "success": False,
        "error": f"Failed after {max_retries} attempts"
    }


async def perplexity_batch_search(
    queries: List[Dict[str, str]],
    api_key: str,
    model: str = "sonar-reasoning",
) -> Dict[str, Dict]:
    """
    Execute multiple search queries in parallel.

    Args:
        queries: List of dicts with 'key' (identifier), 'query', and optional 'system_prompt'
        api_key: Perplexity API key
        model: Perplexity model to use

    Returns:
        Dict mapping keys to search results
    """
    tasks = []
    keys = []

    for query_item in queries:
        key = query_item["key"]
        query = query_item["query"]
        system_prompt = query_item.get("system_prompt", "You are a helpful research assistant.")

        keys.append(key)
        tasks.append(
            perplexity_search(
                query=query,
                system_prompt=system_prompt,
                model=model,
                api_key=api_key
            )
        )

    # Execute all queries in parallel
    results = await asyncio.gather(*tasks)

    # Map results to keys
    return {key: result for key, result in zip(keys, results)}
