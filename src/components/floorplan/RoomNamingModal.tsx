// components/floorplan/RoomNamingModal.tsx — Modal to name and type a drawn room
import { useEffect, useRef, useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import type { RoomType, TracedRoom } from '../../types/floorplan'
import { pixelToMeter, metersToFeet } from '../../utils/scaleCalculator'
import { getRoomIcon } from '../../utils/roomTypeDefaults'
import { useFloorPlanStore } from '../../store/useFloorPlanStore'

interface Props {
  pending: TracedRoom
  onConfirm: (name: string, type: RoomType) => void
  onCancel: () => void
}

const ROOM_TYPES: { type: RoomType; label: string; emoji: string }[] = [
  { type: 'bedroom', label: 'Bedroom', emoji: '🛏️' },
  { type: 'living', label: 'Living Room', emoji: '🛋️' },
  { type: 'kitchen', label: 'Kitchen', emoji: '🍳' },
  { type: 'bathroom', label: 'Bathroom', emoji: '🚿' },
  { type: 'study', label: 'Study', emoji: '📚' },
  { type: 'balcony', label: 'Balcony', emoji: '🌿' },
  { type: 'corridor', label: 'Corridor', emoji: '🚶' },
  { type: 'store', label: 'Store Room', emoji: '🏪' },
  { type: 'wash', label: 'Wash Area', emoji: '💧' },
]

function getSuggestedName(type: RoomType, existingRooms: TracedRoom[]): string {
  const sameType = existingRooms.filter((r) => r.type === type).length
  const base: Record<RoomType, string> = {
    bedroom: 'Bedroom',
    living: 'Living Room',
    kitchen: 'Kitchen',
    bathroom: 'Bathroom',
    study: 'Study',
    balcony: 'Balcony',
    corridor: 'Corridor/Passage',
    store: 'Store Room',
    wash: 'Wash Area',
  }
  const b = base[type]
  return sameType === 0 ? b : `${b} ${sameType + 1}`
}

export default function RoomNamingModal({ pending, onConfirm, onCancel }: Props) {
  const tracedRooms = useFloorPlanStore((s) => s.tracedRooms)
  const scale = useFloorPlanStore((s) => s.scale)

  const [type, setType] = useState<RoomType>('bedroom')
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const suggested = getSuggestedName('bedroom', tracedRooms)
    setName(suggested)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    setName(getSuggestedName(type, tracedRooms))
  }, [type])

  const widthM = scale ? pixelToMeter(Math.abs(pending.w), scale) : 0
  const depthM = scale ? pixelToMeter(Math.abs(pending.h), scale) : 0
  const widthFt = metersToFeet(widthM).toFixed(1)
  const depthFt = metersToFeet(depthM).toFixed(1)

  const handleConfirm = () => {
    if (!name.trim()) return
    onConfirm(name.trim(), type)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="rounded-2xl p-6 flex flex-col gap-5"
        style={{
          width: 440,
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
            What is this room?
          </h3>
          <button
            onClick={onCancel}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-80"
            style={{ background: 'var(--bg-3)', color: 'var(--text-muted)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Name input */}
        <div>
          <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Room Name</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Master Bedroom"
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--bg-0)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
        </div>

        {/* Type selector */}
        <div>
          <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Room Type</label>
          <div className="grid grid-cols-3 gap-2">
            {ROOM_TYPES.map((rt) => (
              <button
                key={rt.type}
                onClick={() => setType(rt.type)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left"
                style={{
                  background: type === rt.type ? 'rgba(0,212,255,0.12)' : 'var(--bg-2)',
                  border: type === rt.type ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  color: type === rt.type ? 'var(--cyan)' : 'var(--text-secondary)',
                }}
              >
                <span>{rt.emoji}</span>
                <span>{rt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Size preview */}
        {scale && (
          <div
            className="px-4 py-2.5 rounded-xl text-xs"
            style={{ background: 'var(--bg-2)', color: 'var(--text-muted)' }}
          >
            Estimated size:{' '}
            <span style={{ color: 'var(--text-primary)' }}>
              ~{widthFt} ft × {depthFt} ft
            </span>{' '}
            ({widthM.toFixed(1)}m × {depthM.toFixed(1)}m)
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--bg-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: name.trim() ? 'var(--cyan)' : 'var(--bg-3)',
              color: name.trim() ? '#000' : 'var(--text-muted)',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Add Room <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
