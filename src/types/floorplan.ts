// types/floorplan.ts — All types for the Floor Plan Importer feature

export type RoomType =
  | 'bedroom'
  | 'living'
  | 'kitchen'
  | 'bathroom'
  | 'study'
  | 'balcony'
  | 'corridor'
  | 'store'
  | 'wash'

export interface Point {
  x: number
  y: number
}

export interface TracedRoom {
  id: number
  x: number
  y: number
  w: number
  h: number
  name: string
  type: RoomType
  icon: string
}

export interface ScaleData {
  pixelsPerMeter: number
  p1: Point
  p2: Point
  realDistanceMeters: number
}

export type ImportStep =
  | 'idle'
  | 'upload'
  | 'scaling'
  | 'tracing'
  | 'confirming'
  | 'generating'

export interface FloorPlanState {
  isOpen: boolean
  step: ImportStep
  imageUrl: string
  imageWidth: number
  imageHeight: number
  tracedRooms: TracedRoom[]
  scale: ScaleData | null
  activeTool: 'select' | 'draw' | 'scale'
  selectedRoomIndex: number | null
  scalePoints: Point[]
  pendingRoom: TracedRoom | null
}
