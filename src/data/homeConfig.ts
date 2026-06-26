// homeConfig.ts — Default home configuration with connected floor plan layout
import type { Room } from '../types';

export const DEFAULT_HOME_CONFIG: Room[] = [
  {
    id: 1,
    name: 'Master Bedroom',
    icon: '🛏️',
    position: { x: -5.5, z: -5 },
    size: { width: 7, depth: 6 },
    floorColor: '#C4956A',
    wallColor: '#D4C5B0',
    temperature: 28,
    humidity: 55,
    devices: [
      { id: 1, name: 'Ceiling Light', type: 'light', isOn: true, brightness: 100, colorTemp: 3000, energyWatts: 10, position: { x: 0, y: 2.7, z: 0 } },
      { id: 2, name: 'Ceiling Fan', type: 'fan', isOn: true, speed: 3, energyWatts: 55, position: { x: 0, y: 2.6, z: 0 } },
      { id: 3, name: 'Air Conditioner', type: 'ac', isOn: false, temperature: 24, mode: 'cool', energyWatts: 1500, position: { x: -3.2, y: 2.0, z: 0 } },
      { id: 4, name: 'Smart Plug', type: 'plug', isOn: false, energyWatts: 0, position: { x: 2, y: 0.4, z: -2.5 } },
    ],
  },
  {
    id: 2,
    name: 'Bedroom 2',
    icon: '🛏️',
    position: { x: 1.5, z: -5 },
    size: { width: 7, depth: 6 },
    floorColor: '#C4956A',
    wallColor: '#D4C5B0',
    temperature: 29,
    humidity: 52,
    devices: [
      { id: 5, name: 'Ceiling Light', type: 'light', isOn: false, brightness: 100, colorTemp: 4000, energyWatts: 10, position: { x: 0, y: 2.7, z: 0 } },
      { id: 6, name: 'Ceiling Fan', type: 'fan', isOn: false, speed: 3, energyWatts: 55, position: { x: 0, y: 2.6, z: 0 } },
      { id: 7, name: 'Smart Plug', type: 'plug', isOn: false, energyWatts: 0, position: { x: 2, y: 0.4, z: -2.5 } },
    ],
  },
  {
    id: 3,
    name: 'Living Hall',
    icon: '🛋️',
    position: { x: 0, z: 1 },
    size: { width: 14, depth: 6 },
    floorColor: '#F2EDE4',
    wallColor: '#D4C5B0',
    temperature: 30,
    humidity: 58,
    devices: [
      { id: 9, name: 'Ceiling Light', type: 'light', isOn: true, brightness: 100, colorTemp: 3500, energyWatts: 10, position: { x: 0, y: 2.7, z: 0 } },
      { id: 10, name: 'Ceiling Fan', type: 'fan', isOn: true, speed: 3, energyWatts: 55, position: { x: 0, y: 2.6, z: 0 } },
      { id: 11, name: 'Television', type: 'tv', isOn: false, volume: 50, energyWatts: 120, position: { x: 0, y: 1.2, z: -2.8 } },
      { id: 12, name: 'Smart Plug 1', type: 'plug', isOn: false, energyWatts: 0, position: { x: -4, y: 0.4, z: -2.5 } },
      { id: 13, name: 'Smart Plug 2', type: 'plug', isOn: false, energyWatts: 0, position: { x: 4, y: 0.4, z: -2.5 } },
    ],
  },
  {
    id: 4,
    name: 'Kitchen',
    icon: '🍳',
    position: { x: 10, z: 1 },
    size: { width: 6, depth: 6 },
    floorColor: '#E8E8E0',
    wallColor: '#D4C5B0',
    temperature: 32,
    humidity: 65,
    devices: [
      { id: 14, name: 'Ceiling Light', type: 'light', isOn: false, brightness: 100, colorTemp: 5000, energyWatts: 10, position: { x: 0, y: 2.7, z: 0 } },
      { id: 15, name: 'Exhaust Fan', type: 'exhaust', isOn: false, energyWatts: 30, position: { x: 2, y: 2.4, z: -2.8 } },
      { id: 16, name: 'Smart Plug', type: 'plug', isOn: false, energyWatts: 0, position: { x: 2, y: 0.4, z: 2 } },
    ],
  },
  {
    id: 5,
    name: 'Bathroom',
    icon: '🚿',
    position: { x: -9.5, z: 1 },
    size: { width: 5, depth: 6 },
    floorColor: '#F0F0F0',
    wallColor: '#D4C5B0',
    temperature: 27,
    humidity: 75,
    devices: [
      { id: 17, name: 'Ceiling Light', type: 'light', isOn: false, brightness: 100, colorTemp: 4500, energyWatts: 10, position: { x: 0, y: 2.7, z: 0 } },
      { id: 18, name: 'Geyser', type: 'geyser', isOn: false, timer: 30, energyWatts: 2000, position: { x: -1.5, y: 2.0, z: -2 } },
    ],
  },
];

export const FAN_WATT_MAP: Record<number, number> = { 1: 25, 2: 40, 3: 55, 4: 70, 5: 85 };
export const ELECTRICITY_RATE = 8;
