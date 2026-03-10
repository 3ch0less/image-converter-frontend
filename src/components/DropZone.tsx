import { useRef, useState } from 'react'
import type { DragEvent, ChangeEvent } from 'react'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

export default function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(files)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onFiles(files)
    e.target.value = ''
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={[
        'relative flex flex-col items-center justify-center gap-4 border border-dashed px-8 py-16 text-center cursor-pointer select-none transition-colors duration-150',
        dragging
          ? 'border-white/50 bg-white/5'
          : 'border-[#333] bg-[#0a0a0a] hover:border-[#555] hover:bg-[#0f0f0f]',
        disabled ? 'opacity-40 pointer-events-none' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp,image/tiff,.tif,.tiff,image/x-icon,.ico"
        className="hidden"
        onChange={handleChange}
      />

      {/* ASCII-style icon */}
      <div className="text-[#444] text-xs leading-tight select-none pointer-events-none">
        <div>┌───────┐</div>
        <div>│  img  │</div>
        <div>└───────┘</div>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-[#888]">
          drop images here or{' '}
          <span className="text-white underline underline-offset-4 decoration-[#444]">browse</span>
        </p>
        <p className="text-xs text-[#444]">png · jpg · webp · gif · avif · bmp · tiff · ico · max 10mb</p>
      </div>
    </div>
  )
}
