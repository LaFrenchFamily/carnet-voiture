import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Entry } from '@/domain/types'
import type { EntryInput } from '@/features/entries/EntryForm'
import { supabase } from '@/lib/supabase'
import { fromEntry, toEntry } from './mappers'
import { unwrap } from './unwrap'

export function useEntries(vehicleId: string) {
  return useQuery({
    queryKey: ['entries', vehicleId],
    queryFn: async (): Promise<Entry[]> => {
      const rows = unwrap(
        await supabase.from('entries').select('*').eq('vehicle_id', vehicleId)
          .order('date', { ascending: false }).order('created_at', { ascending: false }),
      )
      return rows.map(toEntry)
    },
  })
}

/** Odometer readings of all the user's vehicles, for the dashboard. */
export function useAllOdometers() {
  return useQuery({
    queryKey: ['entries', 'all-odometers'],
    queryFn: async (): Promise<{ vehicleId: string; odometer: number | null }[]> => {
      const rows = unwrap(await supabase.from('entries').select('vehicle_id, odometer').not('odometer', 'is', null))
      return rows.map((r) => ({ vehicleId: r.vehicle_id as string, odometer: r.odometer as number }))
    },
  })
}

function useInvalidateEntries() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['entries'] })
}

export function useSaveEntry() {
  const onSuccess = useInvalidateEntries()
  return useMutation({
    mutationFn: async ({ id, vehicleId, ...input }: EntryInput & { id?: string; vehicleId: string }): Promise<Entry> => {
      const row = fromEntry({ ...input, vehicleId })
      const query = id ? supabase.from('entries').update(row).eq('id', id) : supabase.from('entries').insert(row)
      return toEntry(unwrap(await query.select().single()))
    },
    onSuccess,
  })
}

export function useDeleteEntry() {
  const onSuccess = useInvalidateEntries()
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('entries').delete().eq('id', id))
    },
    onSuccess,
  })
}
