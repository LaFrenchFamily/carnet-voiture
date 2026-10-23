export type ReadProgress = { stage: 'download' | 'reading'; ratio: number }

/** The reading engine could not be loaded (typically offline on first use). */
export class OcrUnavailableError extends Error {}

/** Below this, a PDF has no real text layer: it is a scan. */
const MIN_PDF_TEXT = 20

/** Extracts an invoice's text on the device. Returns '' when there is nothing to read (scanned PDF). */
export async function readInvoice(file: File, onProgress?: (p: ReadProgress) => void): Promise<string> {
  try {
    if (file.type === 'application/pdf') {
      const { pdfText } = await import('./pdfText')
      const text = await pdfText(file)
      return text.trim().length < MIN_PDF_TEXT ? '' : text
    }
    const { imageText } = await import('./imageText')
    return await imageText(file, onProgress)
  } catch (e) {
    // A failed fetch (module, worker, wasm or language data) surfaces as a TypeError.
    if (e instanceof OcrUnavailableError || e instanceof TypeError) throw new OcrUnavailableError(String(e))
    throw e
  }
}
