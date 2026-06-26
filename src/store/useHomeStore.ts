// useHomeStore.ts — Main Zustand store for rooms, devices, and home state
import { create } from 'zustand';
import { produce } from 'immer';
import { DEFAULT_HOME_CONFIG, FAN_WATT_MAP } from '../data/homeConfig';
import type { Room, Device, DeviceWithRoom } from '../types';

interface HomeState {
  rooms: Room[];
  selectedDevice: DeviceWithRoom | null;
  selectedRoom: Room | null;
  cameraTargetRoom: number | null;
  homeName: string;
  showEnergyAura: boolean;
  isDesignMode: boolean;
  electricityRate: number;
  importedFromFloorPlan: boolean;
  floorPlanImageUrl: string | null;

  toggleDevice: (deviceId: number) => void;
  updateDevice: (deviceId: number, updates: Partial<Device>) => void;
  selectDevice: (device: Device, roomId: number, roomName: string) => void;
  selectRoom: (room: Room | null) => void;
  closePanel: () => void;
  setCameraTarget: (roomId: number | null) => void;
  setHomeName: (name: string) => void;
  toggleEnergyAura: () => void;
  setDesignMode: (val: boolean) => void;
  updateRoomConfig: (roomId: number, updates: Partial<Pick<Room, 'name' | 'icon' | 'floorColor' | 'wallColor' | 'size'>>) => void;
  updateRoomPosition: (roomId: number, pos: { x: number; z: number }) => void;
  addRoom: (room: Room) => void;
  deleteRoom: (roomId: number) => void;
  addDeviceToRoom: (roomId: number, device: Device) => void;
  removeDeviceFromRoom: (roomId: number, deviceId: number) => void;
  renameDevice: (deviceId: number, newName: string) => void;
  resetToDefault: () => void;
  saveLayoutToStorage: () => void;
  loadLayoutFromStorage: () => void;
  setElectricityRate: (rate: number) => void;
  loadFromFloorPlan: (rooms: Room[]) => void;
  updateRoomSensor: (roomId: number, data: { temperature?: number; humidity?: number }) => void;
  clearFloorPlanRooms: () => void;

  getTotalPower: () => number;
  getActiveDeviceCount: () => number;
  getAllDevices: () => DeviceWithRoom[];
  getDeviceById: (id: number) => Device | undefined;
}

function computeDeviceWatts(device: Device): number {
  if (!device.isOn) return 0;
  switch (device.type) {
    case 'light': return (device.energyWatts) * ((device.brightness ?? 100) / 100);
    case 'fan': return FAN_WATT_MAP[device.speed ?? 3] ?? 55;
    case 'ac': return device.energyWatts;
    case 'tv': return device.energyWatts;
    case 'geyser': return device.energyWatts;
    case 'plug': return 50;
    case 'exhaust': return device.energyWatts;
    default: return device.energyWatts;
  }
}

