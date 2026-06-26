// aiFunctions.ts — GPT function call definitions and safe executors
import type { AITool } from './aiProvider';
import { useHomeStore } from '../../store/useHomeStore';
import { useSceneStore } from '../../store/useSceneStore';
import { useAutomationStore } from '../../store/useAutomationStore';
import { useUIStore } from '../../store/useUIStore';
import type { AutomationRule, Scene } from '../../types';

// ── Tool definitions for GPT ────────────────────────────────────────────────
export const AI_TOOLS: AITool[] = [
  {
    name: 'toggleDevice',
    description: 'Turn a single device on or off. Use deviceId from the context (shown as [deviceId:N]). Optionally provide deviceName and roomName as fallback.',
    parameters: {
      type: 'object',
      properties: {
        deviceId: { type: 'number', description: 'Numeric device ID from context [deviceId:N]' },
        deviceName: { type: 'string', description: 'Device name fallback (e.g. "Ceiling Light")' },
        roomName: { type: 'string', description: 'Room name to narrow device search (e.g. "Balcony")' },
        state: { type: 'string', enum: ['on', 'off'], description: 'Target state' },
      },
      required: [],
    },
  },
  {
    name: 'updateDevice',
    description: 'Update device settings like brightness, temperature, speed, volume',
    parameters: {
      type: 'object',
      properties: {
        deviceId: { type: 'number' },
        brightness: { type: 'number', minimum: 1, maximum: 100 },
        temperature: { type: 'number', minimum: 16, maximum: 30 },
        speed: { type: 'number', minimum: 1, maximum: 5 },
        volume: { type: 'number', minimum: 0, maximum: 100 },
        mode: { type: 'string', enum: ['cool', 'heat', 'fan', 'auto', 'dry'] },
      },
      required: ['deviceId'],
    },
  },
  {
    name: 'playScene',
    description: 'Activate a scene by ID or name',
    parameters: {
      type: 'object',
      properties: {
        sceneId: { type: 'number', description: 'Scene ID to play' },
        sceneName: { type: 'string', description: 'Scene name (alternative to ID)' },
      },
    },
  },
  {
    name: 'createScene',
    description: 'Create a new smart home scene with device actions',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        emoji: { type: 'string' },
        description: { type: 'string' },
        color: { type: 'string', description: 'Hex color' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              deviceId: { type: 'number' },
              action: { type: 'string', enum: ['on', 'off'] },
              brightness: { type: 'number' },
              temperature: { type: 'number' },
              speed: { type: 'number' },
              volume: { type: 'number' },
              delay: { type: 'number' },
            },
            required: ['deviceId', 'action', 'delay'],
          },
        },
      },
      required: ['name', 'emoji', 'steps'],
    },
  },
  {
    name: 'createAutomation',
    description: 'Create a new automation rule',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string', enum: ['comfort', 'security', 'energy', 'custom'] },
        triggerType: { type: 'string', enum: ['time', 'device_state', 'energy', 'sun'] },
        triggerTime: { type: 'string', description: 'HH:MM format for time triggers' },
        triggerDays: { type: 'array', items: { type: 'number' }, description: 'Days 0=Sun..6=Sat. Empty = all days' },
        triggerDeviceId: { type: 'number' },
        triggerCondition: { type: 'string' },
        triggerValue: { type: 'number' },
        triggerSunEvent: { type: 'string', enum: ['sunrise', 'sunset'] },
        triggerEnergyThreshold: { type: 'number' },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['device_control', 'scene', 'notification'] },
              deviceId: { type: 'number' },
              deviceAction: { type: 'string', enum: ['turn_on', 'turn_off', 'toggle', 'set_brightness', 'set_temperature', 'set_speed'] },
              deviceValue: { type: 'number' },
              sceneId: { type: 'number' },
              message: { type: 'string' },
            },
            required: ['type'],
          },
        },
      },
      required: ['name', 'triggerType', 'actions'],
    },
  },
  {
    name: 'toggleAllDevicesInRoom',
    description: 'Turn ALL devices (lights, fans, AC, TV, etc.) in a specific room on or off. Use this for: "turn off all living room devices", "turn off all bedroom lights", "living room off". Provide roomName (e.g. "Living Room") and/or roomId.',
    parameters: {
      type: 'object',
      properties: {
        roomId: { type: 'number' },
        roomName: { type: 'string' },
        state: { type: 'string', enum: ['on', 'off'] },
      },
      required: ['state'],
    },
  },
  {
    name: 'toggleAllDevices',
    description: 'Turn ALL devices in the ENTIRE home on or off. Use this for: "turn off everything", "turn off all devices", "all off", "turn off all lights in all rooms", "turn off all devices in all rooms".',
    parameters: {
      type: 'object',
      properties: {
        state: { type: 'string', enum: ['on', 'off'] },
      },
      required: ['state'],
    },
  },
  {
    name: 'showNotification',
    description: 'Show a notification to the user',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        type: { type: 'string', enum: ['info', 'success', 'warning', 'danger'] },
      },
      required: ['message'],
    },
  },
];

// ── Safe executors ──────────────────────────────────────────────────────────
export interface FunctionResult {
  success: boolean;
  message: string;
}

