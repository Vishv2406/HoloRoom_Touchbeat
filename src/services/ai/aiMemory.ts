// aiMemory.ts — Local AI memory: user preferences, patterns, history
const MEMORY_KEY = 'holoroom_ai_memory';

export interface AIMemory {
  frequentScenes: Record<number, number>;       // sceneId → use count
  frequentDevices: Record<number, number>;      // deviceId → toggle count
  preferredTemp: number | null;                 // preferred AC temp
  preferredFanSpeed: number | null;
  commonCommands: string[];                     // last 20 user messages
  apiKey: string;                               // stored API key
  lastInsightAt: number;
  chatHistory: MemoryChatMessage[];             // last 30 messages
}

export interface MemoryChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  functionCalls?: { name: string; result: string }[];
}

const DEFAULT_MEMORY: AIMemory = {
  frequentScenes: {},
  frequentDevices: {},
  preferredTemp: null,
  preferredFanSpeed: null,
  commonCommands: [],
  apiKey: '',
  lastInsightAt: 0,
  chatHistory: [],
};

export function loadMemory(): AIMemory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return { ...DEFAULT_MEMORY };
    return { ...DEFAULT_MEMORY, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_MEMORY };
  }
}

export function saveMemory(mem: AIMemory): void {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
  } catch {}
}

export function recordSceneUse(sceneId: number): void {
  const mem = loadMemory();
  mem.frequentScenes[sceneId] = (mem.frequentScenes[sceneId] ?? 0) + 1;
  saveMemory(mem);
}

export function recordDeviceToggle(deviceId: number): void {
  const mem = loadMemory();
  mem.frequentDevices[deviceId] = (mem.frequentDevices[deviceId] ?? 0) + 1;
  saveMemory(mem);
}

export function recordCommand(msg: string): void {
  const mem = loadMemory();
  mem.commonCommands = [msg, ...mem.commonCommands].slice(0, 20);
  saveMemory(mem);
}

export function addChatMessage(msg: MemoryChatMessage): void {
  const mem = loadMemory();
  mem.chatHistory = [...mem.chatHistory, msg].slice(-30);
  saveMemory(mem);
}

export function getChatHistory(): MemoryChatMessage[] {
  return loadMemory().chatHistory;
}

export function getStoredApiKey(): string {
  return loadMemory().apiKey;
}

export function setStoredApiKey(key: string): void {
  const mem = loadMemory();
  mem.apiKey = key;
  saveMemory(mem);
}

export function clearChatHistory(): void {
  const mem = loadMemory();
  mem.chatHistory = [];
  saveMemory(mem);
}

export function getMemoryContext(): string {
  const mem = loadMemory();
  const parts: string[] = [];
  if (mem.preferredTemp) parts.push(`User prefers AC at ${mem.preferredTemp}°C`);
  if (mem.preferredFanSpeed) parts.push(`User prefers fan speed ${mem.preferredFanSpeed}`);
  if (mem.commonCommands.length) parts.push(`Recent commands: ${mem.commonCommands.slice(0, 5).join(', ')}`);
  return parts.join('. ');
}
