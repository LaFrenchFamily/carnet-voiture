import { useAddDocument, useDocuments } from '@/api/documents'
import { Card, ErrorMessage, Spinner } from '@/components/ui'
import { useCurrentVehicle } from '@/features/vehicles/VehiclePage'
import { DocumentGrid } from './DocumentGrid'
import { DocumentPicker } from './DocumentPicker'

export function DocumentsTab() {
  const vehicle = useCurrentVehicle()
  const { data: docs, isLoading, error } = useDocuments(vehicle.id)
  const add = useAddDocument()

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <h2 className="mb-2 font-semibold">Ajouter une facture</h2>
        <DocumentPicker upload={(file) => add.mutateAsync({ vehicleId: vehicle.id, entryId: null, file })} />
      </Card>
      {isLoading && <Spinner />}
      {error && <ErrorMessage>Impossible de charger les factures.</ErrorMessage>}
      {docs && docs.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Aucune facture pour l’instant.</p>}
      {docs && docs.length > 0 && <DocumentGrid docs={docs} />}
    </div>
  )
}
