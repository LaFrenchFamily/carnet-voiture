import { useState } from 'react'
import { useEntries } from '@/api/entries'
import { useDeleteReminder, useReminders, useSaveReminder } from '@/api/reminders'
import { Button, Card, ErrorMessage, Spinner } from '@/components/ui'
import { todayLocal } from '@/domain/format'
import { currentOdometer } from '@/domain/odometer'
import { describeDue, reminderStatus, sortByUrgency } from '@/domain/reminders'
import type { Reminder } from '@/domain/types'
import { useCurrentVehicle } from '@/features/vehicles/VehiclePage'
import { CompleteReminderSheet } from './CompleteReminderSheet'
import { ReminderBadge } from './ReminderBadge'
import { ReminderForm } from './ReminderForm'

export function RemindersTab() {
  const vehicle = useCurrentVehicle()
  const { data: reminders, isLoading, error } = useReminders(vehicle.id)
  const { data: entries } = useEntries(vehicle.id)
  const save = useSaveReminder()
  const remove = useDeleteReminder()
  const [editing, setEditing] = useState<Reminder | 'new' | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  const km = currentOdometer(vehicle, entries ?? [])
  const today = todayLocal()
  const open = sortByUrgency(
    (reminders ?? []).filter((r) => !r.doneAt).map((r) => ({
      ...r, status: reminderStatus(r, km, today), kmLeft: r.dueOdometer === null ? null : r.dueOdometer - km,
    })),
  )
  const done = (reminders ?? []).filter((r) => r.doneAt).sort((a, b) => b.doneAt!.localeCompare(a.doneAt!))

  if (editing) {
    return (
      <Card>
        <h2 className="mb-3 font-semibold">{editing === 'new' ? 'Nouvelle échéance' : 'Modifier l’échéance'}</h2>
        <ReminderForm
          initial={editing === 'new' ? undefined : editing}
          submitting={save.isPending}
          onSubmit={(v) => save.mutate({ ...v, vehicleId: vehicle.id, id: editing === 'new' ? undefined : editing.id }, { onSuccess: () => setEditing(null) })}
        />
        {save.error && <div className="mt-2"><ErrorMessage>Impossible d’enregistrer. Réessayez.</ErrorMessage></div>}
        <div className="mt-2 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setEditing(null)}>Annuler</Button>
          {editing !== 'new' && (
            <Button variant="ghost" className="text-red-700" onClick={() => window.confirm('Supprimer cette échéance ?') && remove.mutate(editing.id, { onSuccess: () => setEditing(null) })}>
              Supprimer
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => setEditing('new')}>+ Ajouter une échéance</Button>
      {isLoading && <Spinner />}
      {error && <ErrorMessage>Impossible de charger les échéances.</ErrorMessage>}
      {reminders && open.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">Aucune échéance. Ajoutez le contrôle technique, l’assurance ou la prochaine vidange.</p>
      )}
      <ul className="flex flex-col gap-2">
        {open.map((r) => (
          <li key={r.id}>
            {completing === r.id ? (
              <CompleteReminderSheet reminder={r} currentKm={km} onDone={() => setCompleting(null)} />
            ) : (
              <Card className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="min-w-0 text-left" onClick={() => setEditing(r)}>
                    <p className="font-medium">{r.label}</p>
                    <p className="text-sm text-slate-600">{describeDue(r, km, today)}</p>
                  </button>
                  <ReminderBadge status={r.status} />
                </div>
                <Button variant="secondary" onClick={() => setCompleting(r.id)}>Marquer comme fait</Button>
              </Card>
            )}
          </li>
        ))}
      </ul>
      {done.length > 0 && (
        <details className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <summary className="cursor-pointer font-medium">Historique ({done.length})</summary>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
            {done.map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span>{r.label}</span>
                <span>fait le {new Date(`${r.doneAt}T00:00`).toLocaleDateString('fr-FR')}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
