// store/useFloorPlanStore.ts — Zustand store for floor plan importer state (with persistence)
import { create } from 'zustand'
import type { TracedRoom, ScaleData, ImportStep, Point } from '../types/floorplan'

const STORAGE_KEY = 'holoroom_floorplan_session'

interface PersistedSession {
  step: ImportStep
  imageBase64: string
  imageWidth: number
  imageHeight: number
  tracedRooms: TracedRoom[]
  scale: ScaleData | null
  savedAt: number
}

interface FloorPlanStore {
  // State
  isOpen: boolean
  step: ImportStep
  imageUrl: string
  imageBase64: string  // base64 for persistence
  imageWidth: number
  imageHeight: number
  tracedRooms: TracedRoom[]
  scale: ScaleData | null
  activeTool: 'select' | 'draw' | 'scale'
  selectedRoomIndex: number | null
  scalePoints: Point[]
  pendingRoom: TracedRoom | null
  hasSavedSession: boolean

  // Actions
  openImporter: () => void
  closeImporter: () => void
  setStep: (step: ImportStep) => void
  setImage: (url: string, width: number, height: number, base64?: string) => void
  addRoom: (room: TracedRoom) => void
  updateRoom: (index: number, updates: Partial<TracedRoom>) => void
  deleteRoom: (index: number) => void
  setScale: (scale: ScaleData) => void
  setSelectedRoom: (index: number | null) => void
  setActiveTool: (tool: 'select' | 'draw' | 'scale') => void
  addScalePoint: (point: Point) => void
  clearScalePoints: () => void
  setPendingRoom: (room: TracedRoom | null) => void
  resetAll: () => void
  saveSession: () => void
  loadSession: () => boolean
  clearSession: () => void
  checkSavedSession: () => void
}

const initialState = {
  isOpen: false,
  step: 'idle' as ImportStep,
  imageUrl: '',
  imageBase64: '',
  imageWidth: 0,
  imageHeight: 0,
  tracedRooms: [],
  scale: null,
  activeTool: 'draw' as const,
  selectedRoomIndex: null,
  scalePoints: [],
  pendingRoom: null,
  hasSavedSession: false,
}

export const useFloorPlanStore = create<FloorPlanStore>((set, get) => ({
  ...initialState,

  openImporter: () => set({ isOpen: true, step: 'upload' }),

  closeImporter: () => {
    // Auto-save when closing mid-session (if we have an image)
    const state = get()
    if (state.imageBase64 && state.step !== 'idle') {
      get().saveSession()
    }
    set({ isOpen: false })
  },

  setStep: (step) => {
    set({ step })
    // Auto-save on each step advance
    setTimeout(() => get().saveSession(), 50)
  },

  setImage: (url, width, height, base64 = '') =>
    set({ imageUrl: url, imageWidth: width, imageHeight: height, imageBase64: base64 }),

  addRoom: (room) => {
    set((s) => ({ tracedRooms: [...s.tracedRooms, room] }))
    setTimeout(() => get().saveSession(), 50)
  },

  updateRoom: (index, updates) => {
    set((s) => {
      const next = [...s.tracedRooms]
      next[index] = { ...next[index], ...updates }
      return { tracedRooms: next }
    })
    setTimeout(() => get().saveSession(), 50)
  },

  deleteRoom: (index) => {
    set((s) => {
      const next = s.tracedRooms.filter((_, i) => i !== index)
      return {
        tracedRooms: next,
        selectedRoomIndex:
          s.selectedRoomIndex === index
            ? null
            : s.selectedRoomIndex !== null && s.selectedRoomIndex > index
            ? s.selectedRoomIndex - 1
            : s.selectedRoomIndex,
      }
    })
    setTimeout(() => get().saveSession(), 50)
  },

  setScale: (scale) => {
    set({ scale })
    setTimeout(() => get().saveSession(), 50)
  },

  setSelectedRoom: (index) => set({ selectedRoomIndex: index }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  addScalePoint: (point) =>
    set((s) => ({ scalePoints: [...s.scalePoints, point] })),

  clearScalePoints: () => set({ scalePoints: [] }),

  setPendingRoom: (room) => set({ pendingRoom: room }),

  resetAll: () => {
    const { imageUrl } = get()
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl)
    }
    get().clearSession()
    set({ ...initialState })
  },

  saveSession: () => {
    const state = get()
    if (!state.imageBase64 || state.step === 'idle') return
    try {
      const session: PersistedSession = {
        step: state.step,
        imageBase64: state.imageBase64,
        imageWidth: state.imageWidth,
        imageHeight: state.imageHeight,
        tracedRooms: state.tracedRooms,
        scale: state.scale,
        savedAt: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      set({ hasSavedSession: true })
    } catch (e) {
      console.warn('Failed to save floor plan session:', e)
    }
  },

  loadSession: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const session: PersistedSession = JSON.parse(raw)
      if (!session.imageBase64) return false

      // Reconstruct blob URL from base64
      const byteString = atob(session.imageBase64.split(',')[1])
      const mimeMatch = session.imageBase64.match(/data:([^;]+);/)
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
      const blob = new Blob([ab], { type: mime })
      const blobUrl = URL.createObjectURL(blob)

      set({
        step: session.step === 'generating' ? 'confirming' : session.step,
        imageUrl: blobUrl,
        imageBase64: session.imageBase64,
        imageWidth: session.imageWidth,
        imageHeight: session.imageHeight,
        tracedRooms: session.tracedRooms,
        scale: session.scale,
        isOpen: true,
        hasSavedSession: true,
      })
      return true
    } catch (e) {
      console.warn('Failed to load floor plan session:', e)
      return false
    }
  },

  clearSession: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    set({ hasSavedSession: false })
  },

  checkSavedSession: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      set({ hasSavedSession: !!raw })
    } catch {}
  },
}))
