import type { FileItem } from '../types'
import { formatBytes } from '../utils'

interface FileCardProps {
  item: FileItem
  targetFormat: string
  onRemove: (id: string) => void
  onCancel: (id: string) => void
  onDownload: (id: string) => void
  onEdit: (id: string) => void
}

const statusMap = {
  idle:       { symbol: '·',  color: '#444',    label: 'ready' },
  converting: { symbol: '⟳',  color: '#888',    label: 'converting' },
  done:       { symbol: '✓',  color: '#fff',    label: 'done' },
  error:      { symbol: '✗',  color: '#c0392b', label: 'error' },
}

export default function FileCard({ item, targetFormat, onRemove, onCancel, onDownload, onEdit }: FileCardProps) {
  const { id, file, preview, status, error, convertedBlob, convertedSize } = item
  const st = statusMap[status]
  const savings = convertedSize != null
    ? (((file.size - convertedSize) / file.size) * 100).toFixed(0)
    : null

  return (
    <div className="flex items-start gap-3 border border-[#1a1a1a] bg-[#0a0a0a] p-3 hover:border-[#2a2a2a] transition-colors duration-100">
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-12 h-12 overflow-hidden bg-[#111] border border-[#1f1f1f]">
        <img src={preview} alt={file.name} className="w-full h-full object-cover" />
        {status === 'converting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-[#888] text-sm animate-spin inline-block">⟳</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-xs text-white" title={file.name}>{file.name}</p>
        <div className="flex items-center gap-3 text-xs text-[#555]">
          <span>{formatBytes(file.size)}</span>
          {convertedSize != null && (
            <>
              <span className="text-[#333]">→</span>
              <span className={Number(savings) > 0 ? 'text-[#888]' : 'text-[#555]'}>
                {formatBytes(convertedSize)}
              </span>
              {Number(savings) > 0 && <span className="text-[#555]">−{savings}%</span>}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: st.color }} className="text-xs tabular-nums">{st.symbol}</span>
          <span className="text-xs" style={{ color: st.color }}>
            {status === 'error' ? (error ?? 'error') : st.label}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {status === 'done' && convertedBlob && (
          <button
            onClick={() => onDownload(id)}
            className="text-xs text-[#888] border border-[#2a2a2a] px-2.5 py-1 hover:text-white hover:border-[#444] transition-colors"
          >
            ↓ .{targetFormat}
          </button>
        )}
        {(status === 'idle' || status === 'done' || status === 'error') && (
          <button
            onClick={() => onEdit(id)}
            className="text-xs text-[#333] border border-[#1a1a1a] px-2.5 py-1 hover:text-[#888] hover:border-[#2a2a2a] transition-colors"
          >
            edit
          </button>
        )}
        {status === 'converting' && (
          <button
            onClick={() => onCancel(id)}
            className="text-xs text-[#555] border border-[#1f1f1f] px-2.5 py-1 hover:text-[#c0392b] hover:border-[#c0392b]/40 transition-colors"
          >
            cancel
          </button>
        )}
        {(status === 'idle' || status === 'done' || status === 'error') && (
          <button
            onClick={() => onRemove(id)}
            className="text-xs text-[#333] px-1.5 py-1 hover:text-[#c0392b] transition-colors"
            aria-label="remove"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
