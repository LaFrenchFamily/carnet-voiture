import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-blue-800 text-white hover:bg-blue-900 disabled:bg-blue-300',
  secondary: 'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'text-blue-800 hover:bg-blue-50',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

interface FieldProps {
  label: string
  error?: string | null
  hint?: ReactNode
}

function FieldShell({ id, label, error, hint, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-amber-700">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

const INPUT = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200'

export function TextField({ label, error, hint, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input id={id} className={INPUT} aria-invalid={Boolean(error)} {...props} />
    </FieldShell>
  )
}

export function SelectField({ label, error, children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error}>
      <select id={id} className={INPUT} {...props}>{children}</select>
    </FieldShell>
  )
}

export function TextArea({ label, error, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} error={error}>
      <textarea id={id} rows={3} className={INPUT} {...props} />
    </FieldShell>
  )
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</div>
}

export function Spinner() {
  return <p className="py-8 text-center text-sm text-slate-500">Chargement…</p>
}
