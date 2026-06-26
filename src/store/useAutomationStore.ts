// useAutomationStore.ts — Automation rules store
import { create } from 'zustand';
import { produce } from 'immer';
import type { AutomationRule } from '../types';
import { AUTOMATION_TEMPLATES } from '../data/automationTemplates';

interface AutomationState {
  rules: AutomationRule[];
  isBuilderOpen: boolean;
  editingRuleId: number | null;
  _ruleCounter: number;

  addRule: (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'runCount'>) => void;
  updateRule: (ruleId: number, updates: Partial<AutomationRule>) => void;
  deleteRule: (ruleId: number) => void;
  toggleRule: (ruleId: number) => void;
  openBuilder: (ruleId?: number) => void;
  closeBuilder: () => void;
  incrementRunCount: (ruleId: number) => void;
  addFromTemplate: (templateIdx: number) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  rules: [],
  isBuilderOpen: false,
  editingRuleId: null,
  _ruleCounter: 100,

  addRule: (rule) => {
    set(produce<AutomationState>((s) => {
      s._ruleCounter++;
      s.rules.push({ ...rule, id: s._ruleCounter, createdAt: Date.now(), runCount: 0 });
    }));
    get().saveToStorage();
  },

  updateRule: (ruleId, updates) => {
    set(produce<AutomationState>((s) => {
      const rule = s.rules.find(r => r.id === ruleId);
      if (rule) Object.assign(rule, updates);
    }));
    get().saveToStorage();
  },

  deleteRule: (ruleId) => {
    set(produce<AutomationState>((s) => { s.rules = s.rules.filter(r => r.id !== ruleId); }));
    get().saveToStorage();
  },

  toggleRule: (ruleId) => {
    set(produce<AutomationState>((s) => {
      const rule = s.rules.find(r => r.id === ruleId);
      if (rule) rule.isEnabled = !rule.isEnabled;
    }));
    get().saveToStorage();
  },

  openBuilder: (ruleId) => set({ isBuilderOpen: true, editingRuleId: ruleId ?? null }),
  closeBuilder: () => set({ isBuilderOpen: false, editingRuleId: null }),

  incrementRunCount: (ruleId) => {
    set(produce<AutomationState>((s) => {
      const rule = s.rules.find(r => r.id === ruleId);
      if (rule) { rule.runCount++; rule.lastTriggered = Date.now(); }
    }));
    // Persist after update
    setTimeout(() => get().saveToStorage(), 0);
  },

  addFromTemplate: (templateIdx) => {
    const template = AUTOMATION_TEMPLATES[templateIdx];
    if (!template) return;
    get().addRule(template);
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem('holoroom_rules');
      if (stored) {
        const rules: AutomationRule[] = JSON.parse(stored);
        const maxId = rules.reduce((m, r) => Math.max(m, r.id), 100);
        set({ rules, _ruleCounter: maxId });
      }
    } catch {}
  },

  saveToStorage: () => {
    try {
      localStorage.setItem('holoroom_rules', JSON.stringify(get().rules));
    } catch {}
  },
}));
