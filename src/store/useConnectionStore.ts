// useConnectionStore.ts — Zustand store for broker connection state
import { create } from 'zustand';
import type { ConnectionStatus, BrokerMode } from '../services/websocketBroker';

interface ConnectionState {
  status: ConnectionStatus;
  setStatus: (s: ConnectionStatus) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: {
    mode: 'disconnected' as BrokerMode,
    brokerUrl: '',
    reconnectCount: 0,
    lastConnected: null,
    lastError: null,
  },
  setStatus: (status) => set({ status }),
}));
