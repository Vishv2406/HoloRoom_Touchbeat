// components/floorplan/ConfirmStep.tsx — Review and confirm rooms before generating
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { useFloorPlanStore } from '../../store/useFloorPlanStore'
import { pixelToMeter, metersToFeet } from '../../utils/scaleCalculator'
import { roomTypeConfig } from '../../utils/roomTypeDefaults'
import type { RoomType, TracedRoom } from '../../types/floorplan'

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

const MIN_METERS = 1.5

export default function ConfirmStep() {
  const tracedRooms = useFloorPlanStore((s) => s.tracedRooms)
  const scale = useFloorPlanStore((s) => s.scale)
  const imageUrl = useFloorPlanStore((s) => s.imageUrl)
  const updateRoom = useFloorPlanStore((s) => s.updateRoom)
  const deleteRoom = useFloorPlanStore((s) => s.deleteRoom)
  const setStep = useFloorPlanStore((s) => s.setStep)

  const [editingNameIdx, setEditingNameIdx] = useState<number | null>(null)
  const [tempName, setTempName] = useState('')

  const getWidth = (r: TracedRoom) =>
    scale ? pixelToMeter(Math.abs(r.w), scale) : Math.abs(r.w) / 40
  const getDepth = (r: TracedRoom) =>
    scale ? pixelToMeter(Math.abs(r.h), scale) : Math.abs(r.h) / 40

  const totalDevices = tracedRooms.reduce((sum, r) => {
    const cfg = roomTypeConfig[r.type]
    const count = cfg ? cfg.defaultDevices(0, getWidth(r), getDepth(r)).length : 0
    return sum + count
  }, 0)

  const totalSqFt = tracedRooms.reduce((sum, r) => {
    return sum + metersToFeet(getWidth(r)) * metersToFeet(getDepth(r))
  }, 0)

  const hasErrors = tracedRooms.some((r) => !r.name.trim())
  const hasWarnings = tracedRooms.some(
    (r) => getWidth(r) < MIN_METERS || getDepth(r) < MIN_METERS
  )

  const startEditName = (idx: number) => {
    setTempName(tracedRooms[idx].name)
    setEditingNameIdx(idx)
  }

  const commitName = (idx: number) => {
    if (tempName.trim()) updateRoom(idx, { name: tempName.trim() })
    setEditingNameIdx(null)
  }

  const handleTypeChange = (idx: number, type: RoomType) => {
    const cfg = roomTypeConfig[type]
    updateRoom(idx, { type, icon: cfg?.icon ?? '🏠' })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header info */}
      <div
        className="px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
          Confirm Your Rooms
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Review the rooms before generating your 3D smart home. Edit any details below.
        </p>
        {!scale && (
          <div
            className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)', color: 'var(--amber)' }}
          >
            <AlertTriangle size={12} />
            Scale not set — room sizes are approximate. Go back to set scale.
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Thumbnail */}
        <div
          className="shrink-0 rounded-xl overflow-hidden"
          style={{ width: 140, border: '1px solid var(--border)', background: 'var(--bg-2)' }}
        >
          <img
            src={imageUrl}
            alt="Floor plan"
            className="w-full h-full object-contain opacity-60"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['#', 'Room Name', 'Width', 'Depth', 'Type', 'Devices', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 px-2 font-semibold"
                    style={{ color: 'var(--cyan)', letterSpacing: '0.06em', background: 'var(--bg-2)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tracedRooms.map((room, i) => {
                const wM = getWidth(room)
                const dM = getDepth(room)
                const wFt = metersToFeet(wM).toFixed(1)
                const dFt = metersToFeet(dM).toFixed(1)
                const tooSmall = wM < MIN_METERS || dM < MIN_METERS
                const noName = !room.name.trim()
                const cfg = roomTypeConfig[room.type]
                const devCount = cfg ? cfg.defaultDevices(0, wM, dM).length : 0

                return (
                  <tr
                    key={room.id}
                    style={{
                      borderBottom: '1px solid rgba(30,30,58,0.5)',
                      background: i % 2 === 0 ? 'var(--bg-1)' : 'var(--bg-2)',
                    }}
                  >
                    <td className="py-2 px-2" style={{ color: 'var(--text-muted)' }}>
                      {i + 1}
                    </td>
                    <td className="py-2 px-2">
                      {editingNameIdx === i ? (
                        <input
                          autoFocus
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onBlur={() => commitName(i)}
                          onKeyDown={(e) => e.key === 'Enter' && commitName(i)}
                          className="w-full px-2 py-1 rounded text-xs outline-none"
                          style={{
                            background: 'var(--bg-0)',
                            border: '1px solid var(--cyan)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:underline"
                          style={{ color: noName ? 'var(--red)' : 'var(--text-primary)' }}
                          onClick={() => startEditName(i)}
                          title="Click to edit"
                        >
                          {room.icon} {room.name || '⚠ No name'}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2" style={{ color: tooSmall ? 'var(--amber)' : 'var(--text-secondary)' }}>
                      {wFt} ft
                    </td>
                    <td className="py-2 px-2" style={{ color: tooSmall ? 'var(--amber)' : 'var(--text-secondary)' }}>
                      {dFt} ft
                      {tooSmall && (
                        <AlertTriangle size={10} className="inline ml-1" style={{ color: 'var(--amber)' }} title="Room may be too small" />
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={room.type}
                        onChange={(e) => handleTypeChange(i, e.target.value as RoomType)}
                        className="px-2 py-1 rounded text-xs outline-none w-full"
                        style={{
                          background: 'var(--bg-0)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {ROOM_TYPES.map((rt) => (
                          <option key={rt.type} value={rt.type}>
                            {rt.emoji} {rt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px]"
                        style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)' }}
                      >
                        {devCount} devices
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => deleteRoom(i)}
                        className="w-6 h-6 flex items-center justify-center rounded hover:opacity-100 opacity-50 transition-opacity"
                        style={{ color: 'var(--red)' }}
                        title="Delete room"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary + buttons */}
      <div
        className="shrink-0 px-6 py-4 flex items-center gap-4 flex-wrap"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-1)' }}
      >
        <div
          className="flex items-center gap-4 text-xs flex-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tracedRooms.length}</span> rooms
          </span>
          <span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{totalDevices}</span> smart devices
          </span>
          <span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{Math.round(totalSqFt)}</span> sq ft
          </span>
          {hasErrors && (
            <span className="flex items-center gap-1" style={{ color: 'var(--red)' }}>
              <AlertTriangle size={11} />Some rooms need names
            </span>
          )}
          {!hasErrors && !hasWarnings && (
            <span className="flex items-center gap-1" style={{ color: 'var(--green)' }}>
              <CheckCircle size={11} />Ready to generate
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep('tracing')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
            style={{ background: 'var(--bg-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <ArrowLeft size={14} />Back to Tracing
          </button>
          <button
            onClick={() => setStep('generating')}
            disabled={hasErrors || tracedRooms.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background:
                !hasErrors && tracedRooms.length > 0
                  ? 'linear-gradient(135deg, var(--cyan), #0090BB)'
                  : 'var(--bg-3)',
              color: !hasErrors && tracedRooms.length > 0 ? '#000' : 'var(--text-muted)',
              cursor: !hasErrors && tracedRooms.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'Syne, sans-serif',
            }}
          >
            Generate 3D Model ({tracedRooms.length} rooms) <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
