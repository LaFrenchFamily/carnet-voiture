import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useDeleteEntry, useEntries, useSaveEntry } from '@/api/entries'
import { Button, Card, ErrorMessage, Spinner } from '@/components/ui'
import type { Entry } from '@/domain/types'
import { useCurrentVehicle } from '@/features/vehicles/VehiclePage'
import { EntryForm, type EntryInput } from './EntryForm'
import { isEntryKind, KIND_ADD_LABELS } from './kinds'

export function EntryPage() {
  const vehicle = useCurrentVehicle()
  const { entryId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data: entries, isLoading } = useEntries(vehicle.id)
  const save = useSaveEntry()
  const remove = useDeleteEntry()

  if (isLoading || !entries) return <Spinner />
  const initial = entryId ? entries.find((e) => e.id === entryId) : undefined
  if (entryId && !initial) return <p className="text-slate-600">Entrée introuvable.</p>
  const typeParam = params.get('type')
  const kind = initial?.kind ?? (isEntryKind(typeParam) ? typeParam : 'maintenance')
  const back = () => navigate(`/voitures/${vehicle.id}/journal`)

  function submit(values: EntryInput, after?: (entry: Entry) => Promise<void>) {
    save.mutate(
      { ...values, id: initial?.id, vehicleId: vehicle.id },
      { onSuccess: async (entry) => { await after?.(entry); back() } },
    )
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{initial ? 'Modifier' : `Nouveau : ${KIND_ADD_LABELS[kind].toLowerCase()}`}</h2>
      <EntryForm key={initial?.id ?? kind} vehicle={vehicle} entries={entries} kind={kind} initial={initial} submitting={save.isPending} onSubmit={(v) => submit(v)} />
      {save.error && <div className="mt-3"><ErrorMessage>Impossible d’enregistrer. Réessayez.</ErrorMessage></div>}
      {initial && (
        <Button
          variant="ghost"
          className="mt-3 w-full text-red-700"
          disabled={remove.isPending}
          onClick={() => window.confirm('Supprimer cette entrée ? Les factures liées sont conservées.') && remove.mutate(initial.id, { onSuccess: back })}
        >
          Supprimer cette entrée
        </Button>
      )}
    </Card>
  )
}
