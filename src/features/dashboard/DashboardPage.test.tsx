import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { makeVehicle } from '@/test/factories'
import { DashboardPage } from './DashboardPage'

const state = vi.hoisted(() => ({
  vehicles: [] as unknown[],
  reminders: { data: [] as unknown[] | undefined, isLoading: false, error: null as Error | null },
}))
vi.mock('@/api/vehicles', () => ({ useVehicles: () => ({ data: state.vehicles, isLoading: false }) }))
vi.mock('@/api/reminders', () => ({ useReminders: () => state.reminders }))
vi.mock('@/api/entries', () => ({ useAllOdometers: () => ({ data: [] }) }))
vi.mock('@/api/documents', () => ({ useSignedUrl: () => ({ data: undefined }) }))

const renderPage = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>)

test('without vehicles, invites to add the first one', () => {
  state.vehicles = []
  renderPage()
  expect(screen.getByText('Ajoutez votre première voiture')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ajouter une voiture' })).toHaveAttribute('href', '/voitures/nouvelle')
})

test('does not claim everything is fine while reminders are loading', () => {
  state.vehicles = [makeVehicle()]
  state.reminders = { data: undefined, isLoading: true, error: null }
  renderPage()
  expect(screen.queryByText(/Rien d’urgent/)).not.toBeInTheDocument()
})

test('says when reminders could not be loaded', () => {
  state.vehicles = [makeVehicle()]
  state.reminders = { data: undefined, isLoading: false, error: new Error('network') }
  renderPage()
  expect(screen.getByRole('alert')).toHaveTextContent('Impossible de charger les échéances')
  expect(screen.queryByText(/Rien d’urgent/)).not.toBeInTheDocument()
})

test('all clear only when reminders are loaded and none is urgent', () => {
  state.vehicles = [makeVehicle()]
  state.reminders = { data: [], isLoading: false, error: null }
  renderPage()
  expect(screen.getByText(/Rien d’urgent/)).toBeInTheDocument()
})
