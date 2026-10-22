import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useAddDocument, useDocuments } from '@/api/documents'
import { useDeleteEntry, useEntries, useSaveEntry } from '@/api/entries'
import { Button, Card, ErrorMessage, Spinner } from '@/components/ui'
import { DocumentGrid } from '@/features/documents/DocumentGrid'
import { DocumentPicker } from '@/features/documents/DocumentPicker'
import { PendingFiles } from '@/features/documents/PendingFiles'
import { useCurrentVehicle } from '@/features/vehicles/VehiclePage'
import { EntryForm, type EntryInput } from './EntryForm'
import { isEntryKind, KIND_ADD_LABELS } from './kinds'

export function EntryPage() {
  const vehicle = useCurrentVehicle()
  const { entryId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data: entries, isLoading } = useEntries(vehicle.id)
  const { data: docs } = useDocuments(vehicle.id)
  const save = useSaveEntry()
  const remove = useDeleteEntry()
  const addDocument = useAddDocument()
  const [pending, setPending] = useState<File[]>([])
  const [failed, setFailed] = useState<{ entryId: string; files: File[] } | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [uploading, setUploading] = useState(false)

  if (isLoading || !entries) return <Spinner />
  const initial = entryId ? entries.find((e) => e.id === entryId) : undefined
  if (entryId && !initial) return <p className="text-slate-600">Entrée introuvable.</p>
  const typeParam = params.get('type')
  const kind = initial?.kind ?? (isEntryKind(typeParam) ? typeParam : 'maintenance')
  const back = () => navigate(`/voitures/${vehicle.id}/journal`)

  /** Uploads files one by one and returns those that failed. */
  async function uploadAll(savedId: string, files: File[]): Promise<File[]> {
    const failures: File[] = []
    for (const file of files) {
      try {
        await addDocument.mutateAsync({ vehicleId: vehicle.id, entryId: savedId, file })
      } catch {
        failures.push(file)
      }
    }
    return failures
  }

  async function submit(values: EntryInput) {
    let entry
    try {
      entry = await save.mutateAsync({ ...values, id: initial?.id, vehicleId: vehicle.id })
    } catch {
      return // save.error is shown below the form
    }
    // Keep the form locked until navigation, or a second tap would create a duplicate entry.
    setUploading(true)
    const failures = await uploadAll(entry.id, pending)
    setUploading(false)
    if (failures.length === 0) back()
    else setFailed({ entryId: entry.id, files: failures })
  }

  async function retry() {
    if (!failed) return
    setRetrying(true)
    const failures = await uploadAll(failed.entryId, failed.files)
    setRetrying(false)
    if (failures.length === 0) back()
    else setFailed({ ...failed, files: failures })
  }

  if (failed) {
    const n = failed.files.length
    return (
      <Card className="flex flex-col gap-3">
        <ErrorMessage>{`Entrée enregistrée, mais l’envoi de ${n} facture${n > 1 ? 's' : ''} a échoué.`}</ErrorMessage>
        <ul className="text-sm text-slate-700">{failed.files.map((f, i) => <li key={i}>{f.name}</li>)}</ul>
        <Button onClick={retry} disabled={retrying}>Réessayer</Button>
        <Button variant="secondary" onClick={back}>Continuer sans les factures</Button>
      </Card>
    )
  }

  const entryDocs = initial ? (docs ?? []).filter((d) => d.entryId === initial.id) : []

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <h2 className="mb-3 font-semibold">{initial ? 'Modifier' : `Nouveau : ${KIND_ADD_LABELS[kind].toLowerCase()}`}</h2>
        <EntryForm key={initial?.id ?? kind} vehicle={vehicle} entries={entries} kind={kind} initial={initial} submitting={save.isPending || uploading} onSubmit={submit}>
          {!initial && <PendingFiles files={pending} onChange={setPending} />}
        </EntryForm>
        {uploading && <p className="mt-3 text-sm text-slate-600">Envoi des factures…</p>}
        {save.error && <div className="mt-3"><ErrorMessage>Impossible d’enregistrer. Réessayez.</ErrorMessage></div>}
      </Card>
      {initial && (
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Factures</h2>
          {entryDocs.length > 0 && <DocumentGrid docs={entryDocs} />}
          <DocumentPicker upload={(file) => addDocument.mutateAsync({ vehicleId: vehicle.id, entryId: initial.id, file })} />
          <Button
            variant="ghost"
            className="text-red-700"
            disabled={remove.isPending}
            onClick={() => window.confirm('Supprimer cette entrée ? Les factures liées sont conservées.') && remove.mutate(initial.id, { onSuccess: back })}
          >
            Supprimer cette entrée
          </Button>
        </Card>
      )}
    </div>
  )
}
