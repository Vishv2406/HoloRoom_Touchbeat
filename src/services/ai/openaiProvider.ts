// openaiProvider.ts — OpenAI GPT provider (client-side, key from env or settings)
import type { AIProvider, AIMessage, AITool, AIStreamChunk } from './aiProvider';

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    this.apiKey = apiKey;
    this.model = model;
  }

  isAvailable(): boolean {
    return this.apiKey.length > 10;
  }

  async chat(messages: AIMessage[], tools?: AITool[]): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    };
    if (tools?.length) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      body.tool_choice = 'auto';
    }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.error?.message ?? `OpenAI error ${res.status}`);
    }
    const data = await res.json();
    const choice = data.choices?.[0];
    // Handle tool calls
    if (choice?.message?.tool_calls?.length) {
      return JSON.stringify({ toolCalls: choice.message.tool_calls });
    }
    return choice?.message?.content ?? '';
  }

  async stream(
    messages: AIMessage[],
    tools?: AITool[],
    onChunk?: (chunk: AIStreamChunk) => void,
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      max_tokens: 1500,
      temperature: 0.7,
      stream: true,
    };
    if (tools?.length) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      body.tool_choice = 'auto';
    }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.error?.message ?? `OpenAI error ${res.status}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = '';
    let toolCallName = '';
    let toolCallArgs = '';
    let toolCallId = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          onChunk?.({ delta: '', done: true });
          break;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) {
            full += delta.content;
            onChunk?.({ delta: delta.content, done: false });
          }
          // Accumulate tool call
          if (delta?.tool_calls?.[0]) {
            const tc = delta.tool_calls[0];
            if (tc.id) toolCallId = tc.id;
            if (tc.function?.name) toolCallName += tc.function.name;
            if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    if (toolCallName) {
      let parsedArgs: Record<string, unknown> = {};
      try { parsedArgs = JSON.parse(toolCallArgs); } catch {}
      onChunk?.({ delta: '', done: true, toolCall: { name: toolCallName, arguments: parsedArgs } });
      return JSON.stringify({ toolCalls: [{ id: toolCallId, function: { name: toolCallName, arguments: toolCallArgs } }] });
    }

    return full;
  }
}
