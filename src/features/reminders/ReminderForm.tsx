import { useState, type FormEvent } from 'react'
import { Button, ErrorMessage, SelectField, TextField } from '@/components/ui'
import { parseDecimalFr } from '@/domain/format'
import { REMINDER_LABELS, type NewReminder } from '@/domain/reminders'
import type { Reminder, ReminderType } from '@/domain/types'

export type ReminderInput = Omit<NewReminder, 'vehicleId'>

const PRESETS: Record<ReminderType, { everyMonths?: number; everyKm?: number }> = {
  ct: { everyMonths: 24 },
  insurance: { everyMonths: 12 },
  oil: { everyMonths: 12, everyKm: 15000 },
  tires: {},
  timing_belt: { everyKm: 120000 },
  custom: {},
}

const toStr = (n: number | null | undefined) => (n == null ? '' : n.toString())

function parsePositiveInt(s: string): number | null | 'invalid' {
  if (s.trim() === '') return null
  const n = parseDecimalFr(s)
  return n !== null && Number.isInteger(n) && n > 0 ? n : 'invalid'
}

export function ReminderForm({ initial, onSubmit, submitting }: { initial?: Reminder; onSubmit(v: ReminderInput): void; submitting?: boolean }) {
  const [type, setType] = useState<ReminderType>(initial?.type ?? 'custom')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [dueKm, setDueKm] = useState(toStr(initial?.dueOdometer))
  const [everyMonths, setEveryMonths] = useState(toStr(initial?.everyMonths))
  const [everyKm, setEveryKm] = useState(toStr(initial?.everyKm))
  const [error, setError] = useState<string | null>(null)

  function changeType(next: ReminderType) {
    setType(next)
    if (next !== 'custom') setLabel(REMINDER_LABELS[next])
    setEveryMonths(toStr(PRESETS[next].everyMonths))
    setEveryKm(toStr(PRESETS[next].everyKm))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const km = parsePositiveInt(dueKm)
    const months = parsePositiveInt(everyMonths)
    const kmStep = parsePositiveInt(everyKm)
    if (!dueDate && km === null) return setError('Indiquez une date, un kilométrage, ou les deux')
    if (km === 'invalid' || months === 'invalid' || kmStep === 'invalid') return setError('Vérifiez les nombres saisis')
    if (!label.trim() && type === 'custom') return setError('Indiquez un libellé')
    setError(null)
    onSubmit({
      type,
      label: label.trim() || REMINDER_LABELS[type],
      dueDate: dueDate || null,
      dueOdometer: km,
      everyMonths: months,
      everyKm: kmStep,
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <SelectField label="Type" value={type} onChange={(e) => changeType(e.target.value as ReminderType)}>
        {Object.entries(REMINDER_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </SelectField>
      <TextField label="Libellé" value={label} onChange={(e) => setLabel(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Date limite" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <TextField label="Kilométrage limite" inputMode="numeric" value={dueKm} onChange={(e) => setDueKm(e.target.value)} />
        <TextField label="Répéter tous les (mois)" inputMode="numeric" value={everyMonths} onChange={(e) => setEveryMonths(e.target.value)} />
        <TextField label="Répéter tous les (km)" inputMode="numeric" value={everyKm} onChange={(e) => setEveryKm(e.target.value)} />
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Button type="submit" disabled={submitting}>Enregistrer</Button>
    </form>
  )
}
