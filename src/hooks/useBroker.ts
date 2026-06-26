// useBroker.ts — Hook to access broker connection status and actions
import { useEffect } from 'react';
import { holoroomBroker } from '../services/websocketBroker';
import { useConnectionStore } from '../store/useConnectionStore';
import type { ConnectionStatus } from '../services/websocketBroker';

/** Returns live connection status from Zustand (reactive) */
export function useConnectionStatus(): ConnectionStatus {
  return useConnectionStore(s => s.status);
}

/** Wires the broker's status events into Zustand. Call once at app root. */
export function useBrokerSync() {
  useEffect(() => {
    const unsub = holoroomBroker.onStatus(status => {
      useConnectionStore.getState().setStatus(status);
    });
    return unsub;
  }, []);
}
