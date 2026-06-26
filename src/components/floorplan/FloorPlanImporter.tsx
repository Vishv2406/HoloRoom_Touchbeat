// components/floorplan/FloorPlanImporter.tsx — Full-screen modal controller
import { useEffect } from 'react'
import { X, Upload, Ruler, MousePointer, CheckSquare, Cpu } from 'lucide-react'
import { useFloorPlanStore } from '../../store/useFloorPlanStore'
import UploadStep from './UploadStep'
import ScaleSetterStep from './ScaleSetterStep'
import TracingStep from './TracingStep'
import ConfirmStep from './ConfirmStep'
import GeneratingStep from './GeneratingStep'

const STEPS = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'scaling', label: 'Scale', icon: Ruler },
  { key: 'tracing', label: 'Trace Rooms', icon: MousePointer },
  { key: 'confirming', label: 'Confirm', icon: CheckSquare },
  { key: 'generating', label: 'Generate', icon: Cpu },
] as const

type StepKey = typeof STEPS[number]['key']

const stepOrder: StepKey[] = ['upload', 'scaling', 'tracing', 'confirming', 'generating']

export default function FloorPlanImporter() {
  const step = useFloorPlanStore((s) => s.step)
  const closeImporter = useFloorPlanStore((s) => s.closeImporter)
  const resetAll = useFloorPlanStore((s) => s.resetAll)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'generating') {
        closeImporter()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [step, closeImporter])

  const currentStepIdx = stepOrder.indexOf(step as StepKey)

  const handleClose = () => {
    if (step === 'generating') return
    closeImporter()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 100, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Floor Plan Importer"
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: '92vw',
          maxWidth: 1100,
          height: '90vh',
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: '0 32px 120px rgba(0,0,0,0.9)',
        }}
      >
        {/* Top bar */}
        <div
          className="flex items-center px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {/* Title */}
          <div className="flex items-center gap-3 mr-8">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}
            >
              📐
            </div>
            <div>
              <h2
                className="text-sm font-bold leading-tight"
                style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}
              >
                Floor Plan Importer
              </h2>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Generate a 3D smart home from your floor plan
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 flex-1">
            {STEPS.map((s, i) => {
              const isComplete = i < currentStepIdx
              const isCurrent = i === currentStepIdx
              const Icon = s.icon
              return (
                <div key={s.key} className="flex items-center gap-1">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: isCurrent
                        ? 'rgba(0,212,255,0.12)'
                        : isComplete
                        ? 'rgba(0,255,136,0.08)'
                        : 'var(--bg-2)',
                      border: isCurrent
                        ? '1px solid rgba(0,212,255,0.4)'
                        : isComplete
                        ? '1px solid rgba(0,255,136,0.2)'
                        : '1px solid transparent',
                      color: isCurrent
                        ? 'var(--cyan)'
                        : isComplete
                        ? 'var(--green)'
                        : 'var(--text-muted)',
                    }}
                  >
                    <Icon size={11} />
                    <span className="hidden sm:inline">{s.label}</span>
                    {isComplete && <span style={{ fontSize: 10 }}>✓</span>}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="w-4 h-px"
                      style={{ background: i < currentStepIdx ? 'var(--green)' : 'var(--border)' }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Close */}
          {step !== 'generating' && (
            <button
              onClick={handleClose}
              className="ml-4 w-8 h-8 flex items-center justify-center rounded-xl hover:opacity-80 transition-opacity shrink-0"
              style={{ background: 'var(--bg-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              aria-label="Close importer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {step === 'upload' && <UploadStep />}
          {step === 'scaling' && <ScaleSetterStep />}
          {step === 'tracing' && <TracingStep />}
          {step === 'confirming' && <ConfirmStep />}
          {step === 'generating' && <GeneratingStep />}
        </div>
      </div>
    </div>
  )
}
