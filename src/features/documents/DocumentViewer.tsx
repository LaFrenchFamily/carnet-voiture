import { useDeleteDocument, useSignedUrl } from '@/api/documents'
import { Button, ErrorMessage } from '@/components/ui'
import type { DocumentFile } from '@/domain/types'
import { signedUrl } from '@/lib/storage'

export function DocumentViewer({ doc, onClose }: { doc: DocumentFile; onClose(): void }) {
  const { data: url } = useSignedUrl(doc.storagePath)
  const remove = useDeleteDocument()
  const isImage = doc.mimeType.startsWith('image/') && doc.mimeType !== 'image/heic'

  async function download() {
    window.location.href = await signedUrl(doc.storagePath, doc.fileName)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={doc.fileName} className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
      <div className="flex items-center justify-between gap-2 text-white">
        <p className="truncate text-sm">{doc.fileName}</p>
        <Button variant="secondary" onClick={onClose}>Fermer</Button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto py-4">
        {isImage && url && <img src={url} alt={doc.fileName} className="max-h-full max-w-full object-contain" />}
        {!isImage && url && (
          <a href={url} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-4 py-3 font-medium text-blue-800">
            Ouvrir le document
          </a>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={download}>Télécharger</Button>
        <Button
          variant="danger"
          className="flex-1"
          disabled={remove.isPending}
          onClick={() => window.confirm('Supprimer définitivement cette facture ?') && remove.mutate(doc, { onSuccess: onClose })}
        >
          Supprimer
        </Button>
      </div>
      {remove.error && <div className="mt-2"><ErrorMessage>La suppression a échoué. Réessayez.</ErrorMessage></div>}
    </div>
  )
}
