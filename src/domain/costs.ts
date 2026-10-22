import type { Entry, EntryKind } from './types'

export const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  maintenance: 'Entretien',
  repair: 'Réparation',
  fuel: 'Carburant',
  other: 'Autre dépense',
}

function sumBy(entries: Entry[], key: (e: Entry) => string): Map<string, number> {
  const totals = new Map<string, number>()
  for (const e of entries) {
    if (e.amountCents === null) continue
    const k = key(e)
    totals.set(k, (totals.get(k) ?? 0) + e.amountCents)
  }
  return totals
}

export function costsByMonth(entries: Entry[]): { month: string; totalCents: number }[] {
  return [...sumBy(entries, (e) => e.date.slice(0, 7))]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totalCents]) => ({ month, totalCents }))
}

export function costsByYear(entries: Entry[]): { year: number; totalCents: number }[] {
  return [...sumBy(entries, (e) => e.date.slice(0, 4))]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, totalCents]) => ({ year: Number(year), totalCents }))
}

export function costsByKind(entries: Entry[]): Record<EntryKind, number> {
  const totals: Record<EntryKind, number> = { maintenance: 0, repair: 0, fuel: 0, other: 0 }
  for (const [kind, cents] of sumBy(entries, (e) => e.kind)) totals[kind as EntryKind] = cents
  return totals
}
