import { MAX_BYTES, prepareUpload, rejectReason } from './upload'

function file(name: string, type: string, bytes: number): File {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: bytes })
  return f
}
const ok = vi.fn(async () => new Blob(['small'], { type: 'image/jpeg' }))
const broken = vi.fn(async () => { throw new Error('cannot decode') })

test('a PDF is uploaded as is', async () => {
  const pdf = file('facture.pdf', 'application/pdf', 1000)
  expect(await prepareUpload(pdf, ok)).toEqual({ blob: pdf, mimeType: 'application/pdf', ext: 'pdf' })
  expect(ok).not.toHaveBeenCalled()
})

test('an image is resized to JPEG', async () => {
  const r = await prepareUpload(file('photo.png', 'image/png', 3_000_000), ok)
  expect(r).toMatchObject({ mimeType: 'image/jpeg', ext: 'jpg' })
})

test('unsupported formats are refused', async () => {
  expect(await prepareUpload(file('a.txt', 'text/plain', 10), ok)).toEqual({
    error: 'Format non pris en charge (PDF, JPEG, PNG, HEIC, WebP)',
  })
})

test('files over 10 MB are refused', async () => {
  expect(await prepareUpload(file('big.pdf', 'application/pdf', 11 * 1024 * 1024), ok)).toEqual({
    error: 'Fichier trop lourd (10 Mo maximum)',
  })
})

test('an undecodable HEIC under the limit is uploaded as is', async () => {
  const heic = file('IMG_1.HEIC', 'image/heic', 4_000_000)
  expect(await prepareUpload(heic, broken)).toEqual({ blob: heic, mimeType: 'image/heic', ext: 'heic' })
})

test('an undecodable HEIC over the limit is refused', async () => {
  expect(await prepareUpload(file('IMG_2.HEIC', 'image/heic', 12_000_000), broken)).toEqual({
    error: 'Fichier trop lourd (10 Mo maximum)',
  })
})

test('a HEIC without MIME type is recognised by its extension', async () => {
  const heic = file('IMG_3.heic', '', 1000)
  expect(await prepareUpload(heic, broken)).toMatchObject({ mimeType: 'image/heic' })
})

test('MAX_BYTES is 10 MB', () => expect(MAX_BYTES).toBe(10 * 1024 * 1024))

test('rejectReason refuses unsupported formats', () => {
  expect(rejectReason(file('notes.txt', 'text/plain', 10))).toBe('Format non pris en charge (PDF, JPEG, PNG, HEIC, WebP)')
})

test('rejectReason refuses a PDF over 10 MB', () => {
  expect(rejectReason(file('f.pdf', 'application/pdf', 11 * 1024 * 1024))).toBe('Fichier trop lourd (10 Mo maximum)')
})

test('rejectReason accepts a small PDF and a large photo, which gets resized', () => {
  expect(rejectReason(file('f.pdf', 'application/pdf', 1024 * 1024))).toBeNull()
  expect(rejectReason(file('p.jpg', 'image/jpeg', 12 * 1024 * 1024))).toBeNull()
})
