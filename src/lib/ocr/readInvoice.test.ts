import { OcrUnavailableError, readInvoice } from './readInvoice'

const mocks = vi.hoisted(() => ({ pdfText: vi.fn(), imageText: vi.fn() }))
vi.mock('./pdfText', () => ({ pdfText: mocks.pdfText }))
vi.mock('./imageText', () => ({ imageText: mocks.imageText }))

const pdf = new File(['%PDF'], 'f.pdf', { type: 'application/pdf' })
const photo = new File(['x'], 'p.jpg', { type: 'image/jpeg' })

test('a PDF is read through its text layer', async () => {
  mocks.pdfText.mockResolvedValue('Facture Norauto, Net à payer 70,00')
  expect(await readInvoice(pdf)).toBe('Facture Norauto, Net à payer 70,00')
  expect(mocks.imageText).not.toHaveBeenCalled()
})

test('a PDF with almost no text counts as scanned and gives no text', async () => {
  mocks.pdfText.mockResolvedValue('  12345  ')
  expect(await readInvoice(pdf)).toBe('')
})

test('a photo goes through OCR with progress reporting', async () => {
  mocks.imageText.mockResolvedValue('Total TTC 10,00')
  const onProgress = vi.fn()
  expect(await readInvoice(photo, onProgress)).toBe('Total TTC 10,00')
  expect(mocks.imageText).toHaveBeenCalledWith(photo, onProgress)
})

test('a failed download of the OCR engine becomes OcrUnavailableError', async () => {
  mocks.imageText.mockRejectedValue(new TypeError('Failed to fetch'))
  await expect(readInvoice(photo)).rejects.toBeInstanceOf(OcrUnavailableError)
})

test('other errors are passed through', async () => {
  mocks.imageText.mockRejectedValue(new DOMException('cannot decode', 'InvalidStateError'))
  await expect(readInvoice(photo)).rejects.not.toBeInstanceOf(OcrUnavailableError)
})
