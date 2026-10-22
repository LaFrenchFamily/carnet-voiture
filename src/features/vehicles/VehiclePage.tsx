import { NavLink, Outlet, useOutletContext, useParams } from 'react-router'
import { useEntries } from '@/api/entries'
import { useVehicle } from '@/api/vehicles'
import { currentOdometer } from '@/domain/odometer'
import { Spinner } from '@/components/ui'
import type { Vehicle } from '@/domain/types'
import { VehicleHeader } from './VehicleHeader'

const TABS = [
  ['journal', 'Journal'],
  ['echeances', 'Échéances'],
  ['factures', 'Factures'],
  ['couts', 'Coûts'],
  ['infos', 'Infos'],
] as const

export function VehiclePage() {
  const { vehicleId = '' } = useParams()
  const { data: vehicle, isLoading } = useVehicle(vehicleId)
  const { data: entries } = useEntries(vehicleId)
  if (isLoading) return <Spinner />
  if (!vehicle) return <p className="text-slate-600">Voiture introuvable.</p>

  return (
    <div className="flex flex-col gap-4">
      <VehicleHeader vehicle={vehicle} km={currentOdometer(vehicle, entries ?? [])} />
      <nav aria-label="Sections de la voiture" className="-mx-4 flex gap-1 overflow-x-auto px-4">
        {TABS.map(([path, label]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${isActive ? 'bg-blue-800 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet context={vehicle} />
    </div>
  )
}

/** The vehicle of the current /voitures/:vehicleId page, for tab components. */
export function useCurrentVehicle(): Vehicle {
  return useOutletContext<Vehicle>()
}
