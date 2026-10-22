import { Link } from 'react-router'
import { useSignedUrl } from '@/api/documents'
import { useAllOdometers } from '@/api/entries'
import { useReminders } from '@/api/reminders'
import { useVehicles } from '@/api/vehicles'
import { QuickAddButton } from '@/components/QuickAddButton'
import { Card, ErrorMessage, Spinner } from '@/components/ui'
import { formatKm, todayLocal } from '@/domain/format'
import { currentOdometer } from '@/domain/odometer'
import { describeDue } from '@/domain/reminders'
import type { Vehicle } from '@/domain/types'
import { ReminderBadge } from '@/features/reminders/ReminderBadge'
import { VehiclePhoto } from '@/features/vehicles/VehicleHeader'
import { dashboardReminders, groupOdometers } from './dashboardReminders'

function VehicleCard({ vehicle, km, urgent }: { vehicle: Vehicle; km: number; urgent: number }) {
  const { data: photo } = useSignedUrl(vehicle.photoPath)
  return (
    <Link to={`/voitures/${vehicle.id}/journal`}>
      <Card className="flex items-center gap-3 hover:ring-blue-300">
        <VehiclePhoto url={photo} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{vehicle.nickname}</p>
          {vehicle.plate && <p className="truncate text-sm text-slate-600">{vehicle.plate}</p>}
          <p className="text-sm font-medium text-slate-800">{formatKm(km)}</p>
        </div>
        {urgent > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
            {urgent} échéance{urgent > 1 ? 's' : ''}
          </span>
        )}
      </Card>
    </Link>
  )
}

export function DashboardPage() {
  const { data: vehicles, isLoading } = useVehicles()
  const { data: reminders, isLoading: remindersLoading, error: remindersError } = useReminders()
  const { data: odometerRows } = useAllOdometers()

  if (isLoading || !vehicles) return <Spinner />

  if (vehicles.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="text-5xl" aria-hidden>🚗</span>
        <h1 className="text-lg font-semibold">Ajoutez votre première voiture</h1>
        <p className="text-sm text-slate-600">Vous pourrez ensuite noter les pleins, les entretiens, les factures et les échéances.</p>
        <Link to="/voitures/nouvelle" className="rounded-lg bg-blue-800 px-4 py-2 font-medium text-white">Ajouter une voiture</Link>
      </Card>
    )
  }

  const odometers = groupOdometers(odometerRows ?? [])
  const today = todayLocal()
  const urgent = dashboardReminders(vehicles, reminders ?? [], odometers, today)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Échéances</h2>
        {remindersError ? (
          <ErrorMessage>Impossible de charger les échéances. Vérifiez votre connexion.</ErrorMessage>
        ) : remindersLoading || !reminders ? (
          <Spinner />
        ) : urgent.length === 0 ? (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">Rien d’urgent. Tout est à jour 👍</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {urgent.map(({ reminder, vehicle, status }) => (
              <li key={reminder.id}>
                <Link to={`/voitures/${vehicle.id}/echeances`}>
                  <Card className={`flex items-center justify-between gap-2 ${status === 'overdue' ? 'ring-red-200' : 'ring-orange-200'}`}>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{reminder.label} · {vehicle.nickname}</p>
                      <p className="text-sm text-slate-600">
                        {describeDue(reminder, currentOdometer(vehicle, odometers[vehicle.id] ?? []), today)}
                      </p>
                    </div>
                    <ReminderBadge status={status} />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mes voitures</h2>
          <Link to="/voitures/nouvelle" className="text-sm font-medium text-blue-800">+ Ajouter</Link>
        </div>
        <ul className="flex flex-col gap-2">
          {vehicles.map((v) => (
            <li key={v.id}>
              <VehicleCard
                vehicle={v}
                km={currentOdometer(v, odometers[v.id] ?? [])}
                urgent={urgent.filter((u) => u.vehicle.id === v.id).length}
              />
            </li>
          ))}
        </ul>
        <Link to="/voitures/archivees" className="text-center text-sm text-slate-500">Voitures archivées</Link>
      </section>

      <QuickAddButton vehicles={vehicles} />
    </div>
  )
}
