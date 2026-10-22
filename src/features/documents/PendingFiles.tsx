import { ACCEPT_ATTR } from '@/lib/upload'

/** Files chosen while creating an entry; they are uploaded once the entry is saved. */
export function PendingFiles({ files, onChange }: { files: File[]; onChange(files: File[]): void }) {
  function add(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    onChange([...files, ...picked])
  }
  const pick = 'flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-blue-800 ring-1 ring-slate-300 hover:bg-blue-50'
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-slate-700">Joindre une facture</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className={pick}>
          <span aria-hidden>📷</span> Photo
          <input type="file" aria-label="Prendre une photo" accept="image/*" capture="environment" className="sr-only" onChange={add} />
        </label>
        <label className={pick}>
          <span aria-hidden>📎</span> Fichier
          <input type="file" aria-label="Choisir un fichier" accept={ACCEPT_ATTR} multiple className="sr-only" onChange={add} />
        </label>
      </div>
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded bg-slate-100 px-2 py-1 text-sm">
              <span className="truncate">{f.name}</span>
              <button type="button" className="text-red-700" aria-label={`Retirer ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}
