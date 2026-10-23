import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { makeEntry, makeVehicle } from '@/test/factories'
import { EMPTY_GUESS } from '@/domain/invoice/parseInvoice'
import { EntryPage } from './EntryPage'

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  addDocument: vi.fn(),
}))
vi.mock('@/features/vehicles/VehiclePage', () => ({ useCurrentVehicle: () => makeVehicle({ id: 'v1' }) }))
vi.mock('@/api/entries', () => ({
  useEntries: () => ({ data: [], isLoading: false }),
  useSaveEntry: () => ({ mutateAsync: mocks.save, isPending: false, error: null }),
  useDeleteEntry: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/api/documents', () => ({
  useDocuments: () => ({ data: [] }),
  useAddDocument: () => ({ mutateAsync: mocks.addDocument }),
}))

function renderNewFuel() {
  render(
    <MemoryRouter initialEntries={['/voitures/v1/entrees/nouvelle?type=fuel']}>
      <Routes>
        <Route path="/voitures/:vehicleId/entrees/nouvelle" element={<EntryPage />} />
        <Route path="/voitures/:vehicleId/journal" element={<p>Journal affiché</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup({ applyAccept: false })
}

beforeEach(() => {
  mocks.save.mockResolvedValue(makeEntry({ id: 'e1', vehicleId: 'v1' }))
})

test('invoices attached to a new entry are uploaded after saving it', async () => {
  mocks.addDocument.mockResolvedValue(undefined)
  const user = renderNewFuel()
  const pdf = new File(['%PDF'], 'ticket.pdf', { type: 'application/pdf' })
  await user.type(screen.getByLabelText('Litres'), '40')
  await user.upload(screen.getByLabelText('Choisir un fichier'), pdf)
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(mocks.addDocument).toHaveBeenCalledWith({ vehicleId: 'v1', entryId: 'e1', file: pdf })
  expect(await screen.findByText('Journal affiché')).toBeInTheDocument()
})

test('a failed upload keeps the saved entry and offers a retry', async () => {
  mocks.addDocument.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined)
  const user = renderNewFuel()
  await user.type(screen.getByLabelText('Litres'), '40')
  await user.upload(screen.getByLabelText('Choisir un fichier'), new File(['%PDF'], 'ticket.pdf', { type: 'application/pdf' }))
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(await screen.findByText('Entrée enregistrée, mais l’envoi de 1 facture a échoué.')).toBeInTheDocument()
  expect(mocks.save).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))
  expect(mocks.addDocument).toHaveBeenCalledTimes(2)
  expect(await screen.findByText('Journal affiché')).toBeInTheDocument()
})

test('the save button stays disabled while invoices upload', async () => {
  mocks.addDocument.mockReturnValue(new Promise(() => {}))
  const user = renderNewFuel()
  await user.type(screen.getByLabelText('Litres'), '40')
  await user.upload(screen.getByLabelText('Choisir un fichier'), new File(['%PDF'], 'ticket.pdf', { type: 'application/pdf' }))
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(await screen.findByText('Envoi des factures…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
})

function renderScanned(file: File, garage: string | null) {
  const state = { scan: { guess: { ...EMPTY_GUESS, garage }, file } }
  render(
    <MemoryRouter initialEntries={[{ pathname: '/voitures/v1/entrees/nouvelle', search: '?type=maintenance', state }]}>
      <Routes>
        <Route path="/voitures/:vehicleId/entrees/nouvelle" element={<EntryPage />} />
        <Route path="/voitures/:vehicleId/journal" element={<p>Journal affiché</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

test('a scanned invoice is attached and the form asks to check the fields', async () => {
  mocks.addDocument.mockResolvedValue(undefined)
  const scan = new File(['%PDF'], 'facture-norauto.pdf', { type: 'application/pdf' })
  const user = renderScanned(scan, 'Norauto')
  expect(screen.getByText('Vérifiez les champs surlignés')).toBeInTheDocument()
  expect(screen.getByText('facture-norauto.pdf')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(mocks.addDocument).toHaveBeenCalledWith({ vehicleId: 'v1', entryId: 'e1', file: scan })
})

test('a scan that found nothing says so', () => {
  renderScanned(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }), null)
  expect(screen.getByText('Aucune information lue, complétez le formulaire')).toBeInTheDocument()
})

test('without a scan (e.g. after a reload) the form is plain', () => {
  renderNewFuel()
  expect(screen.queryByText('Vérifiez les champs surlignés')).not.toBeInTheDocument()
  expect(screen.queryByText('Aucune information lue, complétez le formulaire')).not.toBeInTheDocument()
  expect(screen.queryByText('À vérifier')).not.toBeInTheDocument()
})
