import type { Entry, Vehicle } from './types'

export function currentOdometer(
  vehicle: Pick<Vehicle, 'initialOdometer'>,
  entries: Pick<Entry, 'odometer'>[],
): number {
  return entries.reduce((max, e) => (e.odometer !== null && e.odometer > max ? e.odometer : max), vehicle.initialOdometer)
}
