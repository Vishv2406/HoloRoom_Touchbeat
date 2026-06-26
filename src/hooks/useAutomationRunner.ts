// useAutomationRunner.ts — Thin React hook that boots the singleton engine.
// Called ONCE in AppContent. Engine runs independently of React lifecycle.

import { useEffect } from 'react';
import { automationEngine } from '../services/automationEngine';

export function useAutomationRunner() {
  useEffect(() => {
    automationEngine.start();
    return () => automationEngine.stop();
  }, []); // empty deps → runs once on mount, stops on unmount
}

// Legacy export kept for backwards compat (no longer used internally)
export function checkDeviceStateRules(_deviceId: number, _newState: boolean) {
  // Device state tracking is now handled centrally inside automationEngine tick()
}
