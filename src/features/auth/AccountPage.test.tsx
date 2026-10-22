import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountPage } from './AccountPage'

const mocks = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue(undefined),
  rpc: vi.fn().mockResolvedValue({ error: null }),
  removeFolder: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'a@b.fr' }, signOut: mocks.signOut }),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: mocks.rpc } }))
vi.mock('@/lib/storage', () => ({ removeFolder: mocks.removeFolder }))

test('shows the email and signs out', async () => {
  render(<AccountPage />)
  expect(screen.getByText('a@b.fr')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))
  expect(mocks.signOut).toHaveBeenCalled()
})

test('account deletion requires typing SUPPRIMER, then removes files and data', async () => {
  const user = userEvent.setup()
  render(<AccountPage />)
  await user.click(screen.getByRole('button', { name: 'Supprimer mon compte' }))
  const confirm = screen.getByRole('button', { name: 'Supprimer définitivement' })
  expect(confirm).toBeDisabled()
  await user.type(screen.getByLabelText('Tapez SUPPRIMER pour confirmer'), 'SUPPRIMER')
  await user.click(confirm)
  expect(mocks.removeFolder).toHaveBeenCalledWith('u1')
  expect(mocks.rpc).toHaveBeenCalledWith('delete_my_account')
  expect(mocks.signOut).toHaveBeenCalled()
})
