// mqttSimulator.ts — Simulates live MQTT/WebSocket device state updates
import { useHomeStore } from '../store/useHomeStore';

export interface SimulatorToast {
  id: number;
  message: string;
  timestamp: number;
}

type ToastListener = (toast: SimulatorToast) => void;

let toastCounter = 0;
const toastListeners: ToastListener[] = [];

export function addToastListener(fn: ToastListener) {
  toastListeners.push(fn);
  return () => {
    const idx = toastListeners.indexOf(fn);
    if (idx > -1) toastListeners.splice(idx, 1);
  };
}

function emitToast(message: string) {
  toastCounter++;
  const toast: SimulatorToast = { id: toastCounter, message, timestamp: Date.now() };
  toastListeners.forEach(fn => fn(toast));
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function tick() {
  const { rooms, updateDevice } = useHomeStore.getState();
  const allDevices: { device: { id: number; name: string; type: string; isOn: boolean; brightness?: number; temperature?: number; speed?: number }, roomName: string }[] = [];

  for (const room of rooms) {
    for (const device of room.devices) {
      allDevices.push({ device, roomName: room.name });
    }
  }

  if (allDevices.length === 0) return;

  const count = Math.random() < 0.5 ? 1 : 2;
  const shuffled = [...allDevices].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);

  for (const { device, roomName } of picked) {
    if (!device.isOn) continue;

    switch (device.type) {
      case 'light': {
        const delta = randomBetween(-3, 3);
        const newBrightness = Math.max(10, Math.min(100, (device.brightness ?? 80) + delta));
        updateDevice(device.id, { brightness: Math.round(newBrightness) });
        emitToast(`📡 ${roomName} › ${device.name} — brightness ${newBrightness > (device.brightness ?? 80) ? '↑' : '↓'} ${Math.round(Math.abs(delta))}%`);
        break;
      }
      case 'fan': {
        const speeds = [1, 2, 3, 4, 5];
        const cur = device.speed ?? 3;
        const nearby = speeds.filter(s => Math.abs(s - cur) <= 1);
        const newSpeed = nearby[Math.floor(Math.random() * nearby.length)];
        if (newSpeed !== cur) {
          updateDevice(device.id, { speed: newSpeed });
          emitToast(`📡 ${roomName} › ${device.name} — speed → ${newSpeed}`);
        }
        break;
      }
      case 'ac': {
        const delta = randomBetween(-0.5, 0.5);
        const newTemp = Math.max(16, Math.min(30, (device.temperature ?? 24) + delta));
        updateDevice(device.id, { temperature: Math.round(newTemp * 2) / 2 });
        emitToast(`📡 ${roomName} › ${device.name} — temp ${delta > 0 ? '↑' : '↓'} ${newTemp.toFixed(1)}°C`);
        break;
      }
      case 'plug': {
        emitToast(`📡 ${roomName} › ${device.name} — power usage fluctuated`);
        break;
      }
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export const mqttSimulator = {
  start() {
    if (intervalId) return;
    const delay = () => Math.floor(randomBetween(8000, 12000));
    const schedule = () => {
      intervalId = setTimeout(() => {
        tick();
        schedule();
      }, delay()) as unknown as ReturnType<typeof setInterval>;
    };
    schedule();
  },

  stop() {
    if (intervalId) {
      clearTimeout(intervalId as unknown as ReturnType<typeof setTimeout>);
      intervalId = null;
    }
  },

  isRunning() {
    return intervalId !== null;
  },
};
