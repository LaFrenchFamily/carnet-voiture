import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Vehicle } from '@/domain/types'
import { useUserId } from '@/features/auth/AuthProvider'
import { removeFolder } from '@/lib/storage'
import { BUCKET, supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/upload'
import type { VehicleInput } from '@/features/vehicles/VehicleForm'
import { fromVehicle, toVehicle } from './mappers'
import { unwrap } from './unwrap'

async function fetchVehicles(): Promise<Vehicle[]> {
  const rows = unwrap(await supabase.from('vehicles').select('*').order('created_at'))
  return rows.map(toVehicle)
}

export function useVehicles({ includeArchived = false }: { includeArchived?: boolean } = {}) {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles,
    select: (vehicles) => (includeArchived ? vehicles : vehicles.filter((v) => !v.archivedAt)),
  })
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles,
    select: (vehicles) => vehicles.find((v) => v.id === id) ?? null,
  })
}

function useInvalidateVehicles() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['vehicles'] })
}

export function useSaveVehicle() {
  const onSuccess = useInvalidateVehicles()
  return useMutation({
    mutationFn: async ({ id, ...input }: VehicleInput & { id?: string; photoPath?: string | null }): Promise<Vehicle> => {
      const row = fromVehicle(input as Omit<Vehicle, 'id'>)
      const query = id ? supabase.from('vehicles').update(row).eq('id', id) : supabase.from('vehicles').insert(row)
      return toVehicle(unwrap(await query.select().single()))
    },
    onSuccess,
  })
}

export function useArchiveVehicle() {
  const onSuccess = useInvalidateVehicles()
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      unwrap(await supabase.from('vehicles').update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', id))
    },
    onSuccess,
  })
}

export function useDeleteVehicle() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await removeFolder(`${userId}/${id}`)
      unwrap(await supabase.from('vehicles').delete().eq('id', id))
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useSetVehiclePhoto() {
  const userId = useUserId()
  const onSuccess = useInvalidateVehicles()
  return useMutation({
    mutationFn: async ({ vehicle, file }: { vehicle: Vehicle; file: File }) => {
      const { storagePath } = await uploadFile(userId, vehicle.id, file)
      unwrap(await supabase.from('vehicles').update({ photo_path: storagePath }).eq('id', vehicle.id))
      if (vehicle.photoPath) await supabase.storage.from(BUCKET).remove([vehicle.photoPath])
    },
    onSuccess,
  })
}
