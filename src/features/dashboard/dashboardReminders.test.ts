import { makeReminder, makeVehicle } from '@/test/factories'
import { dashboardReminders } from './dashboardReminders'

const today = '2026-10-22'
const clio = makeVehicle({ id: 'clio', initialOdometer: 40000 })
const golf = makeVehicle({ id: 'golf', initialOdometer: 10000 })
const sold = makeVehicle({ id: 'sold', archivedAt: '2026-01-01T00:00:00Z' })
const odometers = { clio: [{ odometer: 50000 }] }

test('keeps only overdue and soon reminders of active vehicles, most urgent first', () => {
  const reminders = [
    makeReminder({ id: 'soon', vehicleId: 'clio', dueOdometer: 50800 }),
    makeReminder({ id: 'overdue', vehicleId: 'golf', dueDate: '2026-10-01' }),
    makeReminder({ id: 'upcoming', vehicleId: 'clio', dueDate: '2027-06-01' }),
    makeReminder({ id: 'done', vehicleId: 'clio', dueDate: '2026-10-01', doneAt: '2026-10-02' }),
    makeReminder({ id: 'archived', vehicleId: 'sold', dueDate: '2026-01-01' }),
  ]
  const result = dashboardReminders([clio, golf, sold], reminders, odometers, today)
  expect(result.map((r) => [r.reminder.id, r.status, r.vehicle.id])).toEqual([
    ['overdue', 'overdue', 'golf'],
    ['soon', 'soon', 'clio'],
  ])
})

test('kmLeft uses the current odometer of the vehicle', () => {
  const [r] = dashboardReminders([clio], [makeReminder({ vehicleId: 'clio', dueOdometer: 50800 })], odometers, today)
  expect(r.kmLeft).toBe(800)
})
