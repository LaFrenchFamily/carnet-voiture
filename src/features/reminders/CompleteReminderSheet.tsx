import { useState } from 'react'
import { useSaveEntry } from '@/api/entries'
import { useCompleteReminder } from '@/api/reminders'
import { Button, Card, ErrorMessage, TextField } from '@/components/ui'
import { parseDecimalFr, todayLocal } from '@/domain/format'
import type { Reminder } from '@/domain/types'

const CATEGORY_BY_TYPE: Partial<Record<Reminder['type'], string>> = { ct: 'ct', oil: 'oil', tires: 'tires', timing_belt: 'timing_belt' }

export function CompleteReminderSheet({ reminder, currentKm, onDone }: { reminder: Reminder; currentKm: number; onDone(): void }) {
  const [date, setDate] = useState(todayLocal())
  const [km, setKm] = useState(currentKm.toString())
  const [createEntry, setCreateEntry] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // The journal entry created on a first attempt, reused if completing the reminder must be retried.
  const [createdEntryId, setCreatedEntryId] = useState<string | null>(null)
  const complete = useCompleteReminder()
  const saveEntry = useSaveEntry()
  const busy = complete.isPending || saveEntry.isPending

  async function submit() {
    const doneKm = km.trim() === '' ? null : parseDecimalFr(km)
    if (!date || date > todayLocal()) return setError('Indiquez une date passée ou aujourd’hui')
    if (doneKm !== null && !(Number.isInteger(doneKm) && doneKm > 0)) return setError('Kilométrage invalide')
    if (km.trim() !== '' && doneKm === null) return setError('Kilométrage invalide')
    setError(null)
    try {
      let entryId = createdEntryId
      if (createEntry && entryId === null) {
        const entry = await saveEntry.mutateAsync({
          vehicleId: reminder.vehicleId, kind: 'maintenance', date, odometer: doneKm, title: reminder.label,
          category: CATEGORY_BY_TYPE[reminder.type] ?? 'other', garage: null, amountCents: null, liters: null, fullTank: null, notes: null,
        })
        entryId = entry.id
        setCreatedEntryId(entryId)
      }
      await complete.mutateAsync({ reminder, doneDate: date, doneKm, entryId: createEntry ? entryId : null })
      onDone()
    } catch {
      setError('Impossible d’enregistrer. Réessayez.')
    }
  }

  return (
    <Card className="flex flex-col gap-3 ring-blue-300">
      <h3 className="font-semibold">{reminder.label} : marquer comme fait</h3>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Fait le" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField label="Au kilométrage" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={createEntry} onChange={(e) => setCreateEntry(e.target.checked)} />
        Créer aussi l’entrée d’entretien dans le journal
      </label>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <div className="flex gap-2">
        <Button className="flex-1" disabled={busy} onClick={submit}>Valider</Button>
        <Button variant="secondary" onClick={onDone}>Annuler</Button>
      </div>
    </Card>
  )
}
