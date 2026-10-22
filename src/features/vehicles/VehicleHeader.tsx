import type { Vehicle } from '@/domain/types'
import { formatKm } from '@/domain/format'

export function VehicleHeader({ vehicle, km }: { vehicle: Vehicle; km?: number }) {
  const details = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-2xl" aria-hidden>🚗</div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold">{vehicle.nickname}</h1>
        <p className="truncate text-sm text-slate-600">
          {[details, vehicle.plate, formatKm(km ?? vehicle.initialOdometer)].filter(Boolean).join(' · ')}
        </p>
        {vehicle.archivedAt && <p className="text-xs font-medium text-amber-700">Archivée</p>}
      </div>
    </div>
  )
}
