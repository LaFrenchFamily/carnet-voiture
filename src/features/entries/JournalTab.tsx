import { useState } from 'react'
import { Link } from 'react-router'
import { useEntries } from '@/api/entries'
import { Card, ErrorMessage, Spinner } from '@/components/ui'
import { categoryLabel } from '@/domain/categories'
import { ENTRY_KIND_LABELS } from '@/domain/costs'
import { formatEuros, formatKm } from '@/domain/format'
import type { EntryKind } from '@/domain/types'
import { useCurrentVehicle } from '@/features/vehicles/VehiclePage'
import { ENTRY_KINDS, KIND_ADD_LABELS, KIND_ICONS } from './kinds'

export function JournalTab() {
  const vehicle = useCurrentVehicle()
  const { data: entries, isLoading, error } = useEntries(vehicle.id)
  const [filter, setFilter] = useState<EntryKind | null>(null)

  const shown = (entries ?? []).filter((e) => !filter || e.kind === filter)

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ENTRY_KINDS.map((k) => (
          <Link key={k} to={`../entrees/nouvelle?type=${k}`} className="rounded-lg bg-white px-3 py-2 text-center text-sm font-medium text-blue-800 ring-1 ring-slate-200 hover:bg-blue-50">
            + {KIND_ADD_LABELS[k]}
          </Link>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Filtrer par type">
        {[null, ...ENTRY_KINDS].map((k) => (
          <button
            key={k ?? 'all'}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${filter === k ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}
          >
            {k ? ENTRY_KIND_LABELS[k] : 'Tout'}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorMessage>Impossible de charger le journal.</ErrorMessage>}
      {entries && shown.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">Rien pour l’instant. Ajoutez un plein ou un entretien.</p>
      )}
      <ul className="flex flex-col gap-2">
        {shown.map((e) => (
          <li key={e.id}>
            <Link to={`../entrees/${e.id}`}>
              <Card className="flex items-center gap-3 hover:ring-blue-300">
                <span className="text-2xl" aria-hidden>{KIND_ICONS[e.kind]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[
                      new Date(`${e.date}T00:00`).toLocaleDateString('fr-FR'),
                      e.odometer !== null ? formatKm(e.odometer) : null,
                      e.kind === 'fuel' && e.liters !== null ? `${e.liters.toLocaleString('fr-FR')} L` : null,
                      e.kind !== 'fuel' ? categoryLabel(e.category) : null,
                      e.garage,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {e.amountCents !== null && <span className="whitespace-nowrap font-semibold">{formatEuros(e.amountCents)}</span>}
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
