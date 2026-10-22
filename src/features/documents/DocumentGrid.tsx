import { useState } from 'react'
import type { DocumentFile } from '@/domain/types'
import { DocumentThumb } from './DocumentThumb'
import { DocumentViewer } from './DocumentViewer'

export function DocumentGrid({ docs }: { docs: DocumentFile[] }) {
  const [open, setOpen] = useState<DocumentFile | null>(null)
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {docs.map((d) => <DocumentThumb key={d.id} doc={d} onOpen={() => setOpen(d)} />)}
      </div>
      {open && <DocumentViewer doc={open} onClose={() => setOpen(null)} />}
    </>
  )
}
