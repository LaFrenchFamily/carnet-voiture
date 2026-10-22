import type { ReminderStatus } from '@/domain/reminders'

const STYLES: Record<ReminderStatus, [string, string]> = {
  overdue: ['En retard', 'bg-red-100 text-red-800'],
  soon: ['Bientôt', 'bg-orange-100 text-orange-800'],
  upcoming: ['À venir', 'bg-slate-100 text-slate-700'],
  done: ['Fait', 'bg-green-100 text-green-800'],
}

export function ReminderBadge({ status }: { status: ReminderStatus }) {
  const [label, cls] = STYLES[status]
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
}
