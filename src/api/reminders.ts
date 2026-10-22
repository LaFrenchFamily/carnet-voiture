import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { nextReminder, type NewReminder } from '@/domain/reminders'
import type { Reminder } from '@/domain/types'
import { supabase } from '@/lib/supabase'
import { fromReminder, toReminder } from './mappers'
import { unwrap } from './unwrap'

/** The reminders of one vehicle, or of all the user's vehicles when vehicleId is omitted. */
export function useReminders(vehicleId?: string) {
  return useQuery({
    queryKey: ['reminders', vehicleId ?? 'all'],
    queryFn: async (): Promise<Reminder[]> => {
      let query = supabase.from('reminders').select('*')
      if (vehicleId) query = query.eq('vehicle_id', vehicleId)
      const rows = unwrap(await query.order('due_date', { ascending: true, nullsFirst: false }))
      return rows.map(toReminder)
    },
  })
}

function useInvalidateReminders() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['reminders'] })
}

export function useSaveReminder() {
  const onSuccess = useInvalidateReminders()
  return useMutation({
    mutationFn: async ({ id, ...input }: NewReminder & { id?: string }) => {
      const row = fromReminder({ ...input, doneAt: null, doneEntryId: null })
      if (id) {
        delete row.done_at
        delete row.done_entry_id
      }
      unwrap(await (id ? supabase.from('reminders').update(row).eq('id', id) : supabase.from('reminders').insert(row)))
    },
    onSuccess,
  })
}

export function useDeleteReminder() {
  const onSuccess = useInvalidateReminders()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('reminders').delete().eq('id', id))
    },
    onSuccess,
  })
}

/** Marks a reminder as done and, when it repeats, creates the next one. */
export async function completeReminder(r: Reminder, doneDate: string, doneKm: number | null, entryId: string | null) {
  unwrap(await supabase.from('reminders').update({ done_at: doneDate, done_entry_id: entryId }).eq('id', r.id))
  const next = nextReminder(r, doneDate, doneKm)
  if (next) unwrap(await supabase.from('reminders').insert(fromReminder(next as Omit<Reminder, 'id'>)))
}

export function useCompleteReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { reminder: Reminder; doneDate: string; doneKm: number | null; entryId: string | null }) =>
      completeReminder(args.reminder, args.doneDate, args.doneKm, args.entryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  })
}
