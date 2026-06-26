// utils/scaleCalculator.ts — Scale and unit conversion utilities
import type { Point, ScaleData } from '../types/floorplan'

export function getPixelDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function calculateScale(
  p1: Point,
  p2: Point,
  realDistanceMeters: number
): ScaleData {
  const pixelDist = getPixelDistance(p1, p2)
  const pixelsPerMeter = pixelDist / realDistanceMeters
  return { pixelsPerMeter, p1, p2, realDistanceMeters }
}

export function pixelToWorldX(
  pixelX: number,
  imageWidth: number,
  scale: ScaleData
): number {
  // Center the world at origin; X in 3D = horizontal in floor plan
  return ((pixelX - imageWidth / 2) / scale.pixelsPerMeter)
}

export function pixelToWorldZ(
  pixelY: number,
  imageHeight: number,
  scale: ScaleData
): number {
  // Z in 3D = vertical in floor plan (inverted because canvas Y grows down)
  return ((pixelY - imageHeight / 2) / scale.pixelsPerMeter)
}

export function pixelToMeter(pixels: number, scale: ScaleData): number {
  return pixels / scale.pixelsPerMeter
}

export function metersToFeet(meters: number): number {
  return meters * 3.28084
}

export function feetToMeters(feet: number): number {
  return feet / 3.28084
}

export function formatSize(meters: number): string {
  const ft = metersToFeet(meters).toFixed(1)
  const m = meters.toFixed(1)
  return `${ft} ft (${m}m)`
}
