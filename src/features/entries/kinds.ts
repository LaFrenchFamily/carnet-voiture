import type { EntryKind } from '@/domain/types'

export const KIND_ICONS: Record<EntryKind, string> = { fuel: '⛽', maintenance: '🔧', repair: '🛠️', other: '💶' }

export const KIND_ADD_LABELS: Record<EntryKind, string> = {
  fuel: 'Plein',
  maintenance: 'Entretien',
  repair: 'Réparation',
  other: 'Dépense',
}

export const ENTRY_KINDS: EntryKind[] = ['fuel', 'maintenance', 'repair', 'other']

export function isEntryKind(value: string | null): value is EntryKind {
  return ENTRY_KINDS.includes(value as EntryKind)
}
