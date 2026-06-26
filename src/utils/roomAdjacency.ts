// roomAdjacency.ts — Detect shared walls between rooms for doorway openings
import type { Room } from '../types';

export const DOOR_WIDTH = 0.9;
const TOLERANCE = 0.35;

export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface RoomBounds {
  id: number;
  cx: number;
  cz: number;
  w: number;
  d: number;
  north: number;
  south: number;
  east: number;
  west: number;
}

export function getRoomBounds(room: Room): RoomBounds {
  const { x: cx, z: cz } = room.position;
  const w = room.size.width;
  const d = room.size.depth;
  return {
    id: room.id,
    cx,
    cz,
    w,
    d,
    north: cz - d / 2,
    south: cz + d / 2,
    east: cx + w / 2,
    west: cx - w / 2,
  };
}

function rangesOverlap(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return aMin < bMax - TOLERANCE && aMax > bMin + TOLERANCE;
}

/** Returns adjacent room id if another room shares this wall edge */
export function getAdjacentRoom(
  room: RoomBounds,
  side: WallSide,
  allRooms: Room[],
): number | null {
  for (const other of allRooms) {
    if (other.id === room.id) continue;
    const ob = getRoomBounds(other);

    if (side === 'north' && Math.abs(ob.south - room.north) < TOLERANCE) {
      if (rangesOverlap(room.west, room.east, ob.west, ob.east)) return other.id;
    }
    if (side === 'south' && Math.abs(ob.north - room.south) < TOLERANCE) {
      if (rangesOverlap(room.west, room.east, ob.west, ob.east)) return other.id;
    }
    if (side === 'west' && Math.abs(ob.east - room.west) < TOLERANCE) {
      if (rangesOverlap(room.north, room.south, ob.north, ob.south)) return other.id;
    }
    if (side === 'east' && Math.abs(ob.west - room.east) < TOLERANCE) {
      if (rangesOverlap(room.north, room.south, ob.north, ob.south)) return other.id;
    }
  }
  return null;
}

export function computeHouseBounds(rooms: Room[]) {
  if (rooms.length === 0) return { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const room of rooms) {
    const b = getRoomBounds(room);
    minX = Math.min(minX, b.west);
    maxX = Math.max(maxX, b.east);
    minZ = Math.min(minZ, b.north);
    maxZ = Math.max(maxZ, b.south);
  }
  const pad = 0.6;
  return { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
}
