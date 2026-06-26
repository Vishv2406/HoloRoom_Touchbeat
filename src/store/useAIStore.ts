// useAIStore.ts — AI panel state, chat messages, insights
import { create } from 'zustand';
import { produce } from 'immer';
import { GroqProvider } from '../services/ai/groqProvider';
import { setAIProvider } from '../services/ai/aiProvider';
import { getStoredApiKey, setStoredApiKey, clearChatHistory } from '../services/ai/aiMemory';
import { detectAnomaliesLocal, generateLocalInsight } from '../services/ai/aiInsights';
import type { AnomalyAlert, EnergyInsight } from '../services/ai/aiInsights';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  functionCalls?: { name: string; result: string }[];
}

interface AIState {
  isOpen: boolean;
  isConfigured: boolean;
  apiKey: string;
  model: string;
  isThinking: boolean;
  messages: ChatMessage[];
  anomalies: AnomalyAlert[];
  insight: EnergyInsight | null;
  activeTab: 'chat' | 'insights' | 'automations';

  openPanel: () => void;
  closePanel: () => void;
  setApiKey: (key: string) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (id: string, delta: string) => void;
  clearMessages: () => void;
  setThinking: (v: boolean) => void;
  /** Emergency reset — clears any stuck spinner & marks last streaming msg as done */
  forceStopThinking: () => void;
  setActiveTab: (tab: AIState['activeTab']) => void;
  setModel: (model: string) => void;
  refreshInsights: () => void;
  initFromStorage: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  isOpen:       false,
  isConfigured: true,    // always configured — key lives on Python backend
  apiKey:       'backend',
  model:        'llama-3.3-70b-versatile',
  isThinking:   false,
  messages:     [],
  anomalies:    [],
  insight:      null,
  activeTab:    'chat',

  openPanel: () => {
    set({ isOpen: true });
    get().refreshInsights();
  },
  closePanel: () => set({ isOpen: false }),

  // setApiKey kept for interface compatibility — not needed when backend holds key
  setApiKey: (key) => {
    const trimmed = key.trim();
    if (trimmed) setStoredApiKey(trimmed); // optional: store model pref
    // Provider is always the backend — no key needed in browser
    const provider = new GroqProvider('', get().model);
    setAIProvider(provider);
    set({ apiKey: trimmed || 'backend', isConfigured: true });
  },

  addMessage: (msg) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set(produce<AIState>(s => {
      s.messages.push({ ...msg, id, timestamp: Date.now() });
    }));
    return id;
  },

  updateMessage: (id, updates) => {
    set(produce<AIState>(s => {
      const m = s.messages.find(m => m.id === id);
      if (m) Object.assign(m, updates);
    }));
  },

  appendToMessage: (id, delta) => {
    if (!delta) return; // skip empty deltas — avoids spurious re-renders
    set(produce<AIState>(s => {
      const m = s.messages.find(m => m.id === id);
      if (m) m.content += delta;
    }));
  },

  clearMessages: () => {
    clearChatHistory();
    set({ messages: [], isThinking: false });
  },

  setThinking: (v) => set({ isThinking: v }),

  forceStopThinking: () => {
    set(produce<AIState>(s => {
      s.isThinking = false;
      // Mark any still-streaming messages as done with a timeout notice
      for (const m of s.messages) {
        if (m.isStreaming) {
          m.isStreaming = false;
          if (!m.content) m.content = '⚠️ Response interrupted. Please try again.';
        }
      }
    }));
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setModel: (model) => {
    set({ model });
    // Re-create provider with new model — no API key needed (backend holds it)
    setAIProvider(new GroqProvider('', model));
  },

  refreshInsights: () => {
    try {
      const anomalies = detectAnomaliesLocal();
      const insight   = generateLocalInsight();
      set({ anomalies, insight });
    } catch { /* non-critical */ }
  },

  initFromStorage: () => {
    // Always initialize the backend provider on startup
    const model = get().model;
    setAIProvider(new GroqProvider('', model));
    set({ isConfigured: true });
    get().refreshInsights();
  },
}));
