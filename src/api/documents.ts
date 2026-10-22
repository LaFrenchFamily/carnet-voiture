import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DocumentFile } from '@/domain/types'
import { todayLocal } from '@/domain/format'
import { useUserId } from '@/features/auth/AuthProvider'
import { signedUrl } from '@/lib/storage'
import { BUCKET, supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/upload'
import { fromDocument, toDocument } from './mappers'
import { unwrap } from './unwrap'

export function useDocuments(vehicleId: string) {
  return useQuery({
    queryKey: ['documents', vehicleId],
    queryFn: async (): Promise<DocumentFile[]> => {
      const rows = unwrap(
        await supabase.from('documents').select('*').eq('vehicle_id', vehicleId).order('created_at', { ascending: false }),
      )
      return rows.map(toDocument)
    },
  })
}

/** A short-lived URL to display or download a private file. */
export function useSignedUrl(path: string | null) {
  return useQuery({
    queryKey: ['signed-url', path],
    queryFn: () => signedUrl(path!),
    enabled: path !== null,
    staleTime: 240_000,
  })
}

export function useAddDocument() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ vehicleId, entryId, file }: { vehicleId: string; entryId: string | null; file: File }) => {
      const uploaded = await uploadFile(userId, vehicleId, file)
      const row = fromDocument({
        vehicleId, entryId, ...uploaded, fileName: file.name, title: null, docDate: todayLocal(),
      })
      const { error } = await supabase.from('documents').insert(row)
      if (error) {
        await supabase.storage.from(BUCKET).remove([uploaded.storagePath])
        throw new Error('L’envoi de la facture a échoué')
      }
    },
    onSuccess: (_, { vehicleId }) => qc.invalidateQueries({ queryKey: ['documents', vehicleId] }),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (doc: DocumentFile) => {
      const { error } = await supabase.storage.from(BUCKET).remove([doc.storagePath])
      if (error) throw new Error(error.message)
      unwrap(await supabase.from('documents').delete().eq('id', doc.id))
    },
    onSuccess: (_, doc) => qc.invalidateQueries({ queryKey: ['documents', doc.vehicleId] }),
  })
}
