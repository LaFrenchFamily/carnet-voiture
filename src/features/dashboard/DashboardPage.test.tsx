import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { DashboardPage } from './DashboardPage'

vi.mock('@/api/vehicles', () => ({ useVehicles: () => ({ data: [], isLoading: false }) }))
vi.mock('@/api/reminders', () => ({ useReminders: () => ({ data: [] }) }))
vi.mock('@/api/entries', () => ({ useAllOdometers: () => ({ data: [] }) }))
vi.mock('@/api/documents', () => ({ useSignedUrl: () => ({ data: undefined }) }))

test('without vehicles, invites to add the first one', () => {
  render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  expect(screen.getByText('Ajoutez votre première voiture')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ajouter une voiture' })).toHaveAttribute('href', '/voitures/nouvelle')
})
