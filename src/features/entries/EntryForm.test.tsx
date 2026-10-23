import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addMonthsIso, todayLocal } from '@/domain/format'
import type { EntryKind } from '@/domain/types'
import { makeEntry, makeVehicle } from '@/test/factories'
import { EMPTY_GUESS } from '@/domain/invoice/parseInvoice'
import { EntryForm } from './EntryForm'

const vehicle = makeVehicle({ initialOdometer: 40000 })
const entries = [makeEntry({ odometer: 52000 })]
const norm = (s: string | null) => (s ?? '').replace(/\s/g, ' ')

function setup(kind: EntryKind) {
  const onSubmit = vi.fn()
  render(<EntryForm vehicle={vehicle} entries={entries} kind={kind} onSubmit={onSubmit} />)
  return { onSubmit, user: userEvent.setup() }
}

test('a fuel entry asks for liters and full tank, not category or garage', async () => {
  const { onSubmit, user } = setup('fuel')
  expect(screen.getByLabelText('Plein complet')).toBeChecked()
  expect(screen.queryByLabelText('Catégorie')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Garage')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(screen.getByText('Indiquez le nombre de litres')).toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
})

test('a maintenance entry offers categories', () => {
  setup('maintenance')
  const select = screen.getByLabelText('Catégorie')
  const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
  expect(options).toEqual(['Vidange', 'Freins', 'Pneus', 'Distribution', 'Carrosserie', 'Contrôle technique', 'Autre'])
})

test('the odometer is prefilled with the current odometer', () => {
  setup('fuel')
  expect(screen.getByLabelText('Kilométrage')).toHaveValue('52000')
})

test('a lower odometer warns but does not block', async () => {
  const { onSubmit, user } = setup('repair')
  const km = screen.getByLabelText('Kilométrage')
  await user.clear(km)
  await user.type(km, '51000')
  expect(norm(screen.getByText(/Kilométrage inférieur au dernier relevé/).textContent)).toBe(
    'Kilométrage inférieur au dernier relevé (52 000 km)',
  )
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ odometer: 51000, kind: 'repair', title: 'Réparation' }))
})

test('French decimals are parsed for liters and amount', async () => {
  const { onSubmit, user } = setup('fuel')
  await user.type(screen.getByLabelText('Litres'), '45,3')
  await user.type(screen.getByLabelText('Montant (€)'), '62,10')
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(onSubmit).toHaveBeenCalledWith({
    kind: 'fuel', date: todayLocal(), odometer: 52000, title: 'Plein', category: null, garage: null,
    amountCents: 6210, liters: 45.3, fullTank: true, notes: null,
  })
})

test('a date more than one year ahead is refused', async () => {
  const { onSubmit, user } = setup('other')
  const date = screen.getByLabelText('Date')
  await user.clear(date)
  await user.type(date, addMonthsIso(todayLocal(), 13))
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  expect(screen.getByText('Date trop lointaine (un an maximum)')).toBeInTheDocument()
  expect(onSubmit).not.toHaveBeenCalled()
})

test('a scanned invoice prefills fields and flags them for checking', async () => {
  const prefill = { ...EMPTY_GUESS, date: '2026-10-03', amountCents: 7623, liters: 42.35 }
  render(<EntryForm vehicle={vehicle} entries={entries} kind="fuel" prefill={prefill} onSubmit={vi.fn()} />)
  expect(screen.getByLabelText('Date')).toHaveValue('2026-10-03')
  expect(screen.getByLabelText('Montant (€)')).toHaveValue('76,23')
  expect(screen.getByLabelText('Litres')).toHaveValue('42,35')
  expect(screen.getAllByText('À vérifier')).toHaveLength(3)
  await userEvent.setup().type(screen.getByLabelText('Montant (€)'), '0')
  expect(screen.getAllByText('À vérifier')).toHaveLength(2)
})

test('a scanned garage and category prefill a maintenance entry', () => {
  const prefill = { ...EMPTY_GUESS, garage: 'Norauto', category: 'brakes' as const, odometer: 60000 }
  render(<EntryForm vehicle={vehicle} entries={entries} kind="maintenance" prefill={prefill} onSubmit={vi.fn()} />)
  expect(screen.getByLabelText('Garage')).toHaveValue('Norauto')
  expect(screen.getByLabelText('Catégorie')).toHaveValue('brakes')
  expect(screen.getByLabelText('Kilométrage')).toHaveValue('60000')
  expect(screen.getAllByText('À vérifier')).toHaveLength(3)
})
