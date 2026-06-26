// components/floorplan/FloorPlanButton.tsx — Button to open floor plan importer (with resume support)
import { useEffect } from 'react'
import { LayoutGrid, RotateCcw } from 'lucide-react'
import { useFloorPlanStore } from '../../store/useFloorPlanStore'

interface Props {
  variant: 'topbar' | 'sidebar'
}

export default function FloorPlanButton({ variant }: Props) {
  const openImporter = useFloorPlanStore((s) => s.openImporter)
  const loadSession = useFloorPlanStore((s) => s.loadSession)
  const clearSession = useFloorPlanStore((s) => s.clearSession)
  const checkSavedSession = useFloorPlanStore((s) => s.checkSavedSession)
  const hasSavedSession = useFloorPlanStore((s) => s.hasSavedSession)

  useEffect(() => {
    checkSavedSession()
  }, [checkSavedSession])

  const handleResume = (e: React.MouseEvent) => {
    e.stopPropagation()
    loadSession()
  }

  const handleNew = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearSession()
    openImporter()
  }

  if (variant === 'topbar') {
    return (
      <div className="relative group flex items-center gap-1">
        <button
          onClick={hasSavedSession ? handleResume : openImporter}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{
            background: hasSavedSession ? 'rgba(0,255,136,0.1)' : 'var(--bg-2)',
            color: hasSavedSession ? 'var(--green)' : 'var(--cyan)',
            border: `1px solid ${hasSavedSession ? 'rgba(0,255,136,0.3)' : 'rgba(0,212,255,0.25)'}`,
          }}
          aria-label={hasSavedSession ? 'Resume floor plan import' : 'Import floor plan'}
          title={hasSavedSession ? 'Resume saved session' : 'Import floor plan'}
        >
          <LayoutGrid size={12} />
          {hasSavedSession ? 'Resume' : 'Import'}
        </button>
        {hasSavedSession && (
          <button
            onClick={handleNew}
            className="flex items-center justify-center w-6 h-6 rounded-lg text-xs transition-all hover:opacity-80"
            style={{ background: 'var(--bg-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            title="Start new floor plan (clears saved)"
          >
            <RotateCcw size={10} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={hasSavedSession ? handleResume : openImporter}
        className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg text-sm font-medium transition-all hover:opacity-80"
        style={{
          background: hasSavedSession ? 'rgba(0,255,136,0.08)' : 'rgba(0,212,255,0.06)',
          color: hasSavedSession ? 'var(--green)' : 'var(--cyan)',
          border: `1px solid ${hasSavedSession ? 'rgba(0,255,136,0.2)' : 'rgba(0,212,255,0.18)'}`,
        }}
        aria-label={hasSavedSession ? 'Resume floor plan import' : 'Import floor plan'}
      >
        <LayoutGrid size={14} />
        {hasSavedSession ? '📐 Resume Floor Plan' : '📐 Import Floor Plan'}
      </button>
      {hasSavedSession && (
        <button
          onClick={handleNew}
          className="flex items-center gap-2 w-full py-1.5 px-3 rounded-lg text-xs transition-all hover:opacity-80"
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          <RotateCcw size={11} />
          Start New Floor Plan
        </button>
      )}
    </div>
  )
}
