// useActivityStore.ts — Tracks device on/off events for activity sparkline
import { create } from 'zustand';
import { produce } from 'immer';

const STORAGE_KEY = 'holoroom_activity';
const MAX_EVENTS_PER_DEVICE = 200;
const MS_24H = 24 * 60 * 60 * 1000;

export interface ActivityEvent {
  timestamp: number;
  isOn: boolean;
}

interface ActivityState {
  events: Record<number, ActivityEvent[]>;
  logEvent: (deviceId: number, isOn: boolean, timestamp?: number) => void;
  getEventsForDevice: (deviceId: number) => ActivityEvent[];
  getHourlyBuckets: (deviceId: number) => boolean[];
  getTotalOnMinutes: (deviceId: number) => number;
  getLastActiveTimestamp: (deviceId: number) => number | null;
  pruneOld: () => void;
}

function loadFromStorage(): Record<number, ActivityEvent[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<number, ActivityEvent[]>;
  } catch {}
  return {};
}

function saveToStorage(events: Record<number, ActivityEvent[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {}
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  events: loadFromStorage(),

  logEvent: (deviceId, isOn, timestamp = Date.now()) => {
    set(produce<ActivityState>((state) => {
      if (!state.events[deviceId]) state.events[deviceId] = [];
      state.events[deviceId].unshift({ timestamp, isOn });
      if (state.events[deviceId].length > MAX_EVENTS_PER_DEVICE) {
        state.events[deviceId].length = MAX_EVENTS_PER_DEVICE;
      }
    }));
    saveToStorage(get().events);
  },

  getEventsForDevice: (deviceId) => {
    const cutoff = Date.now() - MS_24H;
    return (get().events[deviceId] ?? []).filter(e => e.timestamp >= cutoff);
  },

  getHourlyBuckets: (deviceId) => {
    const now = Date.now();
    const events = get().getEventsForDevice(deviceId);
    const buckets = new Array<boolean>(24).fill(false);

    for (let h = 0; h < 24; h++) {
      const bucketStart = now - (24 - h) * 3600000;
      const bucketEnd = bucketStart + 3600000;
      const hasOn = events.some(e => e.isOn && e.timestamp >= bucketStart && e.timestamp < bucketEnd);
      buckets[h] = hasOn;
    }
    return buckets;
  },

  getTotalOnMinutes: (deviceId) => {
    const events = get().getEventsForDevice(deviceId).slice().reverse();
    let totalMs = 0;
    let lastOnTime: number | null = null;

    for (const e of events) {
      if (e.isOn) {
        lastOnTime = e.timestamp;
      } else if (lastOnTime !== null) {
        totalMs += e.timestamp - lastOnTime;
        lastOnTime = null;
      }
    }

    if (lastOnTime !== null) {
      totalMs += Date.now() - lastOnTime;
    }

    return Math.floor(totalMs / 60000);
  },

  getLastActiveTimestamp: (deviceId) => {
    const events = get().events[deviceId] ?? [];
    if (events.length === 0) return null;
    return events[0].timestamp;
  },

  pruneOld: () => {
    const cutoff = Date.now() - MS_24H;
    set(produce<ActivityState>((state) => {
      for (const key of Object.keys(state.events)) {
        const id = Number(key);
        state.events[id] = state.events[id].filter(e => e.timestamp >= cutoff);
        if (state.events[id].length === 0) delete state.events[id];
      }
    }));
    saveToStorage(get().events);
  },
}));
