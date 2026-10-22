import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useArchiveVehicle, useDeleteVehicle, useSaveVehicle, useSetVehiclePhoto } from '@/api/vehicles'
import { DocumentPicker } from '@/features/documents/DocumentPicker'
import { Button, Card, ErrorMessage } from '@/components/ui'
import { useCurrentVehicle } from './VehiclePage'
import { VehicleForm } from './VehicleForm'

export function VehicleInfoTab() {
  const vehicle = useCurrentVehicle()
  const save = useSaveVehicle()
  const archive = useArchiveVehicle()
  const remove = useDeleteVehicle()
  const setPhoto = useSetVehiclePhoto()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)

  function confirmDelete() {
    const ok = window.confirm(
      `Supprimer « ${vehicle.nickname} » ? Tout son historique, ses échéances et ses factures seront définitivement effacés.`,
    )
    if (ok) remove.mutate(vehicle.id, { onSuccess: () => navigate('/', { replace: true }) })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 font-semibold">Modifier</h2>
        <VehicleForm
          key={vehicle.id}
          initial={vehicle}
          submitLabel="Enregistrer"
          submitting={save.isPending}
          onSubmit={(values) => save.mutate({ id: vehicle.id, ...values }, { onSuccess: () => setSaved(true) })}
        />
        {saved && !save.isPending && <p className="mt-2 text-sm text-green-700">Modifications enregistrées.</p>}
        {save.error && <div className="mt-2"><ErrorMessage>Impossible d’enregistrer. Réessayez.</ErrorMessage></div>}
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Photo de la voiture</h2>
        <DocumentPicker imagesOnly doneLabel="Photo mise à jour" upload={(file) => setPhoto.mutateAsync({ vehicle, file })} />
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Gérer</h2>
        <Button variant="secondary" disabled={archive.isPending} onClick={() => archive.mutate({ id: vehicle.id, archived: !vehicle.archivedAt })}>
          {vehicle.archivedAt ? 'Réactiver la voiture' : 'Archiver (vendue, plus utilisée…)'}
        </Button>
        <Button variant="danger" disabled={remove.isPending} onClick={confirmDelete}>Supprimer la voiture</Button>
        {remove.error && <ErrorMessage>La suppression a échoué. Réessayez.</ErrorMessage>}
      </Card>
    </div>
  )
}
