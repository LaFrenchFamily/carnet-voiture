import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Vehicle } from '@/domain/types'

const ACTIONS = [
  ['⛽', 'Plein', 'entrees/nouvelle?type=fuel'],
  ['🔧', 'Entretien', 'entrees/nouvelle?type=maintenance'],
  ['📎', 'Facture', 'factures'],
  ['⏰', 'Échéance', 'echeances'],
] as const

/** Floating "+" button: pick an action, then a vehicle when there are several. */
export function QuickAddButton({ vehicles }: { vehicles: Vehicle[] }) {
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<string | null>(null)
  const navigate = useNavigate()
  if (vehicles.length === 0) return null

  function choose(path: string) {
    if (vehicles.length === 1) navigate(`/voitures/${vehicles[0].id}/${path}`)
    else setAction(path)
  }

  const close = () => { setOpen(false); setAction(null) }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/30" onClick={close}>
          <div className="absolute bottom-24 right-4 flex w-60 flex-col gap-1 rounded-xl bg-white p-2 shadow-lg" onClick={(e) => e.stopPropagation()}>
            {action === null
              ? ACTIONS.map(([icon, label, path]) => (
                  <button key={label} type="button" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left hover:bg-slate-100" onClick={() => choose(path)}>
                    <span aria-hidden>{icon}</span>{label}
                  </button>
                ))
              : (
                <>
                  <p className="px-3 py-1 text-xs font-medium text-slate-500">Pour quelle voiture ?</p>
                  {vehicles.map((v) => (
                    <button key={v.id} type="button" className="min-h-11 rounded-lg px-3 text-left hover:bg-slate-100" onClick={() => navigate(`/voitures/${v.id}/${action}`)}>
                      {v.nickname}
                    </button>
                  ))}
                </>
              )}
          </div>
        </div>
      )}
      <button
        type="button"
        aria-label={open ? 'Fermer' : 'Ajouter'}
        onClick={() => (open ? close() : setOpen(true))}
        className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-800 text-3xl text-white shadow-lg hover:bg-blue-900"
      >
        {open ? '×' : '+'}
      </button>
    </>
  )
}
