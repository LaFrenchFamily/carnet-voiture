export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'other'
export type EntryKind = 'maintenance' | 'repair' | 'fuel' | 'other'
export type ReminderType = 'ct' | 'insurance' | 'oil' | 'tires' | 'timing_belt' | 'custom'

export interface Vehicle {
  id: string
  nickname: string
  make: string | null
  model: string | null
  year: number | null
  plate: string | null
  fuelType: FuelType
  initialOdometer: number
  photoPath: string | null
  archivedAt: string | null
}

export interface Entry {
  id: string
  vehicleId: string
  kind: EntryKind
  /** Calendar date, YYYY-MM-DD. */
  date: string
  odometer: number | null
  title: string
  category: string | null
  garage: string | null
  amountCents: number | null
  liters: number | null
  fullTank: boolean | null
  notes: string | null
}

export interface Reminder {
  id: string
  vehicleId: string
  type: ReminderType
  label: string
  dueDate: string | null
  dueOdometer: number | null
  everyMonths: number | null
  everyKm: number | null
  doneAt: string | null
  doneEntryId: string | null
}

export interface DocumentFile {
  id: string
  vehicleId: string
  entryId: string | null
  storagePath: string
  fileName: string
  mimeType: string
  sizeBytes: number
  title: string | null
  docDate: string | null
}

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  petrol: 'Essence',
  diesel: 'Diesel',
  hybrid: 'Hybride',
  electric: 'Électrique',
  lpg: 'GPL',
  other: 'Autre',
}
