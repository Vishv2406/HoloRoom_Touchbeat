// aiProvider.ts — Abstract AI provider interface + singleton
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIStreamChunk {
  delta: string;
  done: boolean;
  toolCall?: { name: string; arguments: Record<string, unknown> };
}

export interface AIProvider {
  chat(messages: AIMessage[], tools?: AITool[]): Promise<string>;
  stream(messages: AIMessage[], tools?: AITool[], onChunk?: (chunk: AIStreamChunk) => void): Promise<string>;
  isAvailable(): boolean;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// Singleton provider instance
let _provider: AIProvider | null = null;

export function setAIProvider(p: AIProvider) { _provider = p; }
export function getAIProvider(): AIProvider | null { return _provider; }
export function isAIReady(): boolean { return _provider?.isAvailable() ?? false; }
