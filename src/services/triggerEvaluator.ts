// triggerEvaluator.ts — Pure evaluation logic. No side effects.

import type { AutomationRule } from '../types';
import { useHomeStore } from '../store/useHomeStore';
import { SUN_TIMES } from './automationEngine';

function pad(n: number) { return n.toString().padStart(2, '0'); }

// Compute the effective sun-event time (with optional offset in minutes)
function sunEventTime(event: 'sunrise' | 'sunset', offsetMinutes = 0): { h: number; m: number } {
  const base = event === 'sunrise'
    ? { h: SUN_TIMES.sunriseHour, m: SUN_TIMES.sunriseMinute }
    : { h: SUN_TIMES.sunsetHour, m: SUN_TIMES.sunsetMinute };
  const totalMins = base.h * 60 + base.m + offsetMinutes;
  return { h: Math.floor(totalMins / 60) % 24, m: ((totalMins % 60) + 60) % 60 };
}

export function evaluateRule(rule: AutomationRule, now: Date): boolean {
  const { trigger } = rule;

  // ── TIME ──────────────────────────────────────────────────────────────────
  if (trigger.type === 'time') {
    if (!trigger.time) return false;
    const [ruleH, ruleM] = trigger.time.split(':').map(Number);
    const nowH = now.getHours(), nowM = now.getMinutes();
    if (ruleH !== nowH || ruleM !== nowM) return false;
    const days = trigger.days ?? [0, 1, 2, 3, 4, 5, 6];
    return days.includes(now.getDay());
  }

  // ── SUN ───────────────────────────────────────────────────────────────────
  if (trigger.type === 'sun') {
    const event = trigger.sunEvent ?? 'sunrise';
    const offset = (trigger as any).sunOffsetMinutes ?? 0;
    const { h, m } = sunEventTime(event, offset);
    return now.getHours() === h && now.getMinutes() === m;
  }

  // ── ENERGY ────────────────────────────────────────────────────────────────
  if (trigger.type === 'energy') {
    const total = useHomeStore.getState().getTotalPower();
    return total > (trigger.energyThreshold ?? 3000);
  }

  // ── DEVICE STATE ──────────────────────────────────────────────────────────
  if (trigger.type === 'device_state') {
    if (trigger.deviceId === undefined) return false;
    const device = useHomeStore.getState().getDeviceById(trigger.deviceId);
    if (!device) return false;

    switch (trigger.condition) {
      case 'turns_on': return device.isOn;
      case 'turns_off': return !device.isOn;
      case 'brightness_above': return (device.brightness ?? 0) > (trigger.value ?? 50);
      case 'brightness_below': return (device.brightness ?? 100) < (trigger.value ?? 50);
      case 'temp_above': return (device.temperature ?? 0) > (trigger.value ?? 25);
      case 'temp_below': return (device.temperature ?? 99) < (trigger.value ?? 25);
      case 'speed_above': return (device.speed ?? 0) > (trigger.value ?? 2);
      case 'speed_below': return (device.speed ?? 5) < (trigger.value ?? 3);
      case 'volume_above': return (device.volume ?? 0) > (trigger.value ?? 50);
      case 'volume_below': return (device.volume ?? 100) < (trigger.value ?? 50);
      default: return false;
    }
  }

  return false;
}

// Build a unique key for dedup — changes each minute so same minute never re-fires
export function buildTriggerKey(rule: AutomationRule, now: Date): string {
  const base = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;

  switch (rule.trigger.type) {
    case 'time':
    case 'sun':
      return `${rule.id}-${base}`;
    case 'device_state': {
      // For device state rules key on minute + device on/off state to prevent re-fire
      const device = useHomeStore.getState().getDeviceById(rule.trigger.deviceId ?? -1);
      return `${rule.id}-${base}-${device?.isOn ? 'on' : 'off'}`;
    }
    case 'energy':
      // Not used (energy uses its own cooldown map)
      return `${rule.id}-${base}`;
    default:
      return `${rule.id}-${base}`;
  }
}
