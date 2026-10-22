import { useState } from 'react'
import { Button, ErrorMessage } from '@/components/ui'
import { ACCEPT_ATTR, FileRejectedError } from '@/lib/upload'

type State =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'done' }
  | { status: 'rejected'; message: string }
  | { status: 'failed'; file: File }

interface Props {
  upload(file: File): Promise<void>
  doneLabel?: string
  /** Hides the generic file chooser (e.g. for a photo). */
  imagesOnly?: boolean
}

const PICK = 'flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-blue-800 ring-1 ring-slate-300 hover:bg-blue-50'

/** Picks a photo or file and uploads it right away, with a retry on network failure. */
export function DocumentPicker({ upload, doneLabel = 'Facture ajoutée', imagesOnly = false }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' })

  async function send(file: File) {
    setState({ status: 'uploading' })
    try {
      await upload(file)
      setState({ status: 'done' })
    } catch (e) {
      setState(e instanceof FileRejectedError ? { status: 'rejected', message: e.message } : { status: 'failed', file })
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) send(file)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <label className={PICK}>
          <span aria-hidden>📷</span> Prendre une photo
          <input type="file" aria-label="Prendre une photo" accept="image/*" capture="environment" className="sr-only" onChange={onChange} disabled={state.status === 'uploading'} />
        </label>
        <label className={PICK}>
          <span aria-hidden>📎</span> Choisir un fichier
          <input type="file" aria-label="Choisir un fichier" accept={imagesOnly ? 'image/*' : ACCEPT_ATTR} className="sr-only" onChange={onChange} disabled={state.status === 'uploading'} />
        </label>
      </div>
      {state.status === 'uploading' && <p className="text-sm text-slate-600">Envoi en cours…</p>}
      {state.status === 'done' && <p className="text-sm text-green-700">{doneLabel}</p>}
      {state.status === 'rejected' && <ErrorMessage>{state.message}</ErrorMessage>}
      {state.status === 'failed' && (
        <div className="flex items-center gap-2">
          <div className="flex-1"><ErrorMessage>L’envoi de la facture a échoué</ErrorMessage></div>
          <Button variant="secondary" onClick={() => send(state.file)}>Réessayer</Button>
        </div>
      )}
    </div>
  )
}
