export type Format = 'png' | 'jpg' | 'webp'

export type ConversionStatus = 'idle' | 'converting' | 'done' | 'error'

export interface FileItem {
  id: string
  file: File
  preview: string
  status: ConversionStatus
  error?: string
  convertedBlob?: Blob
  convertedSize?: number
  abortController?: AbortController
}
