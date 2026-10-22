import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fuel, makeEntry, makeVehicle } from '@/test/factories'
import { CostsView } from './CostsTab'

const norm = (s: string | null) => (s ?? '').replace(/\s/g, ' ')
const entries = [
  makeEntry({ date: '2025-06-01', kind: 'repair', amountCents: 30000 }),
  { ...fuel('2026-01-01', 10000, 40, true), amountCents: 6000 },
  { ...fuel('2026-02-01', 10500, 31, true), amountCents: 5000 },
  makeEntry({ date: '2026-03-01', kind: 'maintenance', amountCents: 9000 }),
]

test('shows the totals of the selected year', async () => {
  render(<CostsView vehicle={makeVehicle()} entries={entries} />)
  expect(norm(screen.getByTestId('year-total').textContent)).toBe('200,00 €')
  await userEvent.selectOptions(screen.getByLabelText('Année'), '2025')
  expect(norm(screen.getByTestId('year-total').textContent)).toBe('300,00 €')
})

test('shows the average consumption', () => {
  render(<CostsView vehicle={makeVehicle()} entries={entries} />)
  expect(norm(screen.getByTestId('consumption').textContent)).toBe('6,2 L/100 km')
})

test('explains when consumption cannot be computed', () => {
  render(<CostsView vehicle={makeVehicle()} entries={[entries[0]]} />)
  expect(screen.getByText('Pas assez de données (2 pleins complets avec kilométrage nécessaires)')).toBeInTheDocument()
})

test('hides consumption for an electric car', () => {
  render(<CostsView vehicle={makeVehicle({ fuelType: 'electric' })} entries={entries} />)
  expect(screen.queryByText('Consommation moyenne')).not.toBeInTheDocument()
})

test('breaks down the year by kind with percentages', () => {
  render(<CostsView vehicle={makeVehicle()} entries={entries} />)
  const breakdown = screen.getByRole('list', { name: 'Répartition par type' })
  const rows = within(breakdown).getAllByRole('listitem').map((li) => norm(li.textContent))
  expect(rows).toEqual([
    'Entretien90,00 € · 45 %',
    'Réparation0,00 € · 0 %',
    'Carburant110,00 € · 55 %',
    'Autre dépense0,00 € · 0 %',
  ])
})
