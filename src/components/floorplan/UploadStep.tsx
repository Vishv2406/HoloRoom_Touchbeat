// components/floorplan/UploadStep.tsx — File upload step (saves image as base64 for persistence)
import { useRef, useState, useCallback } from 'react'
import { Upload, Image as ImageIcon, ArrowRight, AlertCircle } from 'lucide-react'
import { useFloorPlanStore } from '../../store/useFloorPlanStore'

const MAX_SIZE_PX = 1200

async function resizeImageToBase64(file: File): Promise<{ url: string; base64: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width > MAX_SIZE_PX || height > MAX_SIZE_PX) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE_PX) / width)
          width = MAX_SIZE_PX
        } else {
          width = Math.round((width * MAX_SIZE_PX) / height)
          height = MAX_SIZE_PX
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(objectUrl)

      const base64 = canvas.toDataURL('image/jpeg', 0.92)
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Canvas toBlob failed'))
          const url = URL.createObjectURL(blob)
          resolve({ url, base64, width, height })
        },
        'image/jpeg',
        0.92
      )
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = objectUrl
  })
}

export default function UploadStep() {
  const setImage = useFloorPlanStore((s) => s.setImage)
  const setStep = useFloorPlanStore((s) => s.setStep)
  const saveSession = useFloorPlanStore((s) => s.saveSession)
  const imageUrl = useFloorPlanStore((s) => s.imageUrl)

  const [preview, setPreview] = useState<string | null>(imageUrl || null)
  const [fileName, setFileName] = useState<string>(imageUrl ? 'Saved floor plan' : '')
  const [error, setError] = useState<string>('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setError('')
    if (!file.type.startsWith('image/')) {
      setError('Please upload a JPG or PNG image.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File too large — maximum 20 MB.')
      return
    }
    setLoading(true)
    try {
      const { url, base64, width, height } = await resizeImageToBase64(file)
      setPreview(url)
      setFileName(file.name)
      setImage(url, width, height, base64)
      saveSession()
    } catch {
      setError('Failed to process image. Please try another file.')
    } finally {
      setLoading(false)
    }
  }, [setImage, saveSession])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }
  const handleContinue = () => { if (preview) setStep('scaling') }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>
          Import Your Floor Plan
        </h2>
        <p className="text-sm max-w-md" style={{ color: 'var(--text-muted)' }}>
          Upload a JPG or PNG of your floor plan to generate a 3D smart home model
        </p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload floor plan image"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="relative cursor-pointer rounded-2xl transition-all"
        style={{
          width: '100%',
          maxWidth: 520,
          minHeight: 280,
          border: `2px dashed ${dragging ? 'var(--cyan)' : preview ? 'var(--cyan)' : '#2A2A50'}`,
          background: dragging ? 'rgba(0,212,255,0.05)' : preview ? 'rgba(0,212,255,0.03)' : 'var(--bg-2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          boxShadow: dragging ? '0 0 32px rgba(0,212,255,0.12)' : undefined,
        }}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Floor plan preview"
              className="rounded-xl object-contain"
              style={{ maxWidth: '100%', maxHeight: 200, border: '1px solid var(--border)' }}
            />
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <ImageIcon size={14} />
              <span style={{ color: 'var(--cyan)' }}>{fileName}</span>
              <span>· Click to change</span>
            </div>
          </>
        ) : loading ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--cyan)', borderTopColor: 'transparent' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Processing image…</span>
          </div>
        ) : (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}
            >
              <Upload size={28} style={{ color: 'var(--cyan)' }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                Drag &amp; drop your floor plan here
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                or click to browse · JPG, PNG · Max 20 MB
              </p>
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#FF6666' }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!preview}
        className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all"
        style={{
          background: preview ? 'var(--cyan)' : 'var(--bg-3)',
          color: preview ? '#000' : 'var(--text-muted)',
          cursor: preview ? 'pointer' : 'not-allowed',
          opacity: preview ? 1 : 0.5,
          fontFamily: 'Syne, sans-serif',
        }}
      >
        Continue <ArrowRight size={16} />
      </button>
    </div>
  )
}