export const useHomeStore = create<HomeState>((set, get) => ({
  rooms: DEFAULT_HOME_CONFIG,
  selectedDevice: null,
  selectedRoom: null,
  cameraTargetRoom: null,
  homeName: 'My Smart Home',
  showEnergyAura: false,
  isDesignMode: false,
  electricityRate: 8,
  importedFromFloorPlan: false,
  floorPlanImageUrl: null,

  toggleDevice: (deviceId) => {
    let newIsOn = false;
    let foundRoomId = -1;
    set(produce<HomeState>((state) => {
      for (const room of state.rooms) {
        const device = room.devices.find(d => d.id === deviceId);
        if (device) {
          device.isOn = !device.isOn;
          device.lastToggled = Date.now();
          newIsOn = device.isOn;
          foundRoomId = room.id;
          break;
        }
      }
    }));
    // Publish command to real broker (or no-op in mock mode)
    if (foundRoomId !== -1) {
      import('../services/websocketBroker').then(({ holoroomBroker }) => {
        holoroomBroker.publishCommand(foundRoomId, deviceId, {
          action: newIsOn ? 'turn_on' : 'turn_off',
          deviceId,
          roomId: foundRoomId,
        });
      });
    }
    // Log activity event
    import('../store/useActivityStore').then(({ useActivityStore }) => {
      useActivityStore.getState().logEvent(deviceId, newIsOn);
    });
  },

  updateDevice: (deviceId, updates) => {
    set(produce<HomeState>((state) => {
      for (const room of state.rooms) {
        const device = room.devices.find(d => d.id === deviceId);
        if (device) {
          Object.assign(device, updates);
          break;
        }
      }
      if (state.selectedDevice?.id === deviceId) {
        Object.assign(state.selectedDevice, updates);
      }
    }));
  },

  selectDevice: (device, roomId, roomName) => {
    set({ selectedDevice: { ...device, roomId, roomName }, selectedRoom: null });
  },

  selectRoom: (room) => {
    set({ selectedRoom: room, selectedDevice: null });
  },

  closePanel: () => {
    set({ selectedDevice: null, selectedRoom: null });
  },

  setCameraTarget: (roomId) => set({ cameraTargetRoom: roomId }),

  setHomeName: (name) => set({ homeName: name }),

  toggleEnergyAura: () => set(s => ({ showEnergyAura: !s.showEnergyAura })),

  setDesignMode: (val) => set({ isDesignMode: val }),

  updateRoomConfig: (roomId, updates) => {
    set(produce<HomeState>((state) => {
      const room = state.rooms.find(r => r.id === roomId);
      if (room) Object.assign(room, updates);
    }));
  },

  updateRoomPosition: (roomId, pos) => {
    set(produce<HomeState>((state) => {
      const room = state.rooms.find(r => r.id === roomId);
      if (room) room.position = pos;
    }));
  },

  addRoom: (room) => {
    set(produce<HomeState>((state) => {
      state.rooms.push(room);
    }));
  },

  deleteRoom: (roomId) => {
    set(produce<HomeState>((state) => {
      state.rooms = state.rooms.filter(r => r.id !== roomId);
      if (state.selectedRoom?.id === roomId) state.selectedRoom = null;
    }));
  },

  addDeviceToRoom: (roomId, device) => {
    set(produce<HomeState>((state) => {
      const room = state.rooms.find(r => r.id === roomId);
      if (room) room.devices.push(device);
    }));
  },

  removeDeviceFromRoom: (roomId, deviceId) => {
    set(produce<HomeState>((state) => {
      const room = state.rooms.find(r => r.id === roomId);
      if (room) room.devices = room.devices.filter(d => d.id !== deviceId);
      if (state.selectedDevice?.id === deviceId) state.selectedDevice = null;
    }));
  },

  renameDevice: (deviceId, newName) => {
    set(produce<HomeState>((state) => {
      for (const room of state.rooms) {
        const device = room.devices.find(d => d.id === deviceId);
        if (device) { device.name = newName; break; }
      }
      if (state.selectedDevice?.id === deviceId) state.selectedDevice.name = newName;
    }));
  },

  resetToDefault: () => set({ rooms: DEFAULT_HOME_CONFIG, selectedDevice: null, selectedRoom: null }),

  saveLayoutToStorage: () => {
    try {
      localStorage.setItem('holoroom_layout', JSON.stringify(get().rooms));
      localStorage.setItem('holoroom_name', get().homeName);
    } catch {}
  },

  loadLayoutFromStorage: () => {
    try {
      const layout = localStorage.getItem('holoroom_layout');
      const name = localStorage.getItem('holoroom_name');
      if (layout) {
        const parsed = JSON.parse(layout) as Room[];
        const rooms = parsed.map((r) => ({
          ...r,
          size: {
            width: Math.max(3, r.size?.width ?? 5),
            depth: Math.max(3, r.size?.depth ?? 5),
          },
          wallColor: r.wallColor || '#D4C5B0',
          floorColor: r.floorColor || '#EDE8E0',
        }));
        set({ rooms });
      }
      if (name) set({ homeName: name });
    } catch {}
  },

  setElectricityRate: (rate) => set({ electricityRate: rate }),

  loadFromFloorPlan: (rooms) => {
    set({
      rooms,
      importedFromFloorPlan: true,
      selectedDevice: null,
      selectedRoom: rooms.length > 0 ? rooms[0] : null,
      cameraTargetRoom: rooms.length > 0 ? rooms[0].id : null,
    });
    try {
      localStorage.setItem('holoroom_rooms_v2', JSON.stringify(rooms));
    } catch {}
  },

  updateRoomSensor: (roomId, data) => {
    set(produce<HomeState>((state) => {
      const room = state.rooms.find(r => r.id === roomId);
      if (room) {
        if (data.temperature !== undefined) room.temperature = data.temperature;
        if (data.humidity !== undefined) room.humidity = data.humidity;
      }
    }));
  },

  clearFloorPlanRooms: () => {
    set({
      rooms: DEFAULT_HOME_CONFIG,
      importedFromFloorPlan: false,
      floorPlanImageUrl: null,
      selectedDevice: null,
      selectedRoom: null,
    });
  },

  getTotalPower: () => {
    return get().rooms.reduce((total, room) =>
      total + room.devices.reduce((rt, d) => rt + computeDeviceWatts(d), 0), 0);
  },

  getActiveDeviceCount: () => {
    return get().rooms.reduce((total, room) =>
      total + room.devices.filter(d => d.isOn).length, 0);
  },

  getAllDevices: () => {
    const result: DeviceWithRoom[] = [];
    for (const room of get().rooms) {
      for (const device of room.devices) {
        result.push({ ...device, roomId: room.id, roomName: room.name });
      }
    }
    return result;
  },

  getDeviceById: (id) => {
    for (const room of get().rooms) {
      const d = room.devices.find(d => d.id === id);
      if (d) return d;
    }
    return undefined;
  },
}));

export { computeDeviceWatts };

// Extend store - we'll use the updateDevice method for position/rotation
// Additional exports for convenience
export const moveDevice = (deviceId: number, position: { x: number; y: number; z: number }) => {
  useHomeStore.getState().updateDevice(deviceId, { position });
};

export const rotateDevice = (deviceId: number, rotationY: number) => {
  useHomeStore.getState().updateDevice(deviceId, { rotation: { y: rotationY } });
};