export function executeFunctionCall(name: string, args: Record<string, unknown>): FunctionResult {
  const home = useHomeStore.getState();
  const scenes = useSceneStore.getState();
  const automation = useAutomationStore.getState();
  const ui = useUIStore.getState();

  try {
    switch (name) {
      case 'toggleDevice': {
        const id = args.deviceId ? Number(args.deviceId) : null;
        let device = id ? home.getDeviceById(id) : undefined;

        // Fallback: find by name + optional room
        if (!device && (args.deviceName || args.roomName)) {
          const devNameLower  = args.deviceName ? String(args.deviceName).toLowerCase() : '';
          const roomNameLower = args.roomName   ? String(args.roomName).toLowerCase()   : '';
          for (const room of home.rooms) {
            if (roomNameLower && !room.name.toLowerCase().includes(roomNameLower) &&
                !roomNameLower.includes(room.name.toLowerCase())) continue;
            const match = room.devices.find(d =>
              !devNameLower || d.name.toLowerCase().includes(devNameLower) ||
              d.type.toLowerCase().includes(devNameLower)
            );
            if (match) { device = match; break; }
          }
        }

        if (!device) {
          const tried = id ? `ID ${id}` : `"${args.deviceName ?? '?'}" in "${args.roomName ?? 'any room'}"`;
          return { success: false, message: `Device not found: ${tried}` };
        }
        const targetOn = args.state === 'on';
        if (device.isOn !== targetOn) home.toggleDevice(device.id);
        return { success: true, message: `${device.name} turned ${args.state}` };
      }
      case 'updateDevice': {
        const id = Number(args.deviceId);
        const device = home.getDeviceById(id);
        if (!device) return { success: false, message: `Device ${id} not found` };
        const updates: Record<string, unknown> = {};
        if (args.brightness != null) updates.brightness = Math.max(1, Math.min(100, Number(args.brightness)));
        if (args.temperature != null) updates.temperature = Math.max(16, Math.min(30, Number(args.temperature)));
        if (args.speed != null) updates.speed = Math.max(1, Math.min(5, Number(args.speed)));
        if (args.volume != null) updates.volume = Math.max(0, Math.min(100, Number(args.volume)));
        if (args.mode != null) updates.mode = args.mode;
        home.updateDevice(id, updates as any);
        return { success: true, message: `${device.name} updated: ${JSON.stringify(updates)}` };
      }
      case 'playScene': {
        let scene = scenes.scenes.find(s => s.id === Number(args.sceneId));
        if (!scene && args.sceneName) {
          scene = scenes.scenes.find(s => s.name.toLowerCase().includes(String(args.sceneName).toLowerCase()));
        }
        if (!scene) return { success: false, message: 'Scene not found' };
        scenes.playScene(scene.id);
        return { success: true, message: `Playing scene: ${scene.emoji} ${scene.name}` };
      }
      case 'createScene': {
        const maxId = Math.max(0, ...scenes.scenes.map(s => s.id));
        const newScene: Scene = {
          id: maxId + 1,
          name: String(args.name),
          emoji: String(args.emoji ?? '✨'),
          description: String(args.description ?? ''),
          color: String(args.color ?? '#7090FF'),
          steps: (args.steps as any[]) ?? [],
          isCustom: true,
        };
        scenes.addCustomScene(newScene);
        return { success: true, message: `Scene "${newScene.name}" created with ${newScene.steps.length} steps` };
      }
      case 'createAutomation': {
        const rule: Omit<AutomationRule, 'id' | 'createdAt' | 'runCount'> = {
          name: String(args.name),
          description: String(args.description ?? ''),
          category: (args.category as any) ?? 'custom',
          isEnabled: true,
          trigger: {
            type: (args.triggerType as any),
            time: args.triggerTime as string | undefined,
            days: (args.triggerDays as number[] | undefined),
            deviceId: args.triggerDeviceId as number | undefined,
            condition: args.triggerCondition as any,
            value: args.triggerValue as number | undefined,
            sunEvent: args.triggerSunEvent as any,
            energyThreshold: args.triggerEnergyThreshold as number | undefined,
          },
          actions: (args.actions as any[]) ?? [],
        };
        automation.addRule(rule);
        return { success: true, message: `Automation "${rule.name}" created` };
      }
      case 'toggleAllDevicesInRoom': {
        const targetOn = args.state === 'on';
        const roomIdArg = args.roomId != null ? Number(args.roomId) : null;
        const roomNameArg = args.roomName ? String(args.roomName).toLowerCase().trim() : '';
        let room = home.rooms.find(r => roomIdArg !== null && r.id === roomIdArg);
        if (!room && roomNameArg) {
          // Try exact match first, then partial match
          room = home.rooms.find(r => r.name.toLowerCase() === roomNameArg)
              ?? home.rooms.find(r => r.name.toLowerCase().includes(roomNameArg))
              ?? home.rooms.find(r => roomNameArg.includes(r.name.toLowerCase()));
        }
        if (!room) return { success: false, message: `Room not found: "${args.roomName ?? args.roomId}". Available rooms: ${home.rooms.map(r => r.name).join(', ')}` };
        const affected = room.devices.filter(d => d.isOn !== targetOn);
        affected.forEach(d => home.toggleDevice(d.id));
        return { success: true, message: `All devices in ${room.name} turned ${args.state} (${affected.length} device${affected.length !== 1 ? 's' : ''} changed)` };
      }
      case 'toggleAllDevices': {
        const targetOn = args.state === 'on';
        let count = 0;
        home.rooms.forEach(room => room.devices.forEach(d => {
          if (d.isOn !== targetOn) { home.toggleDevice(d.id); count++; }
        }));
        return { success: true, message: `All home devices turned ${args.state} (${count} device${count !== 1 ? 's' : ''} changed)` };
      }
      case 'showNotification': {
        ui.addNotification(String(args.message), (args.type as any) ?? 'info');
        return { success: true, message: 'Notification shown' };
      }
      default:
        return { success: false, message: `Unknown function: ${name}` };
    }
  } catch (err) {
    return { success: false, message: `Error: ${err instanceof Error ? err.message : 'unknown'}` };
  }
}
