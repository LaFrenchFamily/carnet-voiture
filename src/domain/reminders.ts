import { differenceInCalendarDays, parseISO } from 'date-fns'
import { addMonthsIso, formatKm } from './format'
import type { Reminder, ReminderType } from './types'

export type ReminderStatus = 'overdue' | 'soon' | 'upcoming' | 'done'

export const SOON_DAYS = 30
export const SOON_KM = 1000

export const REMINDER_LABELS: Record<ReminderType, string> = {
  ct: 'Contrôle technique',
  insurance: 'Assurance',
  oil: 'Vidange',
  tires: 'Pneus',
  timing_belt: 'Distribution',
  custom: 'Autre',
}

const RANK: Record<ReminderStatus, number> = { overdue: 0, soon: 1, upcoming: 2, done: 3 }

function worst(a: ReminderStatus, b: ReminderStatus): ReminderStatus {
  return RANK[a] <= RANK[b] ? a : b
}

export function reminderStatus(r: Reminder, currentKm: number, today: string): ReminderStatus {
  if (r.doneAt) return 'done'
  let status: ReminderStatus = 'upcoming'
  if (r.dueDate) {
    const days = differenceInCalendarDays(parseISO(r.dueDate), parseISO(today))
    status = worst(status, days < 0 ? 'overdue' : days <= SOON_DAYS ? 'soon' : 'upcoming')
  }
  if (r.dueOdometer !== null) {
    const left = r.dueOdometer - currentKm
    status = worst(status, left <= 0 ? 'overdue' : left <= SOON_KM ? 'soon' : 'upcoming')
  }
  return status
}

export type NewReminder = Omit<Reminder, 'id' | 'doneAt' | 'doneEntryId'>

/** The reminder that follows a completed recurring one, or null when it cannot be computed. */
export function nextReminder(r: Reminder, doneDate: string, doneKm: number | null): NewReminder | null {
  const dueDate = r.everyMonths ? addMonthsIso(doneDate, r.everyMonths) : null
  const dueOdometer = r.everyKm && doneKm !== null ? doneKm + r.everyKm : null
  if (dueDate === null && dueOdometer === null) return null
  return {
    vehicleId: r.vehicleId,
    type: r.type,
    label: r.label,
    dueDate,
    dueOdometer,
    everyMonths: r.everyMonths,
    everyKm: r.everyKm,
  }
}

export function sortByUrgency<T extends { status: ReminderStatus; dueDate: string | null; kmLeft: number | null }>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      RANK[a.status] - RANK[b.status] ||
      (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
      (a.kmLeft ?? Number.MAX_SAFE_INTEGER) - (b.kmLeft ?? Number.MAX_SAFE_INTEGER),
  )
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/** Human-readable time and distance left, e.g. "dans 10 jours · dans 1 500 km". */
export function describeDue(r: Reminder, currentKm: number, today: string): string {
  const parts: string[] = []
  if (r.dueDate) {
    const days = differenceInCalendarDays(parseISO(r.dueDate), parseISO(today))
    parts.push(days === 0 ? 'aujourd’hui' : days > 0 ? `dans ${plural(days, 'jour')}` : `dépassée de ${plural(-days, 'jour')}`)
  }
  if (r.dueOdometer !== null) {
    const left = r.dueOdometer - currentKm
    parts.push(left > 0 ? `dans ${formatKm(left)}` : `dépassée de ${formatKm(-left)}`)
  }
  return parts.join(' · ')
}
