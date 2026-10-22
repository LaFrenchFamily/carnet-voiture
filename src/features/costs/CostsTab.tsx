import { useState } from 'react'
import { useEntries } from '@/api/entries'
import { Card, ErrorMessage, SelectField, Spinner } from '@/components/ui'
import { averageConsumption } from '@/domain/consumption'
import { costsByKind, costsByMonth, ENTRY_KIND_LABELS } from '@/domain/costs'
import { formatEuros } from '@/domain/format'
import type { Entry, EntryKind, Vehicle } from '@/domain/types'
import { useCurrentVehicle } from '@/features/vehicles/VehiclePage'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const KINDS: EntryKind[] = ['maintenance', 'repair', 'fuel', 'other']
const lPer100 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function CostsView({ vehicle, entries }: { vehicle: Vehicle; entries: Entry[] }) {
  const years = [...new Set(entries.filter((e) => e.amountCents !== null).map((e) => Number(e.date.slice(0, 4))))].sort((a, b) => b - a)
  const [year, setYear] = useState<number | null>(years[0] ?? null)
  const yearEntries = entries.filter((e) => year !== null && e.date.startsWith(String(year)))
  const monthly = new Map(costsByMonth(yearEntries).map((m) => [m.month, m.totalCents]))
  const months = MONTHS.map((label, i) => ({ label, cents: monthly.get(`${year}-${String(i + 1).padStart(2, '0')}`) ?? 0 }))
  const max = Math.max(1, ...months.map((m) => m.cents))
  const byKind = costsByKind(yearEntries)
  const total = KINDS.reduce((s, k) => s + byKind[k], 0)
  const consumption = averageConsumption(entries)

  return (
    <div className="flex flex-col gap-3">
      {vehicle.fuelType !== 'electric' && (
        <Card>
          <h2 className="text-sm font-medium text-slate-600">Consommation moyenne</h2>
          {consumption === null ? (
            <p className="mt-1 text-sm text-slate-500">Pas assez de données (2 pleins complets avec kilométrage nécessaires)</p>
          ) : (
            <p className="mt-1 text-2xl font-semibold" data-testid="consumption">{lPer100.format(consumption)} L/100 km</p>
          )}
        </Card>
      )}

      {year === null ? (
        <p className="py-6 text-center text-sm text-slate-500">Aucune dépense enregistrée pour l’instant.</p>
      ) : (
        <Card className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-600">Total {year}</p>
              <p className="text-2xl font-semibold" data-testid="year-total">{formatEuros(total)}</p>
            </div>
            <div className="w-28">
              <SelectField label="Année" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </SelectField>
            </div>
          </div>

          <div className="flex h-32 items-end gap-1" aria-hidden>
            {months.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-1" title={`${m.label} : ${formatEuros(m.cents)}`}>
                <div className="w-full rounded-t bg-blue-700" style={{ height: `${(m.cents / max) * 100}px` }} />
                <span className="text-[10px] text-slate-500">{m.label[0].toUpperCase()}</span>
              </div>
            ))}
          </div>

          <ul aria-label="Dépenses par mois" className="flex flex-col gap-1 border-b border-slate-100 pb-3 text-sm">
            {months.filter((m) => m.cents > 0).map((m) => (
              <li key={m.label} className="flex justify-between">
                <span className="capitalize">{m.label}</span>
                <span className="font-medium">{formatEuros(m.cents)}</span>
              </li>
            ))}
          </ul>

          <ul aria-label="Répartition par type" className="flex flex-col gap-1 text-sm">
            {KINDS.map((k) => (
              <li key={k} className="flex justify-between">
                <span>{ENTRY_KIND_LABELS[k]}</span>
                <span className="font-medium">
                  {formatEuros(byKind[k])} · {total === 0 ? 0 : Math.round((byKind[k] / total) * 100)} %
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

export function CostsTab() {
  const vehicle = useCurrentVehicle()
  const { data: entries, isLoading, error } = useEntries(vehicle.id)
  if (isLoading) return <Spinner />
  if (error || !entries) return <ErrorMessage>Impossible de charger les dépenses.</ErrorMessage>
  return <CostsView vehicle={vehicle} entries={entries} />
}
