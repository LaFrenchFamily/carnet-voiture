import { useState } from 'react'
import { Button, Card, ErrorMessage, TextField } from '@/components/ui'
import { removeFolder } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

export function AccountPage() {
  const { user, signOut } = useAuth()
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function deleteAccount() {
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      await removeFolder(user.id)
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw error
      await signOut()
    } catch {
      setError('La suppression a échoué. Réessayez.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Mon compte</h1>
      <Card className="flex flex-col gap-3">
        <div>
          <p className="text-sm text-slate-600">Connecté avec</p>
          <p className="font-medium">{user?.email}</p>
        </div>
        <Button variant="secondary" onClick={() => signOut()}>Se déconnecter</Button>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Supprimer mon compte</h2>
        <p className="text-sm text-slate-600">Toutes vos voitures, entrées, échéances et factures seront définitivement effacées.</p>
        {!deleting ? (
          <Button variant="danger" onClick={() => setDeleting(true)}>Supprimer mon compte</Button>
        ) : (
          <>
            <TextField label="Tapez SUPPRIMER pour confirmer" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
            <Button variant="danger" disabled={confirmText !== 'SUPPRIMER' || busy} onClick={deleteAccount}>Supprimer définitivement</Button>
            <Button variant="secondary" onClick={() => { setDeleting(false); setConfirmText('') }}>Annuler</Button>
          </>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Card>
    </div>
  )
}
