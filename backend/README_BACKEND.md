# HoloRoom AI Backend — Python FastAPI

The AI backend for HoloRoom smart home dashboard.  
Built with **Python 3.11 + FastAPI + Groq SDK**.  
The frontend (React + Three.js) stays the same — only the AI layer moves to Python.

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Backend   | Python 3.11, FastAPI, Uvicorn     |
| AI / LLM  | Groq SDK (`groq` pip package)     |
| Streaming | Server-Sent Events (SSE)          |
| Frontend  | React, TypeScript, Three.js, Vite |

---

## Setup — 2 terminals

### Terminal 1 — Python Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # then open .env and add your Groq API key
python main.py
```

Backend runs at: **http://localhost:8000**

Get a free Groq API key at: https://console.groq.com/keys

### Terminal 2 — React Frontend

```bash
# from project root
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## API Endpoints

| Method | Path               | Description                          |
|--------|--------------------|--------------------------------------|
| GET    | /api/health        | Health check, model info             |
| POST   | /api/chat          | Streaming SSE — main AI chat         |
| POST   | /api/chat/simple   | Non-streaming — voice, automations   |
| POST   | /api/voice         | Voice command (alias of /api/chat/simple) |

### SSE Stream Format (`/api/chat`)

The frontend reads these event lines:

```
data: {"delta": "text chunk", "done": false}
data: {"toolCall": {"name": "toggleDevice", "arguments": {...}}, "done": false}
data: {"done": true}
data: {"error": "⏳ Rate limit...", "done": true}
```

### Request Body (both endpoints)

```json
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user",   "content": "turn on the living room light"}
  ],
  "tools": [...],
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.1,
  "max_tokens": 512
}
```

---

## Changing the AI Model

Option 1 — In `.env`:
```
MODEL=llama-3.1-8b-instant
```

Option 2 — In the HoloRoom UI: open AI panel → gear icon → select model from dropdown.

Available models:
- `llama-3.3-70b-versatile` — best accuracy for tool calling (default)
- `llama-3.1-8b-instant` — faster, much lower rate limit usage
- `llama3-70b-8192` — alternative 70b

---

## Project Structure

```
holoroom/
├── backend/                  ← Python backend (NEW)
│   ├── main.py               ← FastAPI app, all endpoints
│   ├── requirements.txt      ← pip dependencies
│   ├── .env                  ← your API key (never commit this)
│   ├── .env.example          ← template
│   └── README_BACKEND.md     ← this file
│
├── src/                      ← React frontend (unchanged)
│   ├── services/ai/
│   │   ├── groqProvider.ts   ← now calls Python backend instead of Groq directly
│   │   ├── aiService.ts      ← unchanged (pre-flight bulk ops run locally)
│   │   └── ...
│   └── ...
├── package.json
└── HOW_TO_RUN.md
```
