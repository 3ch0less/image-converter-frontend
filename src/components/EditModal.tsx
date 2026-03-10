import { useState, useRef } from 'react'
import type { MouseEvent as RMouseEvent } from 'react'
import type { EditParams } from '../types'

interface EditModalProps {
  file: File
  preview: string
  params: EditParams
  converting: boolean
  targetFormat: string
  onChange: (partial: Partial<EditParams>) => void
  onReset: () => void
  onApply: () => void
  onClose: () => void
}

// ── collapsible section ──────────────────────────────────────────────────────
function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[#1a1a1a]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#444] hover:text-[#666] transition-colors"
      >
        <span>/ {title}</span>
        <span className="text-[#2a2a2a]">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-3 pb-3 pt-1 space-y-2.5">{children}</div>}
    </div>
  )
}

// ── labelled slider row ───────────────────────────────────────────────────────
function SliderRow({
  label,
  value,
  min,
  max,
  step,
  dec,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  dec: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#555] w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
      <span className="text-xs text-white tabular-nums w-8 text-right">{value.toFixed(dec)}</span>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function EditModal({
  file,
  preview,
  params,
  converting,
  targetFormat,
  onChange,
  onReset,
  onApply,
  onClose,
}: EditModalProps) {
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  // Live CSS for preview image
  const filterCSS =
    [
      params.brightness !== 1 ? `brightness(${params.brightness})` : '',
      params.contrast !== 1 ? `contrast(${params.contrast})` : '',
      params.blur > 0 ? `blur(${params.blur}px)` : '',
    ]
      .filter(Boolean)
      .join(' ') || 'none'

  const transformCSS = `rotate(${params.rotate}deg) scaleX(${params.flipH ? -1 : 1}) scaleY(${params.flipV ? -1 : 1})`

  // Crop overlay (expressed as % of preview container)
  const hasCrop =
    params.cropEnabled &&
    naturalSize.w > 0 &&
    Number(params.cropWidth) > 0 &&
    Number(params.cropHeight) > 0

  const cropStyle = hasCrop
    ? {
        left:   `${(Number(params.cropX)      / naturalSize.w) * 100}%`,
        top:    `${(Number(params.cropY)      / naturalSize.h) * 100}%`,
        width:  `${(Number(params.cropWidth)  / naturalSize.w) * 100}%`,
        height: `${(Number(params.cropHeight) / naturalSize.h) * 100}%`,
      }
    : null

  // Drag-to-crop on the preview container
  function onMouseDown(e: RMouseEvent<HTMLDivElement>) {
    if (!params.cropEnabled || !naturalSize.w) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const px = Math.round(((e.clientX - rect.left) / rect.width)  * naturalSize.w)
    const py = Math.round(((e.clientY - rect.top)  / rect.height) * naturalSize.h)
    dragStart.current = { x: px, y: py }
    onChange({ cropX: String(px), cropY: String(py), cropWidth: '0', cropHeight: '0' })
  }

  function onMouseMove(e: RMouseEvent<HTMLDivElement>) {
    if (!dragStart.current || !params.cropEnabled || !naturalSize.w) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const px = Math.round(((e.clientX - rect.left) / rect.width)  * naturalSize.w)
    const py = Math.round(((e.clientY - rect.top)  / rect.height) * naturalSize.h)
    onChange({
      cropX:      String(Math.min(px, dragStart.current.x)),
      cropY:      String(Math.min(py, dragStart.current.y)),
      cropWidth:  String(Math.abs(px - dragStart.current.x)),
      cropHeight: String(Math.abs(py - dragStart.current.y)),
    })
  }

  function onMouseUp() { dragStart.current = null }

  // Aspect-ratio-aware resize inputs
  function handleResizeW(v: string) {
    if (params.resizeLockAspect && naturalSize.w && v) {
      onChange({ resizeWidth: v, resizeHeight: String(Math.round((Number(v) * naturalSize.h) / naturalSize.w)) })
    } else {
      onChange({ resizeWidth: v })
    }
  }

  function handleResizeH(v: string) {
    if (params.resizeLockAspect && naturalSize.h && v) {
      onChange({ resizeHeight: v, resizeWidth: String(Math.round((Number(v) * naturalSize.w) / naturalSize.h)) })
    } else {
      onChange({ resizeHeight: v })
    }
  }

  const inputCls =
    'w-full bg-[#080808] border border-[#1f1f1f] text-xs text-white px-2 py-1.5 focus:outline-none focus:border-[#444] tabular-nums'

  const pill = (active: boolean) =>
    `px-2.5 py-1 text-xs border transition-colors duration-100 ${
      active
        ? 'border-[#555] text-white bg-[#111]'
        : 'border-[#1f1f1f] text-[#444] hover:border-[#333] hover:text-[#888]'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-4xl bg-[#0d0d0d] border border-[#1f1f1f]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <div>
            <p className="text-xs text-[#444] mb-0.5">/ EDIT</p>
            <p className="text-sm text-white truncate max-w-xs" title={file.name}>{file.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onReset} className="text-xs text-[#333] hover:text-[#888] transition-colors">
              reset all
            </button>
            <button onClick={onClose} className="text-xs text-[#333] hover:text-white transition-colors">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row">

          {/* ── Preview ── */}
          <div className="w-full md:w-1/2 p-5 border-b md:border-b-0 md:border-r border-[#1a1a1a]">
            <p className="text-xs text-[#444] mb-3">/ PREVIEW</p>
            <div
              className="relative bg-[#080808] border border-[#1a1a1a] overflow-hidden select-none"
              style={{ aspectRatio: '1/1', cursor: params.cropEnabled ? 'crosshair' : 'default' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <img
                src={preview}
                alt={file.name}
                className="w-full h-full object-contain"
                style={{ filter: filterCSS, transform: transformCSS }}
                onLoad={(e) => {
                  const img = e.currentTarget
                  setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
                }}
                draggable={false}
              />

              {/* Crop instruction overlay */}
              {params.cropEnabled && !hasCrop && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-[#555]">drag to select crop area</span>
                </div>
              )}

              {/* Crop selection box */}
              {cropStyle && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    ...cropStyle,
                    border: '1px solid rgba(255,255,255,0.6)',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                    zIndex: 2,
                  }}
                />
              )}
            </div>

            {/* Image metadata */}
            <div className="mt-2 flex items-center justify-between">
              {naturalSize.w > 0
                ? <span className="text-xs text-[#333]">{naturalSize.w} × {naturalSize.h} px</span>
                : <span />
              }
              {params.sharpen > 0 && (
                <span className="text-xs text-[#2a2a2a]">sharpen preview n/a</span>
              )}
            </div>
          </div>

          {/* ── Controls ── */}
          <div className="w-full md:w-1/2 p-5 space-y-1.5 overflow-y-auto" style={{ maxHeight: '70vh' }}>

            {/* RESIZE */}
            <Section title="RESIZE">
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-xs text-[#444] mb-1">width</p>
                  <input
                    type="number"
                    value={params.resizeWidth}
                    placeholder={naturalSize.w ? String(naturalSize.w) : 'px'}
                    onChange={(e) => handleResizeW(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#444] mb-1">height</p>
                  <input
                    type="number"
                    value={params.resizeHeight}
                    placeholder={naturalSize.h ? String(naturalSize.h) : 'px'}
                    onChange={(e) => handleResizeH(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.resizeLockAspect}
                  onChange={(e) => onChange({ resizeLockAspect: e.target.checked })}
                  className="w-3 h-3 accent-white"
                />
                <span className="text-xs text-[#555]">lock aspect ratio</span>
              </label>
              <div>
                <p className="text-xs text-[#444] mb-1.5">fit mode</p>
                <div className="flex gap-1.5">
                  {(['cover', 'contain', 'fill'] as const).map((f) => (
                    <button key={f} onClick={() => onChange({ resizeFit: f })} className={pill(params.resizeFit === f)}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* CROP */}
            <Section title="CROP" defaultOpen={false}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.cropEnabled}
                  onChange={(e) => onChange({ cropEnabled: e.target.checked })}
                  className="w-3 h-3 accent-white"
                />
                <span className="text-xs text-[#555]">enable crop</span>
              </label>
              {params.cropEnabled && (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-[#444] mb-1">x</p>
                      <input type="number" value={params.cropX} placeholder="0"
                        onChange={(e) => onChange({ cropX: e.target.value })} className={inputCls} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[#444] mb-1">y</p>
                      <input type="number" value={params.cropY} placeholder="0"
                        onChange={(e) => onChange({ cropY: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-[#444] mb-1">width</p>
                      <input type="number" value={params.cropWidth} placeholder="px"
                        onChange={(e) => onChange({ cropWidth: e.target.value })} className={inputCls} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[#444] mb-1">height</p>
                      <input type="number" value={params.cropHeight} placeholder="px"
                        onChange={(e) => onChange({ cropHeight: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                  <p className="text-xs text-[#2a2a2a]">or drag on preview to select</p>
                </>
              )}
            </Section>

            {/* TRANSFORM */}
            <Section title="TRANSFORM" defaultOpen={false}>
              <div>
                <p className="text-xs text-[#444] mb-1.5">rotate</p>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {[0, 90, 180, 270].map((deg) => (
                    <button key={deg} onClick={() => onChange({ rotate: deg })} className={pill(params.rotate === deg)}>
                      {deg}°
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-[#444]">custom</span>
                    <input
                      type="number"
                      min={-360}
                      max={360}
                      value={params.rotate}
                      onChange={(e) => onChange({ rotate: Number(e.target.value) })}
                      className="w-16 bg-[#080808] border border-[#1f1f1f] text-xs text-white px-2 py-1.5 focus:outline-none focus:border-[#444]"
                    />
                    <span className="text-xs text-[#444]">deg</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-[#444] mb-1.5">flip</p>
                <div className="flex gap-1.5">
                  <button onClick={() => onChange({ flipH: !params.flipH })} className={pill(params.flipH)}>↔ horizontal</button>
                  <button onClick={() => onChange({ flipV: !params.flipV })} className={pill(params.flipV)}>↕ vertical</button>
                </div>
              </div>
            </Section>

            {/* ADJUSTMENTS */}
            <Section title="ADJUSTMENTS">
              <SliderRow label="brightness" value={params.brightness} min={0.5} max={2}  step={0.05} dec={2} onChange={(v) => onChange({ brightness: v })} />
              <SliderRow label="contrast"   value={params.contrast}   min={0.5} max={2}  step={0.05} dec={2} onChange={(v) => onChange({ contrast: v })} />
              <SliderRow label="blur"       value={params.blur}       min={0}   max={10} step={0.5}  dec={1} onChange={(v) => onChange({ blur: v })} />
              <SliderRow label="sharpen"    value={params.sharpen}    min={0}   max={10} step={0.5}  dec={1} onChange={(v) => onChange({ sharpen: v })} />
            </Section>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#1a1a1a]">
          <button
            onClick={onApply}
            disabled={converting}
            className="text-xs border border-[#333] text-[#888] px-4 py-2 hover:border-white hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-100"
          >
            {converting ? '⟳ processing...' : 'apply & convert'}
          </button>
          <button
            onClick={onClose}
            className="text-xs text-[#333] px-4 py-2 hover:text-[#888] transition-colors"
          >
            cancel
          </button>
          {targetFormat && (
            <span className="text-xs text-[#2a2a2a] ml-auto">→ .{targetFormat}</span>
          )}
        </div>

      </div>
    </div>
  )
}
