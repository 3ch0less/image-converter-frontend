export type Format = 'png' | 'jpg' | 'webp' | 'gif' | 'tiff' | 'avif'

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

export interface EditParams {
  resizeWidth: string
  resizeHeight: string
  resizeLockAspect: boolean
  resizeFit: 'cover' | 'contain' | 'fill'
  cropEnabled: boolean
  cropX: string
  cropY: string
  cropWidth: string
  cropHeight: string
  rotate: number
  flipH: boolean
  flipV: boolean
  brightness: number
  contrast: number
  blur: number
  sharpen: number
}

export const DEFAULT_EDIT: EditParams = {
  resizeWidth: '',
  resizeHeight: '',
  resizeLockAspect: true,
  resizeFit: 'cover',
  cropEnabled: false,
  cropX: '0',
  cropY: '0',
  cropWidth: '',
  cropHeight: '',
  rotate: 0,
  flipH: false,
  flipV: false,
  brightness: 1,
  contrast: 1,
  blur: 0,
  sharpen: 0,
}
