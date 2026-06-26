// automationTemplates.ts — Pre-built automation rule templates
import type { AutomationRule } from '../types';

export const AUTOMATION_TEMPLATES: Omit<AutomationRule, 'id' | 'createdAt' | 'runCount'>[] = [
  {
    name: 'Bedtime Routine',
    description: 'Automatically activate Sleep Mode at 11PM every night',
    trigger: { type: 'time', time: '23:00', days: [0, 1, 2, 3, 4, 5, 6] },
    actions: [{ type: 'scene', sceneId: 3 }],
    isEnabled: true,
    category: 'energy',
  },
  {
    name: 'AC + Fan Sync',
    description: 'When bedroom AC turns on, set fan to low speed',
    trigger: { type: 'device_state', deviceId: 3, condition: 'turns_on' },
    actions: [{ type: 'device_control', deviceId: 2, deviceAction: 'set_speed', deviceValue: 1 }],
    isEnabled: true,
    category: 'comfort',
  },
  {
    name: 'Energy Guard',
    description: 'When home power exceeds 3000W, turn off TV and plugs',
    trigger: { type: 'energy', energyThreshold: 3000 },
    actions: [
      { type: 'device_control', deviceId: 11, deviceAction: 'turn_off' },
      { type: 'device_control', deviceId: 12, deviceAction: 'turn_off' },
      { type: 'device_control', deviceId: 13, deviceAction: 'turn_off' },
      { type: 'notification', message: '⚡ Energy Guard: High power usage detected. TV and plugs turned off.' },
    ],
    isEnabled: true,
    category: 'energy',
  },
  {
    name: 'Morning Wake',
    description: 'Play Good Morning scene at 6:30AM on weekdays',
    trigger: { type: 'time', time: '06:30', days: [1, 2, 3, 4, 5] },
    actions: [{ type: 'scene', sceneId: 1 }],
    isEnabled: false,
    category: 'comfort',
  },
  {
    name: 'Away Saver',
    description: 'Turn everything off at 10AM on weekdays',
    trigger: { type: 'time', time: '10:00', days: [1, 2, 3, 4, 5] },
    actions: [
      { type: 'scene', sceneId: 4 },
      { type: 'notification', message: '🔒 Away Mode activated. Home secured.' },
    ],
    isEnabled: false,
    category: 'security',
  },
];
