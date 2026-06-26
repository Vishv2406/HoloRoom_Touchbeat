// automationExecutor.ts — Executes automation actions. No React, no hooks.

import type { AutomationAction } from '../types';
import { useHomeStore } from '../store/useHomeStore';
import { useSceneStore } from '../store/useSceneStore';
import { useUIStore } from '../store/useUIStore';

export function executeActions(actions: AutomationAction[], ruleName = 'Unknown Rule') {
  actions.forEach((action) => {
    const delay = action.delayMs ?? 0;

    setTimeout(() => {
      try {
        switch (action.type) {
          case 'device_control':
            executeDeviceControl(action, ruleName);
            break;

          case 'scene':
            if (action.sceneId !== undefined) {
              console.log(`[AUTOMATION] "${ruleName}" → Executing: Play Scene #${action.sceneId}`);
              useSceneStore.getState().playScene(action.sceneId);
            }
            break;

          case 'notification':
            if (action.message) {
              console.log(`[AUTOMATION] "${ruleName}" → Executing: Notification "${action.message}"`);
              useUIStore.getState().addNotification(action.message, 'info');
            }
            break;

          default:
            console.warn(`[AUTOMATION] Unknown action type: ${(action as any).type}`);
        }
      } catch (err) {
        console.error(`[AUTOMATION] Error executing action for rule "${ruleName}":`, err);
      }
    }, delay);
  });
}

function executeDeviceControl(action: AutomationAction, ruleName: string) {
  if (action.deviceId === undefined) return;
  const { toggleDevice, updateDevice, getDeviceById } = useHomeStore.getState();
  const device = getDeviceById(action.deviceId);

  if (!device) {
    console.warn(`[AUTOMATION] "${ruleName}" → Device #${action.deviceId} not found`);
    return;
  }

  const deviceAction = action.deviceAction;
  console.log(`[AUTOMATION] "${ruleName}" → Executing: ${deviceAction} on "${device.name}" (id:${device.id})`);

  switch (deviceAction) {
    case 'turn_on':
      if (!device.isOn) toggleDevice(action.deviceId);
      break;
    case 'turn_off':
      if (device.isOn) toggleDevice(action.deviceId);
      break;
    case 'toggle':
      toggleDevice(action.deviceId);
      break;
    case 'set_brightness':
      if (action.deviceValue !== undefined) {
        updateDevice(action.deviceId, { brightness: action.deviceValue });
        // Also ensure it's on
        if (!device.isOn) toggleDevice(action.deviceId);
      }
      break;
    case 'set_temperature':
      if (action.deviceValue !== undefined) {
        updateDevice(action.deviceId, { temperature: action.deviceValue });
      }
      break;
    case 'set_speed':
      if (action.deviceValue !== undefined) {
        updateDevice(action.deviceId, { speed: action.deviceValue });
        if (!device.isOn) toggleDevice(action.deviceId);
      }
      break;
    case 'set_volume':
      if (action.deviceValue !== undefined) {
        updateDevice(action.deviceId, { volume: action.deviceValue });
      }
      break;
    default:
      console.warn(`[AUTOMATION] Unknown deviceAction: ${deviceAction}`);
  }

  console.log(`[AUTOMATION] "${ruleName}" → Success`);
}
