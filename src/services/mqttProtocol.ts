// mqttProtocol.ts — MQTT topic schema and message types for HOLOROOM
// This is the single source of truth for how the frontend talks to hardware.
//
// Topic structure:
//   home/{homeId}/room/{roomId}/device/{deviceId}/state     ← broker → UI (incoming)
//   home/{homeId}/room/{roomId}/device/{deviceId}/command   ← UI → broker (outgoing)
//   home/{homeId}/room/{roomId}/sensor                      ← broker → UI (temp/humidity)
//   home/{homeId}/status                                    ← broker → UI (online/offline)
//
// All payloads are JSON strings.

export const HOME_ID = 'holoroom_home_1'; // change per deployment

// ── Topic builders ────────────────────────────────────────────────────────

export const Topics = {
  deviceState:   (roomId: number, deviceId: number) =>
    `home/${HOME_ID}/room/${roomId}/device/${deviceId}/state`,

  deviceCommand: (roomId: number, deviceId: number) =>
    `home/${HOME_ID}/room/${roomId}/device/${deviceId}/command`,

  roomSensor:    (roomId: number) =>
    `home/${HOME_ID}/room/${roomId}/sensor`,

  homeStatus:    () =>
    `home/${HOME_ID}/status`,

  // Wildcard for subscribing to ALL device states in all rooms
  allDeviceStates: () =>
    `home/${HOME_ID}/room/+/device/+/state`,

  // Wildcard for subscribing to all room sensors
  allRoomSensors: () =>
    `home/${HOME_ID}/room/+/sensor`,
};

// ── Message payload types ─────────────────────────────────────────────────

/** Incoming: broker → UI — device state update */
export interface DeviceStatePayload {
  deviceId:    number;
  roomId:      number;
  isOn:        boolean;
  brightness?: number;   // 0-100 for lights
  colorTemp?:  number;   // Kelvin for lights
  speed?:      number;   // 1-5 for fans
  temperature?: number;  // °C for AC/geyser
  mode?:       string;   // 'cool'|'heat'|'fan'|'auto'|'dry' for AC
  volume?:     number;   // 0-100 for TV
  energyWatts?: number;  // real-time power reading
  timestamp:   number;   // Unix ms from device
}

/** Outgoing: UI → broker — control command */
export interface DeviceCommandPayload {
  action:       'turn_on' | 'turn_off' | 'toggle' | 'set';
  deviceId:     number;
  roomId:       number;
  brightness?:  number;
  colorTemp?:   number;
  speed?:       number;
  temperature?: number;
  mode?:        string;
  volume?:      number;
  requestId:    string;   // UUID for ack tracking
  timestamp:    number;
}

/** Incoming: room sensor reading */
export interface RoomSensorPayload {
  roomId:      number;
  temperature: number;
  humidity:    number;
  timestamp:   number;
}

/** Incoming: home-level connectivity status */
export interface HomeStatusPayload {
  online:    boolean;
  ipAddress?: string;
  firmware?: string;
  timestamp: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Generate a short request ID for command acknowledgement tracking */
export function newRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Parse a topic string and extract roomId and deviceId */
export function parseDeviceStateTopic(topic: string): { roomId: number; deviceId: number } | null {
  // e.g. "home/holoroom_home_1/room/3/device/11/state"
  const re = /home\/[^/]+\/room\/(\d+)\/device\/(\d+)\/state/;
  const m = topic.match(re);
  if (!m) return null;
  return { roomId: parseInt(m[1], 10), deviceId: parseInt(m[2], 10) };
}

export function parseRoomSensorTopic(topic: string): { roomId: number } | null {
  const re = /home\/[^/]+\/room\/(\d+)\/sensor/;
  const m = topic.match(re);
  if (!m) return null;
  return { roomId: parseInt(m[1], 10) };
}
