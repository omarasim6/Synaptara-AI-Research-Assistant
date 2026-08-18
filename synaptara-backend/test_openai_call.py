"""
Standalone diagnostic — isolates exactly what search_service.py does,
without needing the DB, auth, or the full FastAPI app running.

Run from inside synaptara-backend/:
    python test_openai_call.py
"""
import asyncio
import os
import sys

# Load .env manually (no dependency on app.config so this works standalone)
def load_env(path=".env"):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env

env = load_env()
OPENAI_API_KEY = env.get("OPENAI_API_KEY", "")
OPENAI_MODEL = env.get("OPENAI_MODEL", "gpt-5-mini")

print(f"Model configured: {OPENAI_MODEL}")
print(f"Key present: {bool(OPENAI_API_KEY)}  (starts with: {OPENAI_API_KEY[:8]}...)")
print()

import httpx

async def try_call(tool_type):
    payload = {
        "model": OPENAI_MODEL,
        "input": "Answer briefly: who is ronaldo?" + (
            " Use current web information." if tool_type else ""
        ),
    }
    if tool_type:
        payload["tools"] = [{"type": tool_type}]

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/responses",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
    print(f"--- tool_type={tool_type} ---")
    print(f"status: {resp.status_code}")
    print(f"body: {resp.text[:1000]}")
    print()

async def main():
    for tool_type in ("web_search", "web_search_preview", None):
        try:
            await try_call(tool_type)
        except Exception as e:
            print(f"--- tool_type={tool_type} ---")
            print(f"EXCEPTION: {type(e).__name__}: {e}")
            print()

asyncio.run(main())
