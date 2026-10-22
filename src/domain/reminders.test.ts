import { makeReminder } from '@/test/factories'
import { nextReminder, reminderStatus, sortByUrgency } from './reminders'

const today = '2026-10-22'
const km = 50000

describe('reminderStatus', () => {
  test('done when doneAt is set', () => {
    expect(reminderStatus(makeReminder({ dueDate: '2020-01-01', doneAt: '2020-01-01' }), km, today)).toBe('done')
  })
  test.each([
    ['2026-10-21', 'overdue'],
    ['2026-10-22', 'soon'],
    ['2026-11-21', 'soon'],
    ['2026-11-22', 'upcoming'],
  ])('due date %s is %s', (dueDate, status) => {
    expect(reminderStatus(makeReminder({ dueDate }), km, today)).toBe(status)
  })
  test.each([
    [50000, 'overdue'],
    [51000, 'soon'],
    [51001, 'upcoming'],
  ])('due odometer %i is %s', (dueOdometer, status) => {
    expect(reminderStatus(makeReminder({ dueOdometer }), km, today)).toBe(status)
  })
  test('keeps the worst of both criteria', () => {
    expect(reminderStatus(makeReminder({ dueDate: '2027-06-01', dueOdometer: 49000 }), km, today)).toBe('overdue')
  })
})

describe('nextReminder', () => {
  test('adds everyMonths to the completion date', () => {
    const r = makeReminder({ type: 'ct', label: 'Contrôle technique', dueDate: '2026-10-01', everyMonths: 24 })
    expect(nextReminder(r, '2026-10-22', 50000)).toEqual({
      vehicleId: r.vehicleId, type: 'ct', label: 'Contrôle technique',
      dueDate: '2028-10-22', dueOdometer: null, everyMonths: 24, everyKm: null,
    })
  })
  test('adds everyKm to the completion odometer', () => {
    const r = makeReminder({ dueOdometer: 50000, everyKm: 15000 })
    expect(nextReminder(r, '2026-10-22', 50000)).toMatchObject({ dueOdometer: 65000, dueDate: null })
  })
  test('returns null when the odometer is needed but unknown', () => {
    expect(nextReminder(makeReminder({ dueOdometer: 50000, everyKm: 15000 }), '2026-10-22', null)).toBeNull()
  })
  test('returns null without recurrence', () => {
    expect(nextReminder(makeReminder({ dueDate: '2026-10-01' }), '2026-10-22', 50000)).toBeNull()
  })
})

test('sortByUrgency orders by status, then date, then km left', () => {
  const items = [
    { name: 'upcoming', status: 'upcoming' as const, dueDate: '2027-01-01', kmLeft: null },
    { name: 'soon-km', status: 'soon' as const, dueDate: null, kmLeft: 500 },
    { name: 'soon-late', status: 'soon' as const, dueDate: '2026-11-10', kmLeft: null },
    { name: 'soon-early', status: 'soon' as const, dueDate: '2026-10-30', kmLeft: null },
    { name: 'overdue', status: 'overdue' as const, dueDate: '2026-01-01', kmLeft: null },
  ]
  expect(sortByUrgency(items).map((i) => i.name)).toEqual(['overdue', 'soon-early', 'soon-late', 'soon-km', 'upcoming'])
})
