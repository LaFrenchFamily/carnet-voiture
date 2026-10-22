import { useNavigate } from 'react-router'
import { useSaveVehicle } from '@/api/vehicles'
import { Card, ErrorMessage } from '@/components/ui'
import { VehicleForm } from './VehicleForm'

export function NewVehiclePage() {
  const save = useSaveVehicle()
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nouvelle voiture</h1>
      <Card>
        <VehicleForm
          submitLabel="Ajouter la voiture"
          submitting={save.isPending}
          onSubmit={(values) => save.mutate(values, { onSuccess: (v) => navigate(`/voitures/${v.id}/journal`, { replace: true }) })}
        />
        {save.error && <div className="mt-3"><ErrorMessage>Impossible d’enregistrer la voiture. Réessayez.</ErrorMessage></div>}
      </Card>
    </div>
  )
}
