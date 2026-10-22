import { useSignedUrl } from '@/api/documents'
import type { DocumentFile } from '@/domain/types'

export function DocumentThumb({ doc, onOpen }: { doc: DocumentFile; onOpen(): void }) {
  const isImage = doc.mimeType.startsWith('image/') && doc.mimeType !== 'image/heic'
  const { data: url } = useSignedUrl(isImage ? doc.storagePath : null)
  return (
    <button type="button" onClick={onOpen} className="flex flex-col overflow-hidden rounded-lg bg-white text-left ring-1 ring-slate-200 hover:ring-blue-300">
      <div className="flex aspect-square items-center justify-center bg-slate-100">
        {isImage && url ? (
          <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-3xl" aria-hidden>{doc.mimeType === 'application/pdf' ? '📄' : '🖼️'}</span>
        )}
      </div>
      <span className="truncate px-2 py-1 text-xs text-slate-700">{doc.title ?? doc.fileName}</span>
    </button>
  )
}
