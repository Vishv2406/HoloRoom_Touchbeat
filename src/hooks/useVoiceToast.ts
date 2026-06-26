// useVoiceToast.ts — Re-export emitToast via the mqttSimulator listener system
// Voice commands reuse the same toast pipeline
import { addToastListener } from '../services/mqttSimulator';

export { addToastListener };

let counter = 10000;
type Listener = (t: { id: number; message: string; timestamp: number }) => void;
const listeners: Listener[] = [];

export function addVoiceToastListener(fn: Listener) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i > -1) listeners.splice(i, 1);
  };
}

export function emitToast(message: string) {
  counter++;
  const toast = { id: counter, message, timestamp: Date.now() };
  listeners.forEach(fn => fn(toast));
}
