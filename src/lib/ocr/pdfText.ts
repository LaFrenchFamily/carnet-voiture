import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

const MAX_PAGES = 3

/** Text layer of the first pages, one text line per line. */
export async function pdfText(file: File): Promise<string> {
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const pdf = await task.promise
  try {
    const pages: string[] = []
    for (let n = 1; n <= Math.min(pdf.numPages, MAX_PAGES); n++) {
      const content = await (await pdf.getPage(n)).getTextContent()
      let text = ''
      let lastY: number | null = null
      for (const item of content.items) {
        if (!('str' in item)) continue
        const y = item.transform[5]
        if (lastY !== null) text += y !== lastY ? '\n' : ' '
        text += item.str
        lastY = y
      }
      pages.push(text)
    }
    return pages.join('\n')
  } finally {
    await task.destroy()
  }
}
