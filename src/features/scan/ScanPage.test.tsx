import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import type { ReadProgress } from '@/lib/ocr/readInvoice'
import { ScanPage } from './ScanPage'

const mocks = vi.hoisted(() => ({ readInvoice: vi.fn() }))
vi.mock('@/lib/ocr/readInvoice', () => ({
  readInvoice: mocks.readInvoice,
  OcrUnavailableError: class OcrUnavailableError extends Error {},
}))

function Probe() {
  const { state, search } = useLocation()
  return (
    <p>
      {`formulaire ${search} ${JSON.stringify(state.scan.guess)} ${state.scan.file.name}`}
    </p>
  )
}

function renderScan() {
  render(
    <MemoryRouter initialEntries={['/voitures/v1/entrees/lire']}>
      <Routes>
        <Route path="/voitures/:vehicleId/entrees/lire" element={<ScanPage />} />
        <Route path="/voitures/:vehicleId/entrees/nouvelle" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup({ applyAccept: false })
}

const photo = new File(['x'], 'facture.jpg', { type: 'image/jpeg' })

afterEach(() => vi.useRealTimers())

test('a read invoice opens the prefilled form with the file', async () => {
  mocks.readInvoice.mockResolvedValue('Facture\nGazole\nNet à payer 70,00')
  const user = renderScan()
  await user.upload(screen.getByLabelText('Choisir un fichier'), photo)
  const form = await screen.findByText(/formulaire/)
  expect(form).toHaveTextContent('"amountCents":7000')
  expect(form).toHaveTextContent('?type=fuel')
  expect(form).toHaveTextContent('facture.jpg')
})

test('an unsupported file is refused before reading', async () => {
  const user = renderScan()
  await user.upload(screen.getByLabelText('Choisir un fichier'), new File(['x'], 'notes.txt', { type: 'text/plain' }))
  expect(screen.getByText('Format non pris en charge (PDF, JPEG, PNG, HEIC, WebP)')).toBeInTheDocument()
  expect(mocks.readInvoice).not.toHaveBeenCalled()
})

test('"Passer" goes to the form with the file and nothing guessed', async () => {
  mocks.readInvoice.mockReturnValue(new Promise(() => {}))
  const user = renderScan()
  await user.upload(screen.getByLabelText('Prendre en photo'), photo)
  await user.click(await screen.findByRole('button', { name: 'Passer' }))
  const form = await screen.findByText(/formulaire/)
  expect(form).toHaveTextContent('"amountCents":null')
  expect(form).toHaveTextContent('?type=maintenance')
  expect(form).toHaveTextContent('facture.jpg')
})

test('reading gives up after 45 seconds', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  mocks.readInvoice.mockReturnValue(new Promise(() => {}))
  const user = userEvent.setup({ applyAccept: false, advanceTimers: vi.advanceTimersByTime })
  render(
    <MemoryRouter initialEntries={['/voitures/v1/entrees/lire']}>
      <Routes>
        <Route path="/voitures/:vehicleId/entrees/lire" element={<ScanPage />} />
        <Route path="/voitures/:vehicleId/entrees/nouvelle" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  )
  await user.upload(screen.getByLabelText('Choisir un fichier'), photo)
  await screen.findByText('Lecture de la facture…')
  await act(async () => { vi.advanceTimersByTime(45_000) })
  expect(await screen.findByText(/formulaire/)).toHaveTextContent('facture.jpg')
})

test('an unavailable reader says so, then continues to the form with the file', async () => {
  const { OcrUnavailableError } = await import('@/lib/ocr/readInvoice')
  mocks.readInvoice.mockRejectedValue(new OcrUnavailableError('offline'))
  const user = renderScan()
  await user.upload(screen.getByLabelText('Choisir un fichier'), photo)
  expect(await screen.findByText('Lecture impossible pour l’instant')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Continuer' }))
  expect(await screen.findByText(/formulaire/)).toHaveTextContent('facture.jpg')
})

test('any other reading error goes straight to the form with the file', async () => {
  mocks.readInvoice.mockRejectedValue(new Error('cannot decode HEIC'))
  const user = renderScan()
  await user.upload(screen.getByLabelText('Choisir un fichier'), photo)
  expect(await screen.findByText(/formulaire/)).toHaveTextContent('"amountCents":null')
})

test('the first use explains the download', async () => {
  let report: (p: ReadProgress) => void = () => {}
  mocks.readInvoice.mockImplementation((_f: File, onProgress: (p: ReadProgress) => void) => {
    report = onProgress
    return new Promise(() => {})
  })
  const user = renderScan()
  await user.upload(screen.getByLabelText('Choisir un fichier'), photo)
  act(() => report({ stage: 'download', ratio: 0.3 }))
  expect(screen.getByText('Première utilisation : téléchargement de l’outil de lecture (≈ 5 Mo)')).toBeInTheDocument()
})
