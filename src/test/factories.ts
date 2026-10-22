import type { Entry, Reminder, Vehicle } from '@/domain/types'

let seq = 0
const id = () => `id-${++seq}`

export function makeVehicle(over: Partial<Vehicle> = {}): Vehicle {
  return {
    id: id(), nickname: 'Clio', make: 'Renault', model: 'Clio', year: 2018, plate: 'AB-123-CD',
    fuelType: 'petrol', initialOdometer: 40000, photoPath: null, archivedAt: null, ...over,
  }
}

export function makeEntry(over: Partial<Entry> = {}): Entry {
  return {
    id: id(), vehicleId: 'v1', kind: 'maintenance', date: '2026-01-01', odometer: null, title: 'Entrée',
    category: null, garage: null, amountCents: null, liters: null, fullTank: null, notes: null, ...over,
  }
}

export function fuel(date: string, odometer: number | null, liters: number, fullTank: boolean): Entry {
  return makeEntry({ kind: 'fuel', title: 'Plein', date, odometer, liters, fullTank })
}

export function makeReminder(over: Partial<Reminder> = {}): Reminder {
  return {
    id: id(), vehicleId: 'v1', type: 'custom', label: 'Échéance', dueDate: null, dueOdometer: null,
    everyMonths: null, everyKm: null, doneAt: null, doneEntryId: null, ...over,
  }
}
