import { useSignedUrl } from '@/api/documents'
import type { Vehicle } from '@/domain/types'
import { formatKm } from '@/domain/format'

export function VehicleHeader({ vehicle, km }: { vehicle: Vehicle; km?: number }) {
  const details = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')
  const { data: photo } = useSignedUrl(vehicle.photoPath)
  return (
    <div className="flex items-center gap-3">
      <VehiclePhoto url={photo} />
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

export function VehiclePhoto({ url, size = 'h-14 w-14' }: { url?: string; size?: string }) {
  return url ? (
    <img src={url} alt="" className={`${size} shrink-0 rounded-xl object-cover`} />
  ) : (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-blue-100 text-2xl`} aria-hidden>🚗</div>
  )
}
