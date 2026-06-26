// groqProvider.ts — calls the Python FastAPI backend (localhost:8000)
// The backend holds the Groq API key — it never touches the browser.
import type { AIProvider, AIMessage, AITool, AIStreamChunk } from './aiProvider';

const BACKEND_URL      = 'http://localhost:8000';
const CONNECT_TIMEOUT  = 20_000;   // ms — wait for first byte
const STREAM_TIMEOUT   = 30_000;   // ms — max silence between chunks

export class GroqProvider implements AIProvider {
  private model: string;

  // apiKey param kept for interface compatibility — ignored (key lives on server)
  constructor(_apiKey = '', model = 'llama-3.3-70b-versatile') {
    this.model = model;
  }

  /**
   * isAvailable: try a quick HEAD-like GET on /api/health.
   * Returns true if the backend is reachable, false otherwise.
   * Falls back to true on network error so the app still tries to send.
   */
  isAvailable(): boolean {
    // We can't do async here; just return true and let the first real
    // request reveal any connectivity issue with a friendly error.
    return true;
  }

  // ── non-streaming (voice, automations, scene gen) ─────────────────────────
  async chat(messages: AIMessage[], tools?: AITool[]): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT);

    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/chat/simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          tools: tools?.map(t => ({ function: { name: t.name, description: t.description, parameters: t.parameters } })),
          model: this.model,
          temperature: 0.1,
          max_tokens: 512,
        }),
        signal: controller.signal,
      });
    } catch (e: any) {
      clearTimeout(timer);
      if (e?.name === 'AbortError') throw new Error('⏱️ Backend timed out. Is `python main.py` running?');
      throw new Error('⚠️ Cannot reach backend. Run: cd backend && python main.py');
    }
    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).detail ?? `⚠️ Backend error ${res.status}`);
    }

    const data = await res.json();

    // Backend returns {toolCalls:[...]} or {content:"..."}
    if (data.toolCalls?.length) {
      return JSON.stringify({ toolCalls: data.toolCalls });
    }
    return data.content ?? '';
  }

  // ── streaming (main chat) ─────────────────────────────────────────────────
  async stream(
    messages: AIMessage[],
    tools?: AITool[],
    onChunk?: (chunk: AIStreamChunk) => void,
  ): Promise<string> {
    const controller  = new AbortController();
    const connectTimer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT);

    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          tools: tools?.map(t => ({ function: { name: t.name, description: t.description, parameters: t.parameters } })),
          model: this.model,
          temperature: 0.1,
          max_tokens: 512,
        }),
        signal: controller.signal,
      });
    } catch (e: any) {
      clearTimeout(connectTimer);
      if (e?.name === 'AbortError') throw new Error('⏱️ Backend timed out. Is `python main.py` running?');
      throw new Error('⚠️ Cannot reach backend. Run: cd backend && python main.py');
    }
    clearTimeout(connectTimer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).detail ?? `⚠️ Backend error ${res.status}`);
    }

    const reader  = res.body!.getReader();
    const decoder = new TextDecoder();

    let full     = '';
    let timedOut = false;

    let streamTimer = setTimeout(() => { timedOut = true; controller.abort(); }, STREAM_TIMEOUT);
    const resetTimer = () => {
      clearTimeout(streamTimer);
      streamTimer = setTimeout(() => { timedOut = true; controller.abort(); }, STREAM_TIMEOUT);
    };

    try {
      outer: while (true) {
        let readResult: ReadableStreamReadResult<Uint8Array>;
        try { readResult = await reader.read(); } catch { break; }
        const { value, done } = readResult;
        if (done) break;
        resetTimer();

        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let payload: any;
          try { payload = JSON.parse(raw); } catch { continue; }

          // ── Error from backend ─────────────────────────────────────────
          if (payload.error) {
            throw new Error(payload.error);
          }

          // ── Done signal ────────────────────────────────────────────────
          if (payload.done === true && !payload.delta && !payload.toolCall) {
            break outer;
          }

          // ── Text delta ─────────────────────────────────────────────────
          if (payload.delta) {
            full += payload.delta;
            onChunk?.({ delta: payload.delta, done: false });
          }

          // ── Tool call ──────────────────────────────────────────────────
          if (payload.toolCall) {
            onChunk?.({
              delta: '',
              done: false,
              toolCall: {
                name:      payload.toolCall.name,
                arguments: payload.toolCall.arguments ?? {},
              },
            });
          }
        }
      }
    } finally {
      clearTimeout(streamTimer);
      reader.cancel().catch(() => {});
    }

    if (timedOut && !full) {
      throw new Error('⏱️ Response timed out. Please try again.');
    }

    return full;
  }
}
