// utils/roomTypeDefaults.ts — Default device configs and room metadata per type
import type { Device } from '../types'
import type { RoomType } from '../types/floorplan'

// ---------- device factories ----------

let _devId = 5000 // high base to avoid clashing with existing devices

function nextId(): number {
  return ++_devId
}

function createLight(roomId: number, x = 0, y = 2.7, z = 0): Device {
  return {
    id: nextId(),
    name: 'Ceiling Light',
    type: 'light',
    isOn: false,
    brightness: 100,
    colorTemp: 4000,
    energyWatts: 10,
    position: { x, y, z },
  }
}

function createFan(roomId: number, x = 0, y = 2.6, z = 0): Device {
  return {
    id: nextId(),
    name: 'Ceiling Fan',
    type: 'fan',
    isOn: false,
    speed: 3,
    energyWatts: 55,
    position: { x, y, z },
  }
}

function createAC(x = 0, y = 2.1, z = 0): Device {
  return {
    id: nextId(),
    name: 'Air Conditioner',
    type: 'ac',
    isOn: false,
    temperature: 24,
    mode: 'cool',
    energyWatts: 1500,
    position: { x, y, z },
  }
}

function createTV(x = 0, y = 1.2, z = 0): Device {
  return {
    id: nextId(),
    name: 'Television',
    type: 'tv',
    isOn: false,
    volume: 50,
    energyWatts: 120,
    position: { x, y, z },
  }
}

function createSmartPlug(x = 0, y = 0.4, z = 0): Device {
  return {
    id: nextId(),
    name: 'Smart Plug',
    type: 'plug',
    isOn: false,
    energyWatts: 0,
    position: { x, y, z },
  }
}

function createGeyser(x = 0, y = 2.0, z = 0): Device {
  return {
    id: nextId(),
    name: 'Geyser',
    type: 'geyser',
    isOn: false,
    energyWatts: 2000,
    position: { x, y, z },
  }
}

function createExhaustFan(x = 0, y = 2.4, z = 0): Device {
  return {
    id: nextId(),
    name: 'Exhaust Fan',
    type: 'exhaust',
    isOn: false,
    energyWatts: 30,
    position: { x, y, z },
  }
}

// ---------- per-type config ----------

export const roomTypeConfig: Record<
  RoomType,
  {
    icon: string
    label: string
    floorColor: string
    wallColor: string
    defaultDevices: (roomId: number, w: number, d: number) => Device[]
  }
> = {
  bedroom: {
    icon: '🛏️',
    label: 'Bedroom',
    floorColor: '#C4956A',
    wallColor: '#D4C5B0',
    defaultDevices: (_id, w, d) => [
      createLight(_id),
      createFan(_id),
      createAC(-w / 2 + 0.3, 2.1, 0),
      createSmartPlug(w / 2 - 0.3, 0.4, d / 2 - 0.3),
    ],
  },
  living: {
    icon: '🛋️',
    label: 'Living Room',
    floorColor: '#F2EDE4',
    wallColor: '#D4C5B0',
    defaultDevices: (_id, w, d) => [
      createLight(_id),
      createFan(_id),
      createTV(0, 1.2, -d / 2 + 0.15),
      createAC(-w / 2 + 0.3, 2.1, 0),
      createSmartPlug(-w / 2 + 0.5, 0.4, d / 2 - 0.3),
      createSmartPlug(w / 2 - 0.5, 0.4, d / 2 - 0.3),
    ],
  },
  kitchen: {
    icon: '🍳',
    label: 'Kitchen',
    floorColor: '#E8E8E0',
    wallColor: '#D4C5B0',
    defaultDevices: (_id, w, d) => [
      createLight(_id),
      createExhaustFan(w / 2 - 0.3, 2.4, -d / 2 + 0.2),
      createSmartPlug(w / 2 - 0.4, 0.9, 0),
    ],
  },
  bathroom: {
    icon: '🚿',
    label: 'Bathroom',
    floorColor: '#F0F0F0',
    wallColor: '#D4C5B0',
    defaultDevices: (_id, _w, _d) => [
      createLight(_id),
      createGeyser(0, 2.0, 0),
    ],
  },
  study: {
    icon: '📚',
    label: 'Study',
    floorColor: '#EDE8E0',
    wallColor: '#D4C5B0',
    defaultDevices: (_id, w, d) => [
      createLight(_id),
      createFan(_id),
      createSmartPlug(w / 2 - 0.4, 0.4, d / 2 - 0.4),
    ],
  },
  balcony: {
    icon: '🌿',
    label: 'Balcony',
    floorColor: '#1A1A10',
    wallColor: '#242414',
    defaultDevices: (_id, _w, _d) => [createLight(_id, 0, 2.5, 0)],
  },
  corridor: {
    icon: '🚶',
    label: 'Corridor',
    floorColor: '#18181C',
    wallColor: '#1E1E24',
    defaultDevices: (_id, _w, _d) => [createLight(_id)],
  },
  store: {
    icon: '🏪',
    label: 'Store Room',
    floorColor: '#1C1814',
    wallColor: '#221E18',
    defaultDevices: (_id, _w, _d) => [createLight(_id)],
  },
  wash: {
    icon: '💧',
    label: 'Wash Area',
    floorColor: '#0A1A2A',
    wallColor: '#0E2030',
    defaultDevices: (_id, _w, _d) => [
      createLight(_id),
      createExhaustFan(0, 2.3, 0),
    ],
  },
}

export function getDefaultTemp(type: RoomType): number {
  const map: Record<RoomType, number> = {
    bedroom: 28,
    living: 30,
    kitchen: 32,
    bathroom: 27,
    study: 29,
    balcony: 34,
    corridor: 31,
    store: 30,
    wash: 28,
  }
  return map[type] ?? 30
}

export function getDefaultHumidity(type: RoomType): number {
  const map: Record<RoomType, number> = {
    bedroom: 55,
    living: 58,
    kitchen: 65,
    bathroom: 75,
    study: 52,
    balcony: 60,
    corridor: 55,
    store: 50,
    wash: 70,
  }
  return map[type] ?? 55
}

export function getRoomIcon(type: RoomType): string {
  return roomTypeConfig[type]?.icon ?? '🏠'
}

export function getRoomFloorColor(type: RoomType): string {
  return roomTypeConfig[type]?.floorColor ?? '#EDE8E0'
}

export function getRoomWallColor(type: RoomType): string {
  return roomTypeConfig[type]?.wallColor ?? '#D4C5B0'
}
