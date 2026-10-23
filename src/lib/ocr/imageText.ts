import { createWorker } from 'tesseract.js'
import { OcrUnavailableError, type ReadProgress } from './readInvoice'

const MAX_SIDE = 2000

/** Grayscale, at most 2000 px: faster and usually more accurate for Tesseract. */
async function prepare(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.filter = 'grayscale(1)'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}

/** OCR in French, with the engine served from /ocr/ (same origin, cached by the service worker). */
export async function imageText(file: File, onProgress?: (p: ReadProgress) => void): Promise<string> {
  const canvas = await prepare(file)
  let worker
  try {
    worker = await createWorker('fra', 1, {
      workerPath: '/ocr/worker.min.js',
      corePath: '/ocr/',
      langPath: '/ocr/',
      gzip: true,
      logger: (m) => onProgress?.({ stage: m.status === 'recognizing text' ? 'reading' : 'download', ratio: m.progress }),
    })
  } catch (e) {
    throw new OcrUnavailableError(String(e))
  }
  try {
    const { data } = await worker.recognize(canvas)
    return data.text
  } finally {
    await worker.terminate()
  }
}
