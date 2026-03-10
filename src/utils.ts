export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

const SUPPORTED = [
  'image/png', 'image/jpeg', 'image/webp',
  'image/gif', 'image/tiff', 'image/avif',
]
export const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export function validateFile(file: File): string | null {
  if (!SUPPORTED.includes(file.type)) {
    return `Unsupported format: ${file.type || 'unknown'}. Use PNG, JPG, WEBP, GIF, TIFF, or AVIF.`
  }
  if (file.size > MAX_SIZE) {
    return `File too large (${formatBytes(file.size)}). Max 10 MB.`
  }
  return null
}
