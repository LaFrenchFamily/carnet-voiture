import { useState, type FormEvent, type ReactNode } from 'react'
import { Button, SelectField, TextArea, TextField } from '@/components/ui'
import { CATEGORIES, type Category } from '@/domain/categories'
import { addMonthsIso, formatKm, parseDecimalFr, parseEurosToCents, todayLocal } from '@/domain/format'
import { currentOdometer } from '@/domain/odometer'
import type { Entry, EntryKind, Vehicle } from '@/domain/types'

export type EntryInput = Omit<Entry, 'id' | 'vehicleId'>

interface Props {
  vehicle: Vehicle
  entries: Entry[]
  kind: EntryKind
  initial?: Entry
  onSubmit(values: EntryInput): void
  submitting?: boolean
  children?: ReactNode
}

const DEFAULT_TITLES: Record<EntryKind, string> = {
  fuel: 'Plein',
  maintenance: 'Entretien',
  repair: 'Réparation',
  other: 'Dépense',
}

const blankToNull = (s: string) => (s.trim() === '' ? null : s.trim())

export function EntryForm({ vehicle, entries, kind, initial, onSubmit, submitting, children }: Props) {
  const lastKm = currentOdometer(vehicle, entries.filter((e) => e.id !== initial?.id))
  const hasCategory = kind === 'maintenance' || kind === 'repair'

  const [date, setDate] = useState(initial?.date ?? todayLocal())
  const [km, setKm] = useState(initial ? (initial.odometer?.toString() ?? '') : lastKm.toString())
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<Category>((initial?.category as Category) ?? (kind === 'maintenance' ? 'oil' : 'other'))
  const [garage, setGarage] = useState(initial?.garage ?? '')
  const [amount, setAmount] = useState(initial?.amountCents != null ? (initial.amountCents / 100).toString().replace('.', ',') : '')
  const [liters, setLiters] = useState(initial?.liters?.toString().replace('.', ',') ?? '')
  const [fullTank, setFullTank] = useState(initial?.fullTank ?? true)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const parsedKm = km.trim() === '' ? null : parseDecimalFr(km)
  const kmWarning =
    parsedKm !== null && parsedKm < lastKm ? `Kilométrage inférieur au dernier relevé (${formatKm(lastKm)})` : null

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!date) next.date = 'Indiquez une date'
    else if (date > addMonthsIso(todayLocal(), 12)) next.date = 'Date trop lointaine (un an maximum)'
    if (km.trim() !== '' && (parsedKm === null || !Number.isInteger(parsedKm) || parsedKm <= 0)) next.km = 'Kilométrage invalide'
    const amountCents = amount.trim() === '' ? null : parseEurosToCents(amount)
    if (amount.trim() !== '' && amountCents === null) next.amount = 'Montant invalide'
    const parsedLiters = liters.trim() === '' ? null : parseDecimalFr(liters)
    if (kind === 'fuel') {
      if (liters.trim() === '') next.liters = 'Indiquez le nombre de litres'
      else if (parsedLiters === null || parsedLiters <= 0) next.liters = 'Nombre de litres invalide'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const defaultTitle = kind === 'maintenance' ? CATEGORIES[category] : DEFAULT_TITLES[kind]
    onSubmit({
      kind,
      date,
      odometer: parsedKm,
      title: title.trim() || defaultTitle,
      category: hasCategory ? category : null,
      garage: hasCategory ? blankToNull(garage) : null,
      amountCents,
      liters: kind === 'fuel' ? parsedLiters : null,
      fullTank: kind === 'fuel' ? fullTank : null,
      notes: blankToNull(notes),
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <TextField label="Kilométrage" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} error={errors.km} hint={kmWarning} />
      </div>
      {kind === 'fuel' && (
        <>
          <TextField label="Litres" inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} error={errors.liters} />
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} />
            Plein complet
          </label>
        </>
      )}
      {hasCategory && (
        <SelectField label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </SelectField>
      )}
      <TextField label="Montant (€)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
      {hasCategory && <TextField label="Garage" value={garage} onChange={(e) => setGarage(e.target.value)} />}
      <TextField label="Libellé" placeholder="Facultatif" value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {children}
      <Button type="submit" disabled={submitting}>Enregistrer</Button>
    </form>
  )
}
