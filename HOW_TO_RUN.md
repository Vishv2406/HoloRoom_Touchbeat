# HoloRoom — How to Run

## Quick Start (2 terminals)

### Terminal 1 — Python Backend
```bash
cd backend
pip install -r requirements.txt
# Add your Groq API key to backend/.env
# Get a free key at: https://console.groq.com/keys
python main.py
```
Backend starts at → http://localhost:8000

### Terminal 2 — React Frontend
```bash
npm install
npm run dev
```
App opens at → http://localhost:5173

---

## First time setup

1. Get a free Groq API key at https://console.groq.com/keys
2. Open `backend/.env` and replace `your_groq_api_key_here` with your key
3. Start both terminals as shown above
4. Open http://localhost:5173 in your browser

---

## Architecture

```
Browser (React + Three.js)
        │
        │  HTTP / SSE
        ▼
Python FastAPI Backend  (localhost:8000)
        │
        │  Groq Python SDK
        ▼
Groq Cloud API  (llama-3.3-70b-versatile)
```

- The Groq API key lives in `backend/.env` — never in the browser
- Bulk device commands (turn off all lights, etc.) run locally with zero API calls
- The 3D home view, device controls, scenes, and automations all work the same
