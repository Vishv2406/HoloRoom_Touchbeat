// components/floorplan/ScaleSetterStep.tsx — Set the real-world scale of the floor plan
import { useRef, useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ArrowRight, SkipForward, Info } from 'lucide-react'
import { useFloorPlanStore } from '../../store/useFloorPlanStore'
import { calculateScale, feetToMeters, getPixelDistance } from '../../utils/scaleCalculator'
import type { Point } from '../../types/floorplan'

export default function ScaleSetterStep() {
  const imageUrl = useFloorPlanStore((s) => s.imageUrl)
  const imageWidth = useFloorPlanStore((s) => s.imageWidth)
  const imageHeight = useFloorPlanStore((s) => s.imageHeight)
  const setScale = useFloorPlanStore((s) => s.setScale)
  const setStep = useFloorPlanStore((s) => s.setStep)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(new Image())
  const [imgLoaded, setImgLoaded] = useState(false)
  const [points, setPoints] = useState<Point[]>([])
  const [distance, setDistance] = useState('')
  const [unit, setUnit] = useState<'ft' | 'm'>('ft')
  const [scalePx, setScalePx] = useState<number | null>(null)
  const [error, setError] = useState('')

  // Canvas layout
  const [layout, setLayout] = useState({ offsetX: 0, offsetY: 0, drawW: 0, drawH: 0 })

  // Load image
  useEffect(() => {
    const img = imgRef.current
    img.onload = () => setImgLoaded(true)
    img.src = imageUrl
  }, [imageUrl])

  // Compute layout on resize
  const computeLayout = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgLoaded) return
    const cw = canvas.width
    const ch = canvas.height
    const ar = imageWidth / imageHeight
    let drawW = cw
    let drawH = drawW / ar
    if (drawH > ch) { drawH = ch; drawW = drawH * ar }
    const offsetX = (cw - drawW) / 2
    const offsetY = (ch - drawH) / 2
    setLayout({ offsetX, offsetY, drawW, drawH })
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
    const { offsetX, offsetY, drawW, drawH } = layout
    if (!drawW || !drawH) return

    ctx.globalAlpha = 0.6
    ctx.drawImage(imgRef.current, offsetX, offsetY, drawW, drawH)
    ctx.globalAlpha = 1

    if (points.length >= 1) {
      const p1 = points[0]
      ctx.beginPath()
      ctx.arc(p1.x, p1.y, 6, 0, Math.PI * 2)
      ctx.fillStyle = 'var(--cyan, #00D4FF)'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    if (points.length >= 2) {
      const p1 = points[0]
      const p2 = points[1]
      ctx.beginPath()
      ctx.setLineDash([8, 5])
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.strokeStyle = '#00D4FF'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.setLineDash([])

      ctx.beginPath()
      ctx.arc(p2.x, p2.y, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#00D4FF'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Distance label
      const mx = (p1.x + p2.x) / 2
      const my = (p1.y + p2.y) / 2
      const px = getPixelDistance(p1, p2)
      ctx.fillStyle = 'rgba(10,10,20,0.8)'
      ctx.fillRect(mx - 34, my - 14, 68, 18)
      ctx.font = '11px DM Sans, sans-serif'
      ctx.fillStyle = '#00D4FF'
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.round(px)}px`, mx, my)
      ctx.textAlign = 'left'
    }
  }, [imgLoaded, points, layout])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (points.length >= 2) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setPoints((prev) => [...prev, { x, y }])
  }

  const handleConfirm = () => {
    setError('')
    const val = parseFloat(distance)
    if (isNaN(val) || val <= 0) { setError('Enter a valid positive distance.'); return }
    const realM = unit === 'ft' ? feetToMeters(val) : val
    const scale = calculateScale(points[0], points[1], realM)
    setScalePx(scale.pixelsPerMeter)
    setScale(scale)
  }

  const handleSkip = () => {
    // Default: 40px per meter
    const defaultScale = { pixelsPerMeter: 40, p1: { x: 0, y: 0 }, p2: { x: 40, y: 0 }, realDistanceMeters: 1 }
    setScale(defaultScale)
    setStep('tracing')
  }

  const handleBack = () => setStep('upload')
  const handleNext = () => setStep('tracing')

  return (
    <div className="flex flex-col h-full">
      {/* Instruction bar */}
      <div
        className="flex items-center gap-3 px-6 py-3 shrink-0"
        style={{ background: 'rgba(0,212,255,0.06)', borderBottom: '1px solid var(--border)' }}
      >
        <Info size={14} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {points.length === 0
            ? 'Click two points on the plan that have a known real-world distance'
            : points.length === 1
            ? 'Click a second point to complete the measurement'
            : 'Enter the real distance between the two points below'}
        </p>
        {points.length > 0 && (
          <button
            onClick={() => setPoints([])}
            className="ml-auto text-xs px-2 py-1 rounded"
            style={{ background: 'var(--bg-3)', color: 'var(--text-muted)' }}
          >
            Reset points
          </button>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden" style={{ cursor: points.length < 2 ? 'crosshair' : 'default' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onClick={handleCanvasClick}
        />
      </div>

      {/* Controls */}
      <div
        className="shrink-0 px-6 py-4 flex items-center gap-4 flex-wrap"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-1)' }}
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
          style={{ background: 'var(--bg-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          <ArrowLeft size={14} />Back
        </button>

        {points.length === 2 && (
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="number"
              placeholder="e.g. 18"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--bg-0)',
                border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                color: 'var(--text-primary)',
              }}
            />
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              {(['ft', 'm'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className="px-3 py-2 text-xs font-medium transition-all"
                  style={{
                    background: unit === u ? 'var(--cyan)' : 'var(--bg-2)',
                    color: unit === u ? '#000' : 'var(--text-muted)',
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: 'var(--cyan)', color: '#000' }}
            >
              Confirm Scale
            </button>
            {error && <span className="text-xs" style={{ color: 'var(--red)' }}>{error}</span>}
          </div>
        )}

        {scalePx !== null && (
          <span className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,255,136,0.1)', color: 'var(--green)', border: '1px solid rgba(0,255,136,0.2)' }}>
            ✓ Scale: {scalePx.toFixed(1)} px/m
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleSkip}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs transition-all hover:opacity-80"
            style={{ background: 'var(--bg-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            <SkipForward size={13} />Skip (use estimate)
          </button>
          <button
            onClick={handleNext}
            disabled={scalePx === null}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: scalePx !== null ? 'var(--cyan)' : 'var(--bg-3)',
              color: scalePx !== null ? '#000' : 'var(--text-muted)',
              cursor: scalePx !== null ? 'pointer' : 'not-allowed',
              opacity: scalePx !== null ? 1 : 0.5,
            }}
          >
            Start Tracing <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
