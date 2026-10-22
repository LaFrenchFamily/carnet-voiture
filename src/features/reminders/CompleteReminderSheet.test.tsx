import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { makeEntry, makeReminder } from '@/test/factories'
import { CompleteReminderSheet } from './CompleteReminderSheet'

const mocks = vi.hoisted(() => ({ saveEntry: vi.fn(), complete: vi.fn() }))
vi.mock('@/api/entries', () => ({ useSaveEntry: () => ({ mutateAsync: mocks.saveEntry, isPending: false }) }))
vi.mock('@/api/reminders', () => ({ useCompleteReminder: () => ({ mutateAsync: mocks.complete, isPending: false }) }))

const reminder = makeReminder({ id: 'r1', label: 'Vidange', type: 'oil', dueOdometer: 50000, everyKm: 15000 })

beforeEach(() => {
  mocks.saveEntry.mockReset().mockResolvedValue(makeEntry({ id: 'e1' }))
  mocks.complete.mockReset().mockResolvedValue(undefined)
})

test('refuses a non-integer odometer', async () => {
  const user = userEvent.setup()
  render(<CompleteReminderSheet reminder={reminder} currentKm={50000} onDone={vi.fn()} />)
  const km = screen.getByLabelText('Au kilométrage')
  await user.clear(km)
  await user.type(km, '45,5')
  await user.click(screen.getByRole('button', { name: 'Valider' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Kilométrage invalide')
  expect(mocks.saveEntry).not.toHaveBeenCalled()
})

test('retrying after a failure does not create a second journal entry', async () => {
  mocks.complete.mockRejectedValueOnce(new Error('network'))
  const onDone = vi.fn()
  const user = userEvent.setup()
  render(<CompleteReminderSheet reminder={reminder} currentKm={50000} onDone={onDone} />)
  await user.click(screen.getByRole('button', { name: 'Valider' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Impossible d’enregistrer')
  await user.click(screen.getByRole('button', { name: 'Valider' }))
  expect(mocks.saveEntry).toHaveBeenCalledTimes(1)
  expect(mocks.complete).toHaveBeenLastCalledWith(expect.objectContaining({ entryId: 'e1', doneKm: 50000 }))
  expect(onDone).toHaveBeenCalled()
})
