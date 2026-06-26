// utils/floorPlanConverter.ts — Converts traced floor plan rooms to 3D Room objects
import type { Room } from '../types'
import type { TracedRoom, ScaleData } from '../types/floorplan'
import { pixelToMeter, pixelToWorldX, pixelToWorldZ } from './scaleCalculator'
import {
  roomTypeConfig,
  getDefaultTemp,
  getDefaultHumidity,
} from './roomTypeDefaults'

const MIN_ROOM_METERS = 1.5

export function validateRooms(
  tracedRooms: TracedRoom[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (tracedRooms.length === 0) {
    errors.push('No rooms traced — draw at least one room.')
  }
  tracedRooms.forEach((r, i) => {
    if (!r.name.trim()) errors.push(`Room #${i + 1} has no name.`)
  })
  return { valid: errors.length === 0, errors }
}

export function generateHomeFromFloorPlan(
  tracedRooms: TracedRoom[],
  scale: ScaleData,
  imageWidth: number,
  imageHeight: number
): Room[] {
  // Compute pixel centre of all rooms to place origin at plan centre
  let totalX = 0
  let totalY = 0
  tracedRooms.forEach((r) => {
    totalX += r.x + r.w / 2
    totalY += r.y + r.h / 2
  })
  const centrePixelX = tracedRooms.length ? totalX / tracedRooms.length : imageWidth / 2
  const centrePixelY = tracedRooms.length ? totalY / tracedRooms.length : imageHeight / 2

  const rooms: Room[] = tracedRooms.map((tr, index) => {
    const widthMeters = Math.max(pixelToMeter(Math.abs(tr.w), scale), MIN_ROOM_METERS)
    const depthMeters = Math.max(pixelToMeter(Math.abs(tr.h), scale), MIN_ROOM_METERS)

    // Room pixel centre relative to plan centre → world coordinates
    const roomPixelCX = tr.x + tr.w / 2
    const roomPixelCY = tr.y + tr.h / 2
    const worldX = (roomPixelCX - centrePixelX) / scale.pixelsPerMeter
    const worldZ = (roomPixelCY - centrePixelY) / scale.pixelsPerMeter

    const cfg = roomTypeConfig[tr.type]
    const devices = cfg
      ? cfg.defaultDevices(index + 100, widthMeters, depthMeters)
      : []

    return {
      id: index + 100,
      name: tr.name,
      icon: tr.icon,
      position: { x: worldX, z: worldZ },
      size: { width: widthMeters, depth: depthMeters },
      floorColor: cfg?.floorColor ?? '#14142A',
      wallColor: cfg?.wallColor ?? '#1A1A35',
      devices,
      temperature: getDefaultTemp(tr.type),
      humidity: getDefaultHumidity(tr.type),
    }
  })

  return rooms
}
