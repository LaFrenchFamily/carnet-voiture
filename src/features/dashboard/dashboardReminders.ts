import { currentOdometer } from '@/domain/odometer'
import { reminderStatus, sortByUrgency, type ReminderStatus } from '@/domain/reminders'
import type { Entry, Reminder, Vehicle } from '@/domain/types'

export interface DashboardReminder {
  reminder: Reminder
  vehicle: Vehicle
  status: ReminderStatus
  dueDate: string | null
  kmLeft: number | null
}

/** Overdue and soon reminders of active vehicles, most urgent first. */
export function dashboardReminders(
  vehicles: Vehicle[],
  reminders: Reminder[],
  odometersByVehicle: Record<string, Pick<Entry, 'odometer'>[]>,
  today: string,
): DashboardReminder[] {
  const active = new Map(vehicles.filter((v) => !v.archivedAt).map((v) => [v.id, v]))
  const items: DashboardReminder[] = []
  for (const reminder of reminders) {
    const vehicle = active.get(reminder.vehicleId)
    if (!vehicle || reminder.doneAt) continue
    const km = currentOdometer(vehicle, odometersByVehicle[vehicle.id] ?? [])
    const status = reminderStatus(reminder, km, today)
    if (status !== 'overdue' && status !== 'soon') continue
    items.push({
      reminder, vehicle, status, dueDate: reminder.dueDate,
      kmLeft: reminder.dueOdometer === null ? null : reminder.dueOdometer - km,
    })
  }
  return sortByUrgency(items)
}

export function groupOdometers(rows: { vehicleId: string; odometer: number | null }[]): Record<string, Pick<Entry, 'odometer'>[]> {
  const grouped: Record<string, Pick<Entry, 'odometer'>[]> = {}
  for (const r of rows) (grouped[r.vehicleId] ??= []).push({ odometer: r.odometer })
  return grouped
}
