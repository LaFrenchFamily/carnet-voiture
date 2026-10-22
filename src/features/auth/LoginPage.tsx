import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Button, Card, ErrorMessage, TextField } from '@/components/ui'
import { authErrorMessage } from './authErrors'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<{ error: { code?: string; message?: string } | null }>, success?: string) {
    setBusy(true)
    setError(null)
    setInfo(null)
    const { error } = await action()
    setBusy(false)
    if (error) setError(authErrorMessage(error))
    else if (success) setInfo(success)
  }

  const redirectTo = window.location.origin

  function signIn(e: FormEvent) {
    e.preventDefault()
    run(() => supabase.auth.signInWithPassword({ email, password }))
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-4">
      <div className="text-center">
        <img src="/icons/icon-192.png" alt="" className="mx-auto h-16 w-16" />
        <h1 className="mt-3 text-2xl font-semibold">Carnet de Voiture</h1>
        <p className="text-sm text-slate-600">Entretiens, pleins, factures et échéances de vos voitures.</p>
      </div>

      <Card>
        <form onSubmit={signIn} className="flex flex-col gap-3">
          <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Mot de passe" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {info && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{info}</p>}
          <Button type="submit" disabled={busy || !email || !password}>Se connecter</Button>
          <Button
            variant="secondary"
            disabled={busy || !email || !password}
            onClick={() => run(() => supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } }),
              'Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse.')}
          >
            Créer un compte
          </Button>
          <Button
            variant="ghost"
            disabled={busy || !email}
            onClick={() => run(() => supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } }),
              `Un lien de connexion a été envoyé à ${email}.`)}
          >
            Recevoir un lien de connexion
          </Button>
        </form>
      </Card>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-300" />ou<span className="h-px flex-1 bg-slate-300" />
      </div>
      <Button variant="secondary" disabled={busy} onClick={() => run(() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } }))}>
        Continuer avec Google
      </Button>
    </main>
  )
}
