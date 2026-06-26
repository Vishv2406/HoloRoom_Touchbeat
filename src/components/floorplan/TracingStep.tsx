// components/floorplan/TracingStep.tsx — Interactive canvas for tracing rooms on floor plan
import { useRef, useState, useEffect, useCallback } from 'react'
import { ArrowRight, Trash2, MousePointer, Square, Ruler, RotateCcw } from 'lucide-react'
import { useFloorPlanStore } from '../../store/useFloorPlanStore'
import { pixelToMeter, metersToFeet } from '../../utils/scaleCalculator'
import { getRoomIcon } from '../../utils/roomTypeDefaults'
import type { TracedRoom, RoomType, Point } from '../../types/floorplan'
import RoomNamingModal from './RoomNamingModal'

type DragMode = 'none' | 'move' | 'resize'
type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'tm' | 'bm' | 'ml' | 'mr'

const MIN_DRAW_PX = 20

function getHandles(r: TracedRoom): { handle: Handle; x: number; y: number }[] {
  return [
    { handle: 'tl', x: r.x, y: r.y },
    { handle: 'tr', x: r.x + r.w, y: r.y },
    { handle: 'bl', x: r.x, y: r.y + r.h },
    { handle: 'br', x: r.x + r.w, y: r.y + r.h },
    { handle: 'tm', x: r.x + r.w / 2, y: r.y },
    { handle: 'bm', x: r.x + r.w / 2, y: r.y + r.h },
    { handle: 'ml', x: r.x, y: r.y + r.h / 2 },
    { handle: 'mr', x: r.x + r.w, y: r.y + r.h / 2 },
  ]
}

function hitHandle(mx: number, my: number, r: TracedRoom): Handle | null {
  for (const h of getHandles(r)) {
    if (Math.abs(mx - h.x) <= 8 && Math.abs(my - h.y) <= 8) return h.handle
  }
  return null
}

function hitRoom(mx: number, my: number, rooms: TracedRoom[]): number {
  for (let i = rooms.length - 1; i >= 0; i--) {
    const r = rooms[i]
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i
  }
  return -1
}

