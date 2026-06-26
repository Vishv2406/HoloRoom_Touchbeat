// types.ts — All TypeScript interfaces for HOLOROOM 3D

export interface DeviceSchedule {
  onTime: string;
  offTime: string;
  days: number[];
  isEnabled: boolean;
}

export interface Device {
  id: number;
  name: string;
  type: 'light' | 'fan' | 'ac' | 'tv' | 'geyser' | 'plug' | 'exhaust';
  isOn: boolean;
  brightness?: number;
  colorTemp?: number;
  speed?: number;
  temperature?: number;
  mode?: 'cool' | 'heat' | 'fan' | 'auto' | 'dry';
  volume?: number;
  timer?: number;
  energyWatts: number;
  position: { x: number; y: number; z: number };
  rotation?: { y: number };
  isFavorite?: boolean;
  schedule?: DeviceSchedule | null;
  lastToggled?: number;
}

export interface Room {
  id: number;
  name: string;
  icon: string;
  position: { x: number; z: number };
  size: { width: number; depth: number };
  floorColor: string;
  wallColor: string;
  devices: Device[];
  temperature: number;
  humidity: number;
}

export interface SceneStep {
  deviceId: number;
  action: 'on' | 'off';
  brightness?: number;
  speed?: number;
  temperature?: number;
  mode?: string;
  volume?: number;
  timer?: number;
  delay: number;
}

export interface Scene {
  id: number;
  name: string;
  emoji: string;
  description: string;
  color: string;
  steps: SceneStep[];
  isCustom?: boolean;
  lastActivated?: number;
}

export type TriggerType = 'device_state' | 'time' | 'sun' | 'energy';
export type ActionType = 'device_control' | 'scene' | 'notification';

export interface AutomationTrigger {
  type: TriggerType;
  deviceId?: number;
  condition?: 'turns_on' | 'turns_off' | 'brightness_above' | 'brightness_below' | 'temp_above' | 'temp_below' | 'speed_above' | 'speed_below' | 'volume_above' | 'volume_below';
  value?: number;
  time?: string;
  days?: number[];
  sunEvent?: 'sunrise' | 'sunset';
  sunOffsetMinutes?: number;
  energyThreshold?: number;
}

export interface AutomationAction {
  type: ActionType;
  deviceId?: number;
  deviceAction?: 'turn_on' | 'turn_off' | 'toggle' | 'set_brightness' | 'set_temperature' | 'set_speed' | 'set_volume';
  deviceValue?: number;
  sceneId?: number;
  message?: string;
  delayMs?: number;
}

export interface AutomationRule {
  id: number;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  isEnabled: boolean;
  createdAt: number;
  lastTriggered?: number;
  runCount: number;
  category: 'comfort' | 'security' | 'energy' | 'custom';
}

export interface EnergyDataPoint {
  timestamp: number;
  totalWatts: number;
  byRoom: Record<number, number>;
  byDevice: Record<number, number>;
}

export interface EnergyHistory {
  hourly: EnergyDataPoint[];
  daily: EnergyDataPoint[];
}

export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  timestamp: number;
  isRead: boolean;
}

export interface DeviceWithRoom extends Device {
  roomId: number;
  roomName: string;
}
