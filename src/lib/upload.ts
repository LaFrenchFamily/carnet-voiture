import { BUCKET, supabase } from './supabase'

export const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp']
export const MAX_BYTES = 10 * 1024 * 1024
/** For <input accept>: some systems only recognise HEIC by extension. */
export const ACCEPT_ATTR = [...ACCEPTED_TYPES, '.heic', '.heif'].join(',')

/** A file the app refuses (format, size): retrying will not help. */
export class FileRejectedError extends Error {}
const MAX_SIDE = 2000

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
}

const TOO_BIG = 'Fichier trop lourd (10 Mo maximum)'
const UNSUPPORTED = 'Format non pris en charge (PDF, JPEG, PNG, HEIC, WebP)'

export type Prepared = { blob: Blob; mimeType: string; ext: string }

/** Some browsers leave HEIC files without a MIME type. */
function mimeTypeOf(file: File): string {
  if (file.type) return file.type === 'image/heif' ? 'image/heic' : file.type
  return /\.hei[cf]$/i.test(file.name) ? 'image/heic' : ''
}

/** Downscales a photo to at most 2000 px and re-encodes it as JPEG. */
export async function defaultResize(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.85),
  )
}

/** Why a file can never be attached (format, or size for a file that will not be resized), or null. */
export function rejectReason(file: File): string | null {
  const mimeType = mimeTypeOf(file)
  if (!ACCEPTED_TYPES.includes(mimeType)) return UNSUPPORTED
  if (!mimeType.startsWith('image/') && file.size > MAX_BYTES) return TOO_BIG
  return null
}

export async function prepareUpload(
  file: File,
  resize: (f: File) => Promise<Blob> = defaultResize,
): Promise<Prepared | { error: string }> {
  const reason = rejectReason(file)
  if (reason) return { error: reason }
  const mimeType = mimeTypeOf(file)

  if (mimeType.startsWith('image/')) {
    try {
      const blob = await resize(file)
      if (blob.size <= MAX_BYTES) return { blob, mimeType: 'image/jpeg', ext: 'jpg' }
    } catch {
      // Not decodable here (e.g. HEIC outside Safari): fall back to the original file.
    }
  }

  if (file.size > MAX_BYTES) return { error: TOO_BIG }
  return { blob: file, mimeType, ext: EXTENSIONS[mimeType] }
}

export interface UploadedFile {
  storagePath: string
  mimeType: string
  sizeBytes: number
}

/** Prepares and uploads a file to {userId}/{vehicleId}/{uuid}.{ext}. Throws a user-facing message on failure. */
export async function uploadFile(userId: string, vehicleId: string, file: File): Promise<UploadedFile> {
  const prepared = await prepareUpload(file)
  if ('error' in prepared) throw new FileRejectedError(prepared.error)
  const storagePath = `${userId}/${vehicleId}/${crypto.randomUUID()}.${prepared.ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, prepared.blob, { contentType: prepared.mimeType })
  if (error) throw new Error('L’envoi de la facture a échoué')
  return { storagePath, mimeType: prepared.mimeType, sizeBytes: prepared.blob.size }
}
