// components/floorplan/GeneratingStep.tsx — Animated generation progress screen
import { useEffect, useState } from 'react'
import { Check, Clock, Loader } from 'lucide-react'
import { useFloorPlanStore } from '../../store/useFloorPlanStore'
import { useHomeStore } from '../../store/useHomeStore'
// Note: clearSession is called after successful generation so the session isn't needed anymore
import { generateHomeFromFloorPlan } from '../../utils/floorPlanConverter'
import type { Room } from '../../types'

interface GenerationStep {
  label: string
  durationMs: number
}

const STEPS: GenerationStep[] = [
  { label: '📐 Analyzing floor plan dimensions...', durationMs: 700 },
  { label: '📏 Calculating room positions...', durationMs: 900 },
  { label: '🏗️ Constructing 3D room geometry...', durationMs: 1100 },
  { label: '💡 Installing smart devices...', durationMs: 800 },
  { label: '🎨 Applying materials and lighting...', durationMs: 600 },
  { label: '✅ Your smart home is ready!', durationMs: 400 },
]

interface Props {
  onComplete?: () => void
}

export default function GeneratingStep({ onComplete }: Props) {
  const tracedRooms = useFloorPlanStore((s) => s.tracedRooms)
  const scale = useFloorPlanStore((s) => s.scale)
  const imageWidth = useFloorPlanStore((s) => s.imageWidth)
  const imageHeight = useFloorPlanStore((s) => s.imageHeight)
  const closeImporter = useFloorPlanStore((s) => s.closeImporter)
  const resetAll = useFloorPlanStore((s) => s.resetAll)

  const loadFromFloorPlan = useHomeStore((s) => s.loadFromFloorPlan)

  const [currentStep, setCurrentStep] = useState(0)
  const [done, setDone] = useState(false)

  // Count total devices for display
  const totalDevices = tracedRooms.length * 3 // rough estimate shown during generation

  useEffect(() => {
    let stepIdx = 0
    let generatedRooms: Room[] = []

    // Pre-generate while animating
    const effectiveScale = scale ?? {
      pixelsPerMeter: 40,
      p1: { x: 0, y: 0 },
      p2: { x: 40, y: 0 },
      realDistanceMeters: 1,
    }
    generatedRooms = generateHomeFromFloorPlan(
      tracedRooms,
      effectiveScale,
      imageWidth,
      imageHeight
    )

    const runStep = () => {
      if (stepIdx >= STEPS.length) {
        setDone(true)
        setTimeout(() => {
          loadFromFloorPlan(generatedRooms)
          resetAll() // also calls clearSession internally
          closeImporter()
          onComplete?.()
        }, 400)
        return
      }
      setCurrentStep(stepIdx)
      setTimeout(() => {
        stepIdx++
        runStep()
      }, STEPS[stepIdx]?.durationMs ?? 500)
    }
    runStep()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const progress = done ? 100 : Math.round(((currentStep) / STEPS.length) * 100)

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
      {/* Animated icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
        style={{
          background: 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.2)',
          animation: done ? 'none' : 'pulse 1.5s ease-in-out infinite',
        }}
      >
        🏠
      </div>

      <div className="text-center">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}
        >
          Building Your Smart Home...
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Creating{' '}
          <span style={{ color: 'var(--cyan)' }}>{tracedRooms.length} rooms</span> with smart devices
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-3)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--cyan), #7B61FF)',
            }}
          />
        </div>
        <div
          className="flex justify-between mt-1 text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <span>Generating…</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Step list */}
      <div className="w-full max-w-md flex flex-col gap-2.5">
        {STEPS.map((step, i) => {
          const isPast = i < currentStep
          const isCurrent = i === currentStep && !done
          const isFuture = i > currentStep && !done

          return (
            <div key={i} className="flex items-center gap-3">
              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                {isPast || done ? (
                  <Check size={14} style={{ color: 'var(--green)' }} />
                ) : isCurrent ? (
                  <Loader
                    size={14}
                    style={{ color: 'var(--cyan)', animation: 'spin 1s linear infinite' }}
                  />
                ) : (
                  <Clock size={14} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                )}
              </div>
              <span
                className="text-sm"
                style={{
                  color: isPast || done
                    ? 'var(--text-muted)'
                    : isCurrent
                    ? 'var(--cyan)'
                    : '#404060',
                  fontWeight: isCurrent ? 600 : 400,
                  fontFamily: isCurrent ? 'Syne, sans-serif' : undefined,
                }}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
