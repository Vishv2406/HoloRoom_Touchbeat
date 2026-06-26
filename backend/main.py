# main.py — HoloRoom AI Backend (FastAPI + Groq Python SDK)
# Handles all Groq API calls server-side so the API key never touches the browser.

import os
import json
import asyncio
import logging
from typing import Any, AsyncGenerator

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import AsyncGroq, APIStatusError, APIConnectionError, APITimeoutError

# ── Config ────────────────────────────────────────────────────────────────────

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DEFAULT_MODEL = os.getenv("MODEL", "llama-3.3-70b-versatile")
PORT = int(os.getenv("PORT", "8000"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("holoroom")

# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="HoloRoom AI Backend",
    description="Python FastAPI backend that proxies Groq LLM calls for HoloRoom smart home dashboard",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Dev: allow Vite on any port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Groq client (lazy — created once) ────────────────────────────────────────

_groq_client: AsyncGroq | None = None

def get_groq_client() -> AsyncGroq:
    global _groq_client
    if _groq_client is None:
        if not GROQ_API_KEY or len(GROQ_API_KEY) < 10:
            raise HTTPException(
                status_code=503,
                detail="🔑 GROQ_API_KEY not configured. Set it in backend/.env and restart.",
            )
        _groq_client = AsyncGroq(api_key=GROQ_API_KEY)
    return _groq_client

# ── Request / Response models ─────────────────────────────────────────────────

class Message(BaseModel):
    role: str           # "system" | "user" | "assistant" | "tool"
    content: str | None = None
    tool_calls: list[dict[str, Any]] | None = None
    tool_call_id: str | None = None

class ToolFunction(BaseModel):
    name: str
    description: str
    parameters: dict[str, Any]

class ChatRequest(BaseModel):
    messages: list[dict[str, Any]]   # raw dicts — forward as-is to Groq
    tools: list[dict[str, Any]] | None = None
    model: str | None = None
    temperature: float = 0.1
    max_tokens: int = 512

# ── Tool schema sanitizer (mirrors TypeScript version) ────────────────────────

def sanitize_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Groq rejects 'minimum', 'maximum', 'description' inside parameter schemas."""
    if not isinstance(schema, dict):
        return schema
    out: dict[str, Any] = {}
    for k, v in schema.items():
        if k in ("minimum", "maximum", "description"):
            continue
        if k == "properties" and isinstance(v, dict):
            out[k] = {pk: sanitize_schema(pv) for pk, pv in v.items()}
        elif k == "items" and isinstance(v, dict):
            out[k] = sanitize_schema(v)
        else:
            out[k] = v
    return out

def sanitize_tools(tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for t in tools:
        fn = t.get("function", t)   # accept both {function:{...}} and flat format
        result.append({
            "type": "function",
            "function": {
                "name": fn["name"],
                "description": fn.get("description", ""),
                "parameters": sanitize_schema(fn.get("parameters", {})),
            },
        })
    return result

# ── Friendly error messages ───────────────────────────────────────────────────

def friendly_error(status: int, msg: str) -> str:
    if status == 429:
        return "⏳ Rate limit reached. Please wait a moment and try again."
    if status == 400:
        return f"⚠️ Bad request: {msg}"
    if status == 401:
        return "🔑 Invalid Groq API key. Check your backend/.env file."
    if status == 503:
        return "⚠️ Groq service temporarily unavailable. Try again shortly."
    return f"⚠️ Groq API error {status}: {msg}"

# ── SSE helpers ───────────────────────────────────────────────────────────────

def sse(data: dict[str, Any]) -> str:
    """Format a dict as a Server-Sent Events line."""
    return f"data: {json.dumps(data)}\n\n"

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    key_ok = bool(GROQ_API_KEY and len(GROQ_API_KEY) > 10)
    return {
        "status": "ok",
        "model": DEFAULT_MODEL,
        "api_key_configured": key_ok,
    }


@app.post("/api/chat")
async def chat_stream(req: ChatRequest):
    """
    Streaming endpoint — returns Server-Sent Events.
    The frontend reads chunks as:
      data: {"delta": "text", "done": false}
      data: {"toolCall": {"name": "...", "arguments": {...}}, "done": false}
      data: {"done": true}
      data: {"error": "...", "done": true}
    """
    client = get_groq_client()
    model  = req.model or DEFAULT_MODEL
    tools  = sanitize_tools(req.tools) if req.tools else None

    async def generate() -> AsyncGenerator[str, None]:
        tool_call_name = ""
        tool_call_args = ""
        tool_call_id   = ""
        tool_name_set  = False

        try:
            kwargs: dict[str, Any] = {
                "model":       model,
                "messages":    req.messages,
                "max_tokens":  req.max_tokens,
                "temperature": req.temperature,
                "stream":      True,
            }
            if tools:
                kwargs["tools"]       = tools
                kwargs["tool_choice"] = "auto"

            # FIX: use .create(stream=True) — .stream() context manager
            # does not exist in the groq SDK.
            stream = await client.chat.completions.create(**kwargs)

            async for chunk in stream:
                choice = chunk.choices[0] if chunk.choices else None
                if not choice:
                    continue

                delta = choice.delta

                # ── Text content ──────────────────────────────────────
                if delta.content:
                    yield sse({"delta": delta.content, "done": False})

                # ── Tool call (streamed in pieces) ────────────────────
                if delta.tool_calls:
                    tc = delta.tool_calls[0]
                    if tc.id:
                        tool_call_id = tc.id
                    if tc.function and tc.function.name and not tool_name_set:
                        tool_call_name = tc.function.name
                        tool_name_set  = True
                    if tc.function and tc.function.arguments:
                        tool_call_args += tc.function.arguments

                # ── Finish reason ─────────────────────────────────────
                if choice.finish_reason == "tool_calls":
                    # Parse accumulated args and emit toolCall chunk
                    try:
                        parsed_args = json.loads(tool_call_args) if tool_call_args else {}
                    except json.JSONDecodeError:
                        parsed_args = {}
                    yield sse({
                        "toolCall": {
                            "name":      tool_call_name,
                            "arguments": parsed_args,
                            "id":        tool_call_id,
                        },
                        "done": False,
                    })

        except APIStatusError as e:
            log.error("Groq API error %s: %s", e.status_code, e.message)
            yield sse({"error": friendly_error(e.status_code, e.message), "done": True})
            return

        except APIConnectionError as e:
            log.error("Groq connection error: %s", e)
            yield sse({"error": "⚠️ Could not connect to Groq. Check your internet connection.", "done": True})
            return

        except APITimeoutError:
            log.error("Groq request timed out")
            yield sse({"error": "⏱️ Request timed out. Please try again.", "done": True})
            return

        except Exception as e:
            log.error("Unexpected error: %s", e)
            yield sse({"error": f"⚠️ Unexpected error: {str(e)}", "done": True})
            return

        # Signal completion
        yield sse({"done": True})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",   # Disable nginx buffering
        },
    )


@app.post("/api/chat/simple")
async def chat_simple(req: ChatRequest):
    """
    Non-streaming endpoint — returns JSON.
    Used for voice commands, automation building, scene generation.
    Response: {"content": "text"} or {"toolCalls": [...]}
    """
    client = get_groq_client()
    model  = req.model or DEFAULT_MODEL
    tools  = sanitize_tools(req.tools) if req.tools else None

    try:
        kwargs: dict[str, Any] = {
            "model":       model,
            "messages":    req.messages,
            "max_tokens":  req.max_tokens,
            "temperature": req.temperature,
        }
        if tools:
            kwargs["tools"]       = tools
            kwargs["tool_choice"] = "auto"

        response = await client.chat.completions.create(**kwargs)
        choice   = response.choices[0]

        if choice.message.tool_calls:
            return JSONResponse({
                "toolCalls": [
                    {
                        "id": tc.id,
                        "function": {
                            "name":      tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in choice.message.tool_calls
                ]
            })

        return JSONResponse({"content": choice.message.content or ""})

    except APIStatusError as e:
        raise HTTPException(status_code=e.status_code, detail=friendly_error(e.status_code, e.message))
    except APIConnectionError:
        raise HTTPException(status_code=503, detail="⚠️ Could not connect to Groq.")
    except APITimeoutError:
        raise HTTPException(status_code=504, detail="⏱️ Request timed out.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"⚠️ {str(e)}")


@app.post("/api/voice")
async def voice_command(req: ChatRequest):
    """Alias of /api/chat/simple for voice commands — same logic, separate endpoint for clarity."""
    return await chat_simple(req)


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    print("\n" + "═" * 55)
    print("  🏠  HoloRoom AI Backend")
    print(f"  🌐  http://localhost:{PORT}")
    print(f"  🤖  Model: {DEFAULT_MODEL}")
    if GROQ_API_KEY and len(GROQ_API_KEY) > 10:
        print("  ✅  GROQ_API_KEY loaded from .env")
    else:
        print("  ⚠️   GROQ_API_KEY not set — add it to backend/.env")
    print("═" * 55 + "\n")


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True, log_level="warning")
