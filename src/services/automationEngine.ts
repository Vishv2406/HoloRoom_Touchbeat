// automationEngine.ts — Singleton automation engine. Lives outside React.
// Start once in App.tsx. Never import inside components.

import { evaluateRule, buildTriggerKey } from './triggerEvaluator';
import { executeActions } from './automationExecutor';
import { useAutomationStore } from '../store/useAutomationStore';
import { useHomeStore } from '../store/useHomeStore';

// ─── Sun simulator (no backend needed) ─────────────────────────────────────
export const SUN_TIMES = {
  sunriseHour: 6, sunriseMinute: 15,
  sunsetHour: 18, sunsetMinute: 45,
};

let tickInterval: ReturnType<typeof setInterval> | null = null;
let prevDeviceSnapshot: Record<number, boolean> = {};

// Map: ruleId → last triggerKey that caused a fire
const firedKeys: Record<number, string> = {};
// Energy cooldown: ruleId → timestamp of last fire
const energyCooldown: Record<number, number> = {};

// ─── Device-state change detection ─────────────────────────────────────────
function snapshotDevices(): Record<number, boolean> {
  const snap: Record<number, boolean> = {};
  useHomeStore.getState().getAllDevices().forEach(d => { snap[d.id] = d.isOn; });
  return snap;
}

function detectDeviceChanges(prev: Record<number, boolean>, curr: Record<number, boolean>) {
  const changed: Array<{ deviceId: number; isOn: boolean }> = [];
  for (const idStr of Object.keys(curr)) {
    const id = Number(idStr);
    if (prev[id] !== undefined && prev[id] !== curr[id]) {
      changed.push({ deviceId: id, isOn: curr[id] });
    }
  }
  return changed;
}

// ─── Main tick ──────────────────────────────────────────────────────────────
function tick() {
  const { rules, incrementRunCount, updateRule } = useAutomationStore.getState();
  const now = new Date();

  // ── Device state change detection ──
  const currSnap = snapshotDevices();
  const changes = detectDeviceChanges(prevDeviceSnapshot, currSnap);
  prevDeviceSnapshot = currSnap;

  for (const rule of rules) {
    if (!rule.isEnabled) continue;

    // ── TIME rules ──────────────────────────────────────────────────────────
    if (rule.trigger.type === 'time') {
      const matched = evaluateRule(rule, now);
      if (!matched) continue;
      const key = buildTriggerKey(rule, now);
      if (firedKeys[rule.id] === key) continue; // already fired this minute
      firedKeys[rule.id] = key;
      console.log(`[AUTOMATION] Rule: "${rule.name}" | Trigger: Time ${rule.trigger.time} | Matched: TRUE`);
      executeActions(rule.actions, rule.name);
      incrementRunCount(rule.id);
      updateRule(rule.id, { lastTriggered: Date.now() });
      continue;
    }

    // ── SUN rules ───────────────────────────────────────────────────────────
    if (rule.trigger.type === 'sun') {
      const matched = evaluateRule(rule, now);
      if (!matched) continue;
      const key = buildTriggerKey(rule, now);
      if (firedKeys[rule.id] === key) continue;
      firedKeys[rule.id] = key;
      console.log(`[AUTOMATION] Rule: "${rule.name}" | Trigger: Sun ${rule.trigger.sunEvent} | Matched: TRUE`);
      executeActions(rule.actions, rule.name);
      incrementRunCount(rule.id);
      updateRule(rule.id, { lastTriggered: Date.now() });
      continue;
    }

    // ── ENERGY rules ────────────────────────────────────────────────────────
    if (rule.trigger.type === 'energy') {
      const matched = evaluateRule(rule, now);
      if (!matched) continue;
      const lastFire = energyCooldown[rule.id] ?? 0;
      if (Date.now() - lastFire < 60_000) continue; // 1-min cooldown
      energyCooldown[rule.id] = Date.now();
      console.log(`[AUTOMATION] Rule: "${rule.name}" | Trigger: Energy > ${rule.trigger.energyThreshold}W | Matched: TRUE`);
      executeActions(rule.actions, rule.name);
      incrementRunCount(rule.id);
      updateRule(rule.id, { lastTriggered: Date.now() });
      continue;
    }

    // ── DEVICE STATE rules — driven by change detection ─────────────────────
    if (rule.trigger.type === 'device_state') {
      const deviceId = rule.trigger.deviceId;
      if (deviceId === undefined) continue;
      const change = changes.find(c => c.deviceId === deviceId);
      if (!change) continue;

      const condition = rule.trigger.condition ?? 'turns_on';
      let matched = false;

      if (condition === 'turns_on' && change.isOn) matched = true;
      if (condition === 'turns_off' && !change.isOn) matched = true;

      // Value-based conditions: read current device state
      if (['brightness_above', 'brightness_below', 'temp_above', 'temp_below', 'speed_above', 'speed_below', 'volume_above', 'volume_below'].includes(condition)) {
        matched = evaluateRule(rule, now);
      }

      if (!matched) continue;
      const key = buildTriggerKey(rule, now);
      if (firedKeys[rule.id] === key) continue;
      firedKeys[rule.id] = key;

      console.log(`[AUTOMATION] Rule: "${rule.name}" | Trigger: Device ${deviceId} ${condition} | Matched: TRUE`);
      executeActions(rule.actions, rule.name);
      incrementRunCount(rule.id);
      updateRule(rule.id, { lastTriggered: Date.now() });
    }
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────
export const automationEngine = {
  start() {
    if (tickInterval) return; // already running
    // Take initial snapshot so we don't fire on first tick
    prevDeviceSnapshot = snapshotDevices();
    // Run every second for accurate time/device matching
    tickInterval = setInterval(tick, 1000);
    console.log('[AUTOMATION] Engine started');
  },

  stop() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
      console.log('[AUTOMATION] Engine stopped');
    }
  },

  // Force-trigger a rule by ID (for the debug panel)
  forceTrigger(ruleId: number) {
    const { rules, incrementRunCount, updateRule } = useAutomationStore.getState();
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    // Clear the dedup key so it can re-fire
    delete firedKeys[ruleId];
    delete energyCooldown[ruleId];
    console.log(`[AUTOMATION] Force-triggering: "${rule.name}"`);
    executeActions(rule.actions, rule.name);
    incrementRunCount(ruleId);
    updateRule(ruleId, { lastTriggered: Date.now() });
  },

  getFiredKeys() { return { ...firedKeys }; },
};