export default function TracingStep() {
  const imageUrl = useFloorPlanStore((s) => s.imageUrl)
  const imageWidth = useFloorPlanStore((s) => s.imageWidth)
  const imageHeight = useFloorPlanStore((s) => s.imageHeight)
  const tracedRooms = useFloorPlanStore((s) => s.tracedRooms)
  const selectedRoomIndex = useFloorPlanStore((s) => s.selectedRoomIndex)
  const scale = useFloorPlanStore((s) => s.scale)
  const addRoom = useFloorPlanStore((s) => s.addRoom)
  const updateRoom = useFloorPlanStore((s) => s.updateRoom)
  const deleteRoom = useFloorPlanStore((s) => s.deleteRoom)
  const setSelectedRoom = useFloorPlanStore((s) => s.setSelectedRoom)
  const setStep = useFloorPlanStore((s) => s.setStep)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(new Image())
  const [imgLoaded, setImgLoaded] = useState(false)
  const [layout, setLayout] = useState({ ox: 0, oy: 0, dw: 0, dh: 0 })

  // Drawing state
  const [tool, setTool] = useState<'select' | 'draw'>('draw')
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<Point | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<Point | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number>(-1)

  // Drag/resize
  const [dragMode, setDragMode] = useState<DragMode>('none')
  const [dragHandle, setDragHandle] = useState<Handle | null>(null)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })
  const dragRoomSnapshot = useRef<TracedRoom | null>(null)

  // History for undo
  const [history, setHistory] = useState<TracedRoom[][]>([])

  // Naming modal
  const [pendingRect, setPendingRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // Load image
  useEffect(() => {
    const img = imgRef.current
    img.onload = () => setImgLoaded(true)
    img.src = imageUrl
  }, [imageUrl])

  // Compute layout
  const computeLayout = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgLoaded) return
    const cw = canvas.width
    const ch = canvas.height
    const ar = imageWidth / imageHeight
    let dw = cw, dh = dw / ar
    if (dh > ch) { dh = ch; dw = dh * ar }
    const ox = (cw - dw) / 2
    const oy = (ch - dh) / 2
    setLayout({ ox, oy, dw, dh })
  }, [imgLoaded, imageWidth, imageHeight])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      computeLayout()
    })
    ro.observe(canvas)
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    computeLayout()
    return () => ro.disconnect()
  }, [computeLayout])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgLoaded) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const { ox, oy, dw, dh } = layout
    if (!dw || !dh) return

    ctx.globalAlpha = 0.45
    ctx.drawImage(imgRef.current, ox, oy, dw, dh)
    ctx.globalAlpha = 1

    tracedRooms.forEach((room, index) => {
      const isSel = index === selectedRoomIndex
      const isHov = index === hoveredIndex && !isSel

      ctx.fillStyle = isSel
        ? 'rgba(0,212,255,0.18)'
        : isHov
        ? 'rgba(0,212,255,0.10)'
        : 'rgba(0,212,255,0.06)'
      ctx.fillRect(room.x, room.y, room.w, room.h)

      ctx.strokeStyle = isSel ? '#00D4FF' : '#006688'
      ctx.lineWidth = isSel ? 2 : 1
      if (!isSel) ctx.setLineDash([4, 3])
      else ctx.setLineDash([])
      ctx.strokeRect(room.x, room.y, room.w, room.h)
      ctx.setLineDash([])

      ctx.font = 'bold 12px Syne, sans-serif'
      ctx.fillStyle = '#00D4FF'
      ctx.fillText(`${room.icon} ${room.name}`, room.x + 8, room.y + 20)

      if (scale) {
        ctx.font = '10px DM Sans, sans-serif'
        ctx.fillStyle = '#8080A0'
        const wFt = metersToFeet(pixelToMeter(Math.abs(room.w), scale)).toFixed(1)
        const hFt = metersToFeet(pixelToMeter(Math.abs(room.h), scale)).toFixed(1)
        ctx.fillText(`${wFt}ft × ${hFt}ft`, room.x + 8, room.y + 36)
      }

      if (isSel) {
        getHandles(room).forEach((h) => {
          ctx.fillStyle = '#00D4FF'
          ctx.fillRect(h.x - 4, h.y - 4, 8, 8)
          ctx.strokeStyle = '#FFFFFF'
          ctx.lineWidth = 1
          ctx.strokeRect(h.x - 4, h.y - 4, 8, 8)
        })
      }
    })

    if (isDrawing && drawStart && drawCurrent) {
      const x = Math.min(drawStart.x, drawCurrent.x)
      const y = Math.min(drawStart.y, drawCurrent.y)
      const w = Math.abs(drawCurrent.x - drawStart.x)
      const h = Math.abs(drawCurrent.y - drawStart.y)
      ctx.fillStyle = 'rgba(0,212,255,0.10)'
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = '#00D4FF'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 5])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
    }
  }, [tracedRooms, selectedRoomIndex, hoveredIndex, isDrawing, drawStart, drawCurrent, scale, imgLoaded, layout])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e)

    if (tool === 'draw') {
      setIsDrawing(true)
      setDrawStart(pos)
      setDrawCurrent(pos)
      return
    }

    // Select tool
    if (selectedRoomIndex !== null) {
      const room = tracedRooms[selectedRoomIndex]
      const handle = hitHandle(pos.x, pos.y, room)
      if (handle) {
        setDragMode('resize')
        setDragHandle(handle)
        dragRoomSnapshot.current = { ...room }
        return
      }
      // Hit body to move
      if (pos.x >= room.x && pos.x <= room.x + room.w && pos.y >= room.y && pos.y <= room.y + room.h) {
        setDragMode('move')
        setDragOffset({ x: pos.x - room.x, y: pos.y - room.y })
        dragRoomSnapshot.current = { ...room }
        return
      }
    }

    // Click elsewhere — try to select another room
    const idx = hitRoom(pos.x, pos.y, tracedRooms)
    setSelectedRoom(idx === -1 ? null : idx)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e)

    if (tool === 'draw') {
      if (isDrawing) setDrawCurrent(pos)
      return
    }

    // Hover detection
    const idx = hitRoom(pos.x, pos.y, tracedRooms)
    setHoveredIndex(idx)

    if (dragMode === 'move' && selectedRoomIndex !== null) {
      updateRoom(selectedRoomIndex, {
        x: pos.x - dragOffset.x,
        y: pos.y - dragOffset.y,
      })
      return
    }

    if (dragMode === 'resize' && selectedRoomIndex !== null && dragRoomSnapshot.current) {
      const snap = dragRoomSnapshot.current
      const r = { ...tracedRooms[selectedRoomIndex] }
      switch (dragHandle) {
        case 'tl': r.x = pos.x; r.y = pos.y; r.w = snap.x + snap.w - pos.x; r.h = snap.y + snap.h - pos.y; break
        case 'tr': r.y = pos.y; r.w = pos.x - snap.x; r.h = snap.y + snap.h - pos.y; break
        case 'bl': r.x = pos.x; r.w = snap.x + snap.w - pos.x; r.h = pos.y - snap.y; break
        case 'br': r.w = pos.x - snap.x; r.h = pos.y - snap.y; break
        case 'tm': r.y = pos.y; r.h = snap.y + snap.h - pos.y; break
        case 'bm': r.h = pos.y - snap.y; break
        case 'ml': r.x = pos.x; r.w = snap.x + snap.w - pos.x; break
        case 'mr': r.w = pos.x - snap.x; break
      }
      if (Math.abs(r.w) >= MIN_DRAW_PX && Math.abs(r.h) >= MIN_DRAW_PX) {
        updateRoom(selectedRoomIndex, r)
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'draw' && isDrawing && drawStart) {
      const pos = getPos(e)
      const x = Math.min(drawStart.x, pos.x)
      const y = Math.min(drawStart.y, pos.y)
      const w = Math.abs(pos.x - drawStart.x)
      const h = Math.abs(pos.y - drawStart.y)
      setIsDrawing(false)
      setDrawStart(null)
      setDrawCurrent(null)
      if (w >= MIN_DRAW_PX && h >= MIN_DRAW_PX) {
        setPendingRect({ x, y, w, h })
      }
      return
    }

    if (dragMode !== 'none') {
      // push to history
      setHistory((prev) => [...prev.slice(-19), tracedRooms.slice(0, -1).concat(tracedRooms.slice(-1))])
    }
    setDragMode('none')
    setDragHandle(null)
    dragRoomSnapshot.current = null
  }

  const handleNamingConfirm = (name: string, type: RoomType) => {
    if (!pendingRect) return
    setHistory((prev) => [...prev.slice(-19), [...tracedRooms]])
    const newRoom: TracedRoom = {
      id: Date.now(),
      x: pendingRect.x,
      y: pendingRect.y,
      w: pendingRect.w,
      h: pendingRect.h,
      name,
      type,
      icon: getRoomIcon(type),
    }
    addRoom(newRoom)
    setSelectedRoom(tracedRooms.length) // select the just-added room
    setPendingRect(null)
  }

  const handleNamingCancel = () => setPendingRect(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (pendingRect) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedRoomIndex !== null) {
          setHistory((prev) => [...prev.slice(-19), [...tracedRooms]])
          deleteRoom(selectedRoomIndex)
        }
      }
      if (e.key === 'Escape') setSelectedRoom(null)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        setHistory((prev) => {
          if (prev.length === 0) return prev
          const last = prev[prev.length - 1]
          useFloorPlanStore.setState({ tracedRooms: last, selectedRoomIndex: null })
          return prev.slice(0, -1)
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedRoomIndex, tracedRooms, pendingRect, deleteRoom, setSelectedRoom])

  const getCursor = () => {
    if (tool === 'draw') return isDrawing ? 'crosshair' : 'crosshair'
    if (dragMode === 'move') return 'grabbing'
    return 'default'
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar */}
      <div
        className="flex flex-col shrink-0"
        style={{ width: 220, borderRight: '1px solid var(--border)', background: 'var(--bg-1)' }}
      >
        <div className="p-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            TOOLS
          </p>
          <div className="flex flex-col gap-1">
            <ToolButton active={tool === 'select'} onClick={() => setTool('select')} icon={<MousePointer size={13} />} label="Select / Move" />
            <ToolButton active={tool === 'draw'} onClick={() => setTool('draw')} icon={<Square size={13} />} label="Draw Room" />
            <ToolButton active={false} onClick={() => setStep('scaling')} icon={<Ruler size={13} />} label="Set Scale" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            ROOMS ({tracedRooms.length})
          </p>
          <div className="flex flex-col gap-1">
            {tracedRooms.map((room, i) => (
              <div
                key={room.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
                style={{
                  background: i === selectedRoomIndex ? 'rgba(0,212,255,0.1)' : 'transparent',
                  border: i === selectedRoomIndex ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
                }}
                onClick={() => setSelectedRoom(i)}
              >
                <span className="text-sm shrink-0">{room.icon}</span>
                <span
                  className="text-xs flex-1 truncate"
                  style={{ color: i === selectedRoomIndex ? 'var(--cyan)' : 'var(--text-secondary)' }}
                >
                  {room.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setHistory((prev) => [...prev.slice(-19), [...tracedRooms]])
                    deleteRoom(i)
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded hover:opacity-100 opacity-40 transition-opacity"
                  style={{ color: 'var(--red)' }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            {tracedRooms.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                No rooms yet. Draw on the canvas →
              </p>
            )}
          </div>
        </div>

        <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          {history.length > 0 && (
            <button
              onClick={() =>
                setHistory((prev) => {
                  if (prev.length === 0) return prev
                  const last = prev[prev.length - 1]
                  useFloorPlanStore.setState({ tracedRooms: last, selectedRoomIndex: null })
                  return prev.slice(0, -1)
                })
              }
              className="flex items-center gap-1.5 text-xs mb-2 px-2 py-1.5 rounded-lg w-full transition-all hover:opacity-80"
              style={{ background: 'var(--bg-2)', color: 'var(--text-muted)' }}
            >
              <RotateCcw size={11} />Undo (Ctrl+Z)
            </button>
          )}
          <button
            onClick={() => setStep('confirming')}
            disabled={tracedRooms.length === 0}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tracedRooms.length > 0 ? 'var(--cyan)' : 'var(--bg-3)',
              color: tracedRooms.length > 0 ? '#000' : 'var(--text-muted)',
              cursor: tracedRooms.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'Syne, sans-serif',
            }}
          >
            Review Rooms <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block', cursor: getCursor() }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setHoveredIndex(-1); if (isDrawing) { setIsDrawing(false); setDrawStart(null); setDrawCurrent(null) } }}
          />
        </div>

        {/* Bottom bar */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-2.5 text-xs gap-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-muted)' }}
        >
          <span>
            {tool === 'draw'
              ? 'Click and drag to draw a room rectangle'
              : 'Click to select · Drag to move · Drag handles to resize'}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {tracedRooms.length} room{tracedRooms.length !== 1 ? 's' : ''} traced
          </span>
          <span style={{ opacity: 0.5 }}>Delete key removes selected · Ctrl+Z to undo</span>
        </div>
      </div>

      {/* Room naming modal */}
      {pendingRect && (
        <RoomNamingModal
          pending={{ id: 0, x: pendingRect.x, y: pendingRect.y, w: pendingRect.w, h: pendingRect.h, name: '', type: 'bedroom', icon: '🛏️' }}
          onConfirm={handleNamingConfirm}
          onCancel={handleNamingCancel}
        />
      )}
    </div>
  )
}

function ToolButton({
  active, onClick, icon, label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full text-left transition-all"
      style={{
        background: active ? 'rgba(0,212,255,0.1)' : 'transparent',
        border: active ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
        color: active ? 'var(--cyan)' : 'var(--text-secondary)',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
