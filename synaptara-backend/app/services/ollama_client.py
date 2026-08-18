"""
Thin client for a local Ollama server (https://ollama.com).

Ollama exposes an OpenAI-incompatible-but-simple REST API at
POST {OLLAMA_BASE_URL}/api/chat — this wraps that endpoint so
search_service.py and assistant_service.py don't duplicate the
request/response handling.

No API key, no billing, fully local. Trade-off: no hosted web-search tool,
so answers are grounded only in the model's own training data plus
whatever context we pass in the prompt ourselves.
"""

import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class OllamaUnavailableError(Exception):
    """Raised when the local Ollama server can't be reached or errors out."""


async def ollama_chat(messages: list[dict], *, timeout: float = 60.0) -> str:
    """
    Sends a chat-style request to Ollama and returns the reply text.

    messages: list of {"role": "system"|"user"|"assistant", "content": str}
    Raises OllamaUnavailableError with a short machine-readable reason on
    any failure, so callers can show a specific, actionable message.
    """
    settings = get_settings()
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    model = settings.OLLAMA_MODEL

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(f"{base_url}/api/chat", json=payload)
    except httpx.ConnectError:
        logger.warning("Could not reach Ollama at %s — is it running?", base_url)
        raise OllamaUnavailableError("connection_failed")
    except httpx.TimeoutException:
        logger.warning("Ollama request timed out after %ss", timeout)
        raise OllamaUnavailableError("timeout")
    except httpx.HTTPError:
        logger.exception("Ollama request errored")
        raise OllamaUnavailableError("request_error")

    if resp.status_code == 404:
        # Model not pulled yet — Ollama's own error message names the model.
        logger.warning("Ollama returned 404 — model '%s' likely not pulled: %s", model, resp.text[:300])
        raise OllamaUnavailableError("model_not_found")
    if resp.status_code != 200:
        logger.warning("Ollama returned %s: %s", resp.status_code, resp.text[:300])
        raise OllamaUnavailableError("provider_error")

    try:
        data = resp.json()
        text = data["message"]["content"]
    except (KeyError, ValueError):
        logger.exception("Unexpected Ollama response shape: %s", resp.text[:300])
        raise OllamaUnavailableError("empty_response")

    if not text or not text.strip():
        raise OllamaUnavailableError("empty_response")

    return text.strip()


async def ollama_is_reachable() -> bool:
    """Quick health check — used by /health-style diagnostics if needed."""
    settings = get_settings()
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{base_url}/api/tags")
        return resp.status_code == 200
    except httpx.HTTPError:
        return False
