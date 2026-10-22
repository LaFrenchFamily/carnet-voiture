import { makeReminder } from '@/test/factories'
import { completeReminder } from './reminders'

const db = vi.hoisted(() => {
  const calls: { op: string; table: string; payload?: unknown; id?: unknown }[] = []
  const from = (table: string) => ({
    update: (payload: unknown) => ({
      eq: async (_col: string, id: unknown) => {
        calls.push({ op: 'update', table, payload, id })
        return { data: null, error: null }
      },
    }),
    insert: async (payload: unknown) => {
      calls.push({ op: 'insert', table, payload })
      return { data: null, error: null }
    },
  })
  return { calls, from }
})
vi.mock('@/lib/supabase', () => ({ supabase: { from: db.from } }))

beforeEach(() => db.calls.splice(0))

test('a recurring reminder is closed and the next one created', async () => {
  const r = makeReminder({ id: 'r1', vehicleId: 'v1', type: 'ct', label: 'Contrôle technique', dueDate: '2026-10-30', everyMonths: 24 })
  await completeReminder(r, '2026-10-22', 50000, 'e1')
  expect(db.calls).toEqual([
    { op: 'update', table: 'reminders', payload: { done_at: '2026-10-22', done_entry_id: 'e1' }, id: 'r1' },
    {
      op: 'insert', table: 'reminders',
      payload: {
        vehicle_id: 'v1', type: 'ct', label: 'Contrôle technique', due_date: '2028-10-22', due_odometer: null,
        every_months: 24, every_km: null,
      },
    },
  ])
})

test('a one-off reminder is only closed', async () => {
  await completeReminder(makeReminder({ id: 'r2', dueDate: '2026-10-30' }), '2026-10-22', null, null)
  expect(db.calls).toEqual([
    { op: 'update', table: 'reminders', payload: { done_at: '2026-10-22', done_entry_id: null }, id: 'r2' },
  ])
})
