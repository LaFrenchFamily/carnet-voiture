import { useState, type FormEvent, type ReactNode } from 'react'
import { Button, SelectField, TextField } from '@/components/ui'
import { parseDecimalFr } from '@/domain/format'
import { FUEL_TYPE_LABELS, type FuelType, type Vehicle } from '@/domain/types'

export type VehicleInput = Omit<Vehicle, 'id' | 'photoPath' | 'archivedAt'>

interface Props {
  initial?: Vehicle
  onSubmit(values: VehicleInput): void
  submitLabel: string
  submitting?: boolean
  /** Extra fields rendered before the submit button (e.g. the photo picker). */
  children?: ReactNode
}

const blankToNull = (s: string) => (s.trim() === '' ? null : s.trim())

export function VehicleForm({ initial, onSubmit, submitLabel, submitting, children }: Props) {
  const [nickname, setNickname] = useState(initial?.nickname ?? '')
  const [make, setMake] = useState(initial?.make ?? '')
  const [model, setModel] = useState(initial?.model ?? '')
  const [year, setYear] = useState(initial?.year?.toString() ?? '')
  const [plate, setPlate] = useState(initial?.plate ?? '')
  const [fuelType, setFuelType] = useState<FuelType>(initial?.fuelType ?? 'petrol')
  const [km, setKm] = useState(initial?.initialOdometer.toString() ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!nickname.trim()) next.nickname = 'Le surnom est obligatoire'
    const odometer = km.trim() === '' ? 0 : parseDecimalFr(km)
    if (odometer === null || !Number.isInteger(odometer)) next.km = 'Kilométrage invalide'
    const parsedYear = year.trim() === '' ? null : Number(year)
    if (parsedYear !== null && !(Number.isInteger(parsedYear) && parsedYear >= 1886 && parsedYear <= 2100)) {
      next.year = 'Année invalide'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return
    onSubmit({
      nickname: nickname.trim(),
      make: blankToNull(make),
      model: blankToNull(model),
      year: parsedYear,
      plate: blankToNull(plate)?.toUpperCase() ?? null,
      fuelType,
      initialOdometer: odometer as number,
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <TextField label="Surnom" placeholder="ex. La Clio" value={nickname} onChange={(e) => setNickname(e.target.value)} error={errors.nickname} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Marque" value={make} onChange={(e) => setMake(e.target.value)} />
        <TextField label="Modèle" value={model} onChange={(e) => setModel(e.target.value)} />
        <TextField label="Année" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} error={errors.year} />
        <TextField label="Immatriculation" value={plate} onChange={(e) => setPlate(e.target.value)} />
      </div>
      <SelectField label="Énergie" value={fuelType} onChange={(e) => setFuelType(e.target.value as FuelType)}>
        {Object.entries(FUEL_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </SelectField>
      <TextField
        label={initial ? 'Kilométrage à l’ajout' : 'Kilométrage actuel'}
        inputMode="numeric"
        value={km}
        onChange={(e) => setKm(e.target.value)}
        error={errors.km}
      />
      {children}
      <Button type="submit" disabled={submitting}>{submitLabel}</Button>
    </form>
  )
}
