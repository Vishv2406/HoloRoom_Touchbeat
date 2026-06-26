// cameraPositions.ts — Camera presets and dynamic framing
import type { Room } from '../types';
import { computeHouseBounds, getRoomBounds } from './roomAdjacency';

export interface CameraPosition {
  position: [number, number, number];
  target: [number, number, number];
}

export const ROOM_CAMERA_POSITIONS: Record<number, CameraPosition> = {
  1: { position: [-5.5, 18, 8], target: [-5.5, 0, -5] },
  2: { position: [1.5, 18, 8], target: [1.5, 0, -5] },
  3: { position: [0, 20, 14], target: [0, 0, 1] },
  4: { position: [12, 18, 12], target: [10, 0, 1] },
  5: { position: [-12, 18, 12], target: [-9.5, 0, 1] },
};

export const DEFAULT_CAMERA: CameraPosition = {
  position: [18, 22, 18],
  target: [0, 0, 0],
};

export function getCameraForRoom(room: Room): CameraPosition {
  const b = getRoomBounds(room);
  const span = Math.max(b.w, b.d, 4);
  const dist = span * 1.75;
  return {
    position: [b.cx + dist * 0.62, dist * 0.92, b.cz + dist * 0.62],
    target: [b.cx, 0, b.cz],
  };
}

export function getCameraForAllRooms(rooms: Room[]): CameraPosition {
  if (rooms.length === 0) return DEFAULT_CAMERA;
  const bounds = computeHouseBounds(rooms);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 6);
  const dist = span * 1.15;
  return {
    position: [cx + dist * 0.72, dist * 0.88, cz + dist * 0.72],
    target: [cx, 0, cz],
  };
}

export function resolveCameraPreset(
  rooms: Room[],
  targetRoomId: number | null,
): CameraPosition {
  if (targetRoomId != null) {
    const preset = ROOM_CAMERA_POSITIONS[targetRoomId];
    if (preset) return preset;
    const room = rooms.find(r => r.id === targetRoomId);
    if (room) return getCameraForRoom(room);
  }
  return rooms.length > 0 ? getCameraForAllRooms(rooms) : DEFAULT_CAMERA;
}
