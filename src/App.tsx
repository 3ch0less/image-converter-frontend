import { useState, useCallback } from 'react'
import DropZone from './components/DropZone'
import FileCard from './components/FileCard'
import Stars from './components/Stars'
import EditModal from './components/EditModal'
import type { FileItem, Format, EditParams } from './types'
import { DEFAULT_EDIT } from './types'
import { generateId, validateFile } from './utils'

const API_URL  = 'https://image-converter-backend-production-43c3.up.railway.app/convert'
const EDIT_URL = 'https://image-converter-backend-production-43c3.up.railway.app/edit'

export default function App() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [targetFormat, setTargetFormat] = useState<Format>('webp')
  const [quality, setQuality] = useState(85)
  const [converting, setConverting] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editParamsMap, setEditParamsMap] = useState<Record<string, EditParams>>({})

  const getEditParams = useCallback(
    (id: string): EditParams => editParamsMap[id] ?? { ...DEFAULT_EDIT },
    [editParamsMap],
  )

  const updateEditParams = useCallback((id: string, partial: Partial<EditParams>) => {
    setEditParamsMap((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { ...DEFAULT_EDIT }), ...partial },
    }))
  }, [])

  const resetEditParams = useCallback((id: string) => {
    setEditParamsMap((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // ── file management ────────────────────────────────────────────────────────
  const addFiles = useCallback((incoming: File[]) => {
    const items: FileItem[] = []
    for (const file of incoming) {
      const error = validateFile(file)
      items.push({
        id: generateId(),
        file,
        preview: URL.createObjectURL(file),
        status: error ? 'error' : 'idle',
        error: error ?? undefined,
      })
    }
    setFiles((prev) => [...prev, ...items])
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((f) => f.id !== id)
    })
    setEditParamsMap((prev) => { const n = { ...prev }; delete n[id]; return n })
  }, [])

  const cancelFile = useCallback((id: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f
        f.abortController?.abort()
        return { ...f, status: 'idle', abortController: undefined }
      }),
    )
  }, [])

  const downloadFile = useCallback((id: string, fmt: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id)
      if (!item?.convertedBlob) return prev
      const url = URL.createObjectURL(item.convertedBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${item.file.name.replace(/\.[^.]+$/, '')}.${fmt}`
      a.click()
      URL.revokeObjectURL(url)
      return prev
    })
  }, [])

  // ── batch convert (format only, no edits) ─────────────────────────────────
  const convertAll = useCallback(async () => {
    const targets = files.filter((f) => f.status === 'idle')
    if (!targets.length) return
    setConverting(true)

    const controllers: Record<string, AbortController> = {}
    targets.forEach((f) => { controllers[f.id] = new AbortController() })

    setFiles((prev) =>
      prev.map((f) =>
        targets.find((t) => t.id === f.id)
          ? { ...f, status: 'converting', abortController: controllers[f.id] }
          : f,
      ),
    )

    const fmt = targetFormat
    const q = quality

    await Promise.all(
      targets.map(async (item) => {
        const controller = controllers[item.id]
        try {
          const formData = new FormData()
          formData.append('file', item.file)
          formData.append('targetFormat', fmt)
          if (fmt === 'jpg' || fmt === 'webp' || fmt === 'avif') {
            formData.append('quality', String(q))
          }

          const res = await fetch(API_URL, { method: 'POST', body: formData, signal: controller.signal })

          if (!res.ok) {
            let msg = `server error ${res.status}`
            try { const j = await res.json(); msg = j.error ?? j.message ?? msg } catch { /* empty */ }
            throw new Error(msg)
          }

          const blob = await res.blob()
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, status: 'done', convertedBlob: blob, convertedSize: blob.size, abortController: undefined }
                : f,
            ),
          )
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            setFiles((prev) =>
              prev.map((f) => f.id === item.id ? { ...f, status: 'idle', abortController: undefined } : f),
            )
          } else {
            const msg = err instanceof Error ? err.message : 'conversion failed'
            setFiles((prev) =>
              prev.map((f) => f.id === item.id ? { ...f, status: 'error', error: msg, abortController: undefined } : f),
            )
          }
        }
      }),
    )

    setConverting(false)
  }, [files, targetFormat, quality])

  // ── apply edits + convert (single file) ───────────────────────────────────
  const applyAndConvert = useCallback(async (id: string) => {
    const item = files.find((f) => f.id === id)
    if (!item) return

    const p = editParamsMap[id] ?? { ...DEFAULT_EDIT }
    const fmt = targetFormat
    const q = quality
    const controller = new AbortController()

    setFiles((prev) =>
      prev.map((f) => f.id === id ? { ...f, status: 'converting', abortController: controller } : f),
    )

    try {
      const fd = new FormData()
      fd.append('file', item.file)
      fd.append('targetFormat', fmt)
      if (fmt === 'jpg' || fmt === 'webp' || fmt === 'avif') fd.append('quality', String(q))

      // Resize
      if (p.resizeWidth)  fd.append('width',  p.resizeWidth)
      if (p.resizeHeight) fd.append('height', p.resizeHeight)
      if (p.resizeWidth || p.resizeHeight) fd.append('fit', p.resizeFit)

      // Crop
      if (p.cropEnabled && p.cropWidth && p.cropHeight) {
        fd.append('cropX',      p.cropX || '0')
        fd.append('cropY',      p.cropY || '0')
        fd.append('cropWidth',  p.cropWidth)
        fd.append('cropHeight', p.cropHeight)
      }

      // Transform
      if (p.rotate !== 0) fd.append('rotate', String(p.rotate))
      if (p.flipH)        fd.append('flipH',  'true')
      if (p.flipV)        fd.append('flipV',  'true')

      // Adjustments
      if (p.brightness !== 1) fd.append('brightness', String(p.brightness))
      if (p.contrast   !== 1) fd.append('contrast',   String(p.contrast))
      if (p.blur        > 0)  fd.append('blur',        String(p.blur))
      if (p.sharpen     > 0)  fd.append('sharpen',     String(p.sharpen))

      const res = await fetch(EDIT_URL, { method: 'POST', body: fd, signal: controller.signal })

      if (!res.ok) {
        let msg = `server error ${res.status}`
        try { const j = await res.json(); msg = j.error ?? j.message ?? msg } catch { /* empty */ }
        throw new Error(msg)
      }

      const blob = await res.blob()
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: 'done', convertedBlob: blob, convertedSize: blob.size, abortController: undefined }
            : f,
        ),
      )
      setEditingId(null)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setFiles((prev) =>
          prev.map((f) => f.id === id ? { ...f, status: 'idle', abortController: undefined } : f),
        )
      } else {
        const msg = err instanceof Error ? err.message : 'processing failed'
        setFiles((prev) =>
          prev.map((f) => f.id === id ? { ...f, status: 'error', error: msg, abortController: undefined } : f),
        )
      }
      setEditingId(null)
    }
  }, [files, editParamsMap, targetFormat, quality])

  // ── misc ───────────────────────────────────────────────────────────────────
  const downloadAll = useCallback(() => {
    files.filter((f) => f.status === 'done').forEach((f) => downloadFile(f.id, targetFormat))
  }, [files, downloadFile, targetFormat])

  const reset = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.preview))
    setFiles([])
    setEditParamsMap({})
  }, [files])

  const idleCount    = files.filter((f) => f.status === 'idle').length
  const doneCount    = files.filter((f) => f.status === 'done').length
  const hasFiles     = files.length > 0
  const needsQuality = targetFormat === 'jpg' || targetFormat === 'webp' || targetFormat === 'avif'
  const editingFile  = editingId ? files.find((f) => f.id === editingId) : null

  return (
    <div className="relative min-h-screen bg-[#121212] text-white">

      <Stars />

      {/* Edit modal */}
      {editingFile && (
        <EditModal
          file={editingFile.file}
          preview={editingFile.preview}
          params={getEditParams(editingFile.id)}
          converting={editingFile.status === 'converting'}
          targetFormat={targetFormat}
          onChange={(partial) => updateEditParams(editingFile.id, partial)}
          onReset={() => resetEditParams(editingFile.id)}
          onApply={() => applyAndConvert(editingFile.id)}
          onClose={() => setEditingId(null)}
        />
      )}

      {/* Page content */}
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-20">

        {/* ── HEADER ── */}
        <div className="mb-16">
          <p className="text-xs text-[#444] mb-6">/ IMG_CONVERT</p>
          <h1 className="text-xl text-white mb-2">image converter</h1>
          <p className="text-sm text-[#555]">
            png · jpg · webp · gif · tiff · avif &nbsp;—&nbsp; batch conversion
          </p>
        </div>

        <div className="border-t border-[#1a1a1a] mb-12" />

        {/* ── UPLOAD ── */}
        <div className="mb-12">
          <p className="text-xs text-[#444] mb-4">/ UPLOAD</p>
          <DropZone onFiles={addFiles} disabled={converting} />
        </div>

        {/* ── SETTINGS ── */}
        <div className="mb-12">
          <p className="text-xs text-[#444] mb-6">/ SETTINGS</p>
          <div className="space-y-6">
            <div className="flex items-start gap-8 sm:items-center flex-wrap">
              <span className="text-xs text-[#555] w-28 shrink-0">output format</span>
              <div className="flex flex-wrap gap-2">
                {(['png', 'jpg', 'webp', 'gif', 'tiff', 'avif'] as Format[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setTargetFormat(fmt)}
                    className={[
                      'px-3 py-1 text-xs border transition-colors duration-100',
                      targetFormat === fmt
                        ? 'border-[#555] text-white bg-[#111]'
                        : 'border-[#1f1f1f] text-[#444] hover:border-[#333] hover:text-[#888]',
                    ].join(' ')}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {needsQuality && (
              <div className="flex items-start gap-8 sm:items-center flex-wrap">
                <span className="text-xs text-[#555] w-28 shrink-0">quality</span>
                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                  <input
                    type="range" min={1} max={100} value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-white tabular-nums w-8 text-right">{quality}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── QUEUE ── */}
        {hasFiles && (
          <div className="mb-12">
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-xs text-[#444]">/ QUEUE</p>
              <span className="text-xs text-[#333]">{files.length} file{files.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-px">
              {files.map((item) => (
                <FileCard
                  key={item.id}
                  item={item}
                  targetFormat={targetFormat}
                  onRemove={removeFile}
                  onCancel={cancelFile}
                  onDownload={(id) => downloadFile(id, targetFormat)}
                  onEdit={setEditingId}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── ACTIONS ── */}
        {hasFiles && (
          <div className="mb-16">
            <p className="text-xs text-[#444] mb-4">/ ACTIONS</p>
            <div className="flex flex-wrap items-center gap-3">
              {idleCount > 0 && (
                <button
                  onClick={convertAll}
                  disabled={converting}
                  className="text-xs border border-[#333] text-[#888] px-4 py-2 hover:border-white hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-100"
                >
                  {converting ? '⟳ converting...' : `run conversion (${idleCount})`}
                </button>
              )}
              {doneCount > 1 && (
                <button
                  onClick={downloadAll}
                  className="text-xs border border-[#1f1f1f] text-[#555] px-4 py-2 hover:border-[#333] hover:text-[#888] transition-colors duration-100"
                >
                  ↓ download all ({doneCount})
                </button>
              )}
              <button
                onClick={reset}
                disabled={converting}
                className="text-xs text-[#333] px-4 py-2 hover:text-[#c0392b] disabled:opacity-30 transition-colors duration-100 ml-auto"
              >
                clear
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-[#1a1a1a] mb-8" />

        <div className="text-center space-y-2">
          <p className="text-xs text-[#444] italic">"the pixel is the atom of the visual world."</p>
          <p className="text-xs text-[#2a2a2a]">© 2026 Abdullah Hashmi</p>
        </div>

      </div>
    </div>
  )
}
