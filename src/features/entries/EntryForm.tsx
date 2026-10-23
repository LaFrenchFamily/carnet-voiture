import { useState, type FormEvent, type ReactNode } from 'react'
import { Button, SelectField, TextArea, TextField } from '@/components/ui'
import { CATEGORIES, type Category } from '@/domain/categories'
import { addMonthsIso, formatKm, parseDecimalFr, parseEurosToCents, todayLocal } from '@/domain/format'
import { currentOdometer } from '@/domain/odometer'
import type { InvoiceGuess } from '@/domain/invoice/parseInvoice'
import type { Entry, EntryKind, Vehicle } from '@/domain/types'

export type EntryInput = Omit<Entry, 'id' | 'vehicleId'>

interface Props {
  vehicle: Vehicle
  entries: Entry[]
  kind: EntryKind
  initial?: Entry
  /** Values read from an invoice, for a new entry: shown flagged « À vérifier » until edited. */
  prefill?: InvoiceGuess
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

type GuessedField = 'date' | 'km' | 'amount' | 'garage' | 'category' | 'liters'

const toFrenchDecimal = (n: number) => n.toString().replace('.', ',')

export function EntryForm({ vehicle, entries, kind, initial, prefill, onSubmit, submitting, children }: Props) {
  const lastKm = currentOdometer(vehicle, entries.filter((e) => e.id !== initial?.id))
  const hasCategory = kind === 'maintenance' || kind === 'repair'
  const p = initial ? undefined : prefill
  const [guessed, setGuessed] = useState<Set<GuessedField>>(() => {
    if (!p) return new Set()
    const shown: [GuessedField, unknown][] = [['date', p.date], ['km', p.odometer], ['amount', p.amountCents]]
    if (hasCategory) shown.push(['garage', p.garage], ['category', p.category])
    if (kind === 'fuel') shown.push(['liters', p.liters])
    return new Set(shown.filter(([, v]) => v != null).map(([k]) => k))
  })
  const check = (field: GuessedField) => (guessed.has(field) ? 'À vérifier' : null)
  const edited = (field: GuessedField) => guessed.has(field) && setGuessed((s) => new Set([...s].filter((f) => f !== field)))

  const [date, setDate] = useState(initial?.date ?? p?.date ?? todayLocal())
  const [km, setKm] = useState(initial ? (initial.odometer?.toString() ?? '') : (p?.odometer ?? lastKm).toString())
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<Category>((initial?.category as Category) ?? p?.category ?? (kind === 'maintenance' ? 'oil' : 'other'))
  const [garage, setGarage] = useState(initial?.garage ?? p?.garage ?? '')
  const initialCents = initial ? initial.amountCents : p?.amountCents
  const [amount, setAmount] = useState(initialCents != null ? toFrenchDecimal(initialCents / 100) : '')
  const initialLiters = initial ? initial.liters : p?.liters
  const [liters, setLiters] = useState(initialLiters != null ? toFrenchDecimal(initialLiters) : '')
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
        <TextField label="Date" type="date" value={date} onChange={(e) => { setDate(e.target.value); edited('date') }} error={errors.date} hint={check('date')} />
        <TextField label="Kilométrage" inputMode="numeric" value={km} onChange={(e) => { setKm(e.target.value); edited('km') }} error={errors.km} hint={kmWarning ?? check('km')} />
      </div>
      {kind === 'fuel' && (
        <>
          <TextField label="Litres" inputMode="decimal" value={liters} onChange={(e) => { setLiters(e.target.value); edited('liters') }} error={errors.liters} hint={check('liters')} />
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} />
            Plein complet
          </label>
        </>
      )}
      {hasCategory && (
        <SelectField label="Catégorie" value={category} onChange={(e) => { setCategory(e.target.value as Category); edited('category') }} hint={check('category')}>
          {Object.entries(CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </SelectField>
      )}
      <TextField label="Montant (€)" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); edited('amount') }} error={errors.amount} hint={check('amount')} />
      {hasCategory && <TextField label="Garage" value={garage} onChange={(e) => { setGarage(e.target.value); edited('garage') }} hint={check('garage')} />}
      <TextField label="Libellé" placeholder="Facultatif" value={title} onChange={(e) => setTitle(e.target.value)} />
      <TextArea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {children}
      <Button type="submit" disabled={submitting}>Enregistrer</Button>
    </form>
  )
}
