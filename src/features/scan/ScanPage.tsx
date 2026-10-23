import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button, Card, ErrorMessage } from '@/components/ui'
import { todayLocal } from '@/domain/format'
import { EMPTY_GUESS, parseInvoice, type InvoiceGuess } from '@/domain/invoice/parseInvoice'
import type { ScanState } from '@/features/entries/EntryPage'
import { OcrUnavailableError, readInvoice, type ReadProgress } from '@/lib/ocr/readInvoice'
import { ACCEPT_ATTR, rejectReason } from '@/lib/upload'

const TIMEOUT_MS = 45_000

type Phase =
  | { name: 'pick'; error: string | null }
  | { name: 'reading'; file: File; progress: ReadProgress | null }
  | { name: 'unavailable'; file: File }

const PICK = 'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-blue-800 ring-1 ring-slate-300 hover:bg-blue-50'

/** Reads an invoice on the device, then opens the new-entry form prefilled with what was found. */
export function ScanPage() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>({ name: 'pick', error: null })
  // Id of the reading in progress; bumping it makes a late result, timeout or error of that reading a no-op.
  const current = useRef(0)
  useEffect(() => () => { current.current++ }, [])

  function openForm(file: File, guess: InvoiceGuess) {
    current.current++
    const state: ScanState = { scan: { guess, file } }
    navigate(`/voitures/${vehicleId}/entrees/nouvelle?type=${guess.kind ?? 'maintenance'}`, { replace: true, state })
  }

  async function read(file: File) {
    const id = ++current.current
    const live = () => current.current === id
    setPhase({ name: 'reading', file, progress: null })
    const timer = setTimeout(() => live() && openForm(file, EMPTY_GUESS), TIMEOUT_MS)
    try {
      const text = await readInvoice(file, (progress) => live() && setPhase({ name: 'reading', file, progress }))
      if (live()) openForm(file, parseInvoice(text, todayLocal()))
    } catch (e) {
      if (!live()) return
      if (e instanceof OcrUnavailableError) {
        current.current++
        setPhase({ name: 'unavailable', file })
      } else {
        openForm(file, EMPTY_GUESS)
      }
    } finally {
      clearTimeout(timer)
    }
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reason = rejectReason(file)
    if (reason) setPhase({ name: 'pick', error: reason })
    else void read(file)
  }

  if (phase.name === 'unavailable') {
    return (
      <Card className="flex flex-col gap-3">
        <ErrorMessage>Lecture impossible pour l’instant</ErrorMessage>
        <p className="text-sm text-slate-600">Vous pouvez compléter le formulaire vous-même, la facture y est jointe.</p>
        <Button onClick={() => openForm(phase.file, EMPTY_GUESS)}>Continuer</Button>
      </Card>
    )
  }

  if (phase.name === 'reading') {
    const { progress } = phase
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Lecture de la facture…</h2>
        <progress className="w-full" max={1} value={progress?.ratio ?? undefined} aria-label="Avancement de la lecture" />
        {progress?.stage === 'download' && (
          <p className="text-sm text-slate-600">Première utilisation : téléchargement de l’outil de lecture (≈ 5 Mo)</p>
        )}
        <Button variant="secondary" onClick={() => openForm(phase.file, EMPTY_GUESS)}>Passer</Button>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Lire une facture</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className={PICK}>
          <span aria-hidden>📷</span> Photo
          <input type="file" aria-label="Prendre en photo" accept="image/*" capture="environment" className="sr-only" onChange={pick} />
        </label>
        <label className={PICK}>
          <span aria-hidden>📎</span> Fichier
          <input type="file" aria-label="Choisir un fichier" accept={ACCEPT_ATTR} className="sr-only" onChange={pick} />
        </label>
      </div>
      {phase.error && <ErrorMessage>{phase.error}</ErrorMessage>}
      <p className="text-sm text-slate-600">La lecture se fait dans votre téléphone. Vous vérifierez ensuite les champs remplis.</p>
    </Card>
  )
}
