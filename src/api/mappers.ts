import type { DocumentFile, Entry, Reminder, Vehicle } from '@/domain/types'

type Row = Record<string, unknown>
type WithOptionalId<T extends { id: string }> = Omit<T, 'id'> & { id?: string }

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())

/** Columns the database owns; never sent on insert/update and dropped when reading. */
const SERVER_COLUMNS = new Set(['user_id', 'created_at'])

function fromModel(model: object): Row {
  const row: Row = {}
  for (const [k, v] of Object.entries(model)) {
    if (k === 'id' && v === undefined) continue
    row[toSnake(k)] = v
  }
  return row
}

function toModel<T>(row: Row): T {
  const model: Row = {}
  for (const [k, v] of Object.entries(row)) {
    if (!SERVER_COLUMNS.has(k)) model[toCamel(k)] = v
  }
  return model as T
}

export const fromVehicle = (v: WithOptionalId<Vehicle>) => fromModel(v)
export const toVehicle = (row: Row) => toModel<Vehicle>(row)

export const fromEntry = (e: WithOptionalId<Entry>) => fromModel(e)
export function toEntry(row: Row): Entry {
  const e = toModel<Entry>(row)
  // Postgres `numeric` comes back as a string.
  return { ...e, liters: e.liters === null ? null : Number(e.liters) }
}

export const fromReminder = (r: WithOptionalId<Reminder>) => fromModel(r)
export const toReminder = (row: Row) => toModel<Reminder>(row)

export const fromDocument = (d: WithOptionalId<DocumentFile>) => fromModel(d)
export const toDocument = (row: Row) => toModel<DocumentFile>(row)
