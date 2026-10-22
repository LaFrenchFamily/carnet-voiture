import { Link } from 'react-router'
import { useVehicles } from '@/api/vehicles'
import { Card, Spinner } from '@/components/ui'

export function ArchivedVehiclesPage() {
  const { data: vehicles, isLoading } = useVehicles({ includeArchived: true })
  if (isLoading || !vehicles) return <Spinner />
  const archived = vehicles.filter((v) => v.archivedAt)
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Voitures archivées</h1>
      {archived.length === 0 && <p className="text-sm text-slate-500">Aucune voiture archivée.</p>}
      {archived.map((v) => (
        <Link key={v.id} to={`/voitures/${v.id}/journal`}>
          <Card className="hover:ring-blue-300"><p className="font-medium">{v.nickname}</p><p className="text-sm text-slate-600">{v.plate}</p></Card>
        </Link>
      ))}
    </div>
  )
}
