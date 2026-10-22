import { makeEntry, makeReminder, makeVehicle } from '@/test/factories'
import type { DocumentFile } from '@/domain/types'
import { fromDocument, fromEntry, fromReminder, fromVehicle, toDocument, toEntry, toReminder, toVehicle } from './mappers'

test('vehicle round-trips through a database row', () => {
  const v = makeVehicle({ initialOdometer: 1234, photoPath: 'u/v/p.jpg' })
  const row = fromVehicle(v)
  expect(row).toMatchObject({ initial_odometer: 1234, fuel_type: 'petrol', photo_path: 'u/v/p.jpg' })
  expect(toVehicle({ ...row, id: v.id })).toEqual(v)
})

test('entry maps amount_cents and full_tank', () => {
  const e = makeEntry({ amountCents: 6210, fullTank: true, liters: 45.3 })
  const row = fromEntry(e)
  expect(row).toMatchObject({ amount_cents: 6210, full_tank: true, vehicle_id: 'v1' })
  expect(toEntry({ ...row, id: e.id })).toEqual(e)
})

test('entry liters come back as numbers even when Postgres returns numeric strings', () => {
  const row = { ...fromEntry(makeEntry({ kind: 'fuel', liters: 45.3 })), id: 'x', liters: '45.30' }
  expect(toEntry(row).liters).toBe(45.3)
})

test('reminder round-trips', () => {
  const r = makeReminder({ dueDate: '2027-01-01', everyMonths: 24, doneEntryId: 'e1' })
  const row = fromReminder(r)
  expect(row).toMatchObject({ due_date: '2027-01-01', every_months: 24, done_entry_id: 'e1' })
  expect(toReminder({ ...row, id: r.id })).toEqual(r)
})

test('document round-trips', () => {
  const d: DocumentFile = {
    id: 'd1', vehicleId: 'v1', entryId: null, storagePath: 'u/v/f.pdf', fileName: 'f.pdf',
    mimeType: 'application/pdf', sizeBytes: 10, title: null, docDate: '2026-10-01',
  }
  const row = fromDocument(d)
  expect(row).toMatchObject({ storage_path: 'u/v/f.pdf', size_bytes: 10, doc_date: '2026-10-01' })
  expect(toDocument({ ...row, id: d.id })).toEqual(d)
})

test('from* omits a missing id so Postgres generates it', () => {
  const { id: _id, ...rest } = makeVehicle()
  expect('id' in fromVehicle(rest)).toBe(false)
})
