import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { makeEntry, makeVehicle } from '@/test/factories'
import { EntryPage } from './EntryPage'

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  addDocument: vi.fn(),
}))
vi.mock('@/features/vehicles/VehiclePage', () => ({ useCurrentVehicle: () => makeVehicle({ id: 'v1' }) }))
vi.mock('@/api/entries', () => ({
  useEntries: () => ({ data: [], isLoading: false }),
  useSaveEntry: () => ({ mutate: mocks.save, isPending: false, error: null }),
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
  mocks.save.mockImplementation((_values, { onSuccess }) => onSuccess(makeEntry({ id: 'e1', vehicleId: 'v1' })))
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
