import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { LoginPage } from './LoginPage'

const auth = vi.hoisted(() => ({
  signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
  signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
  signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }))

function renderPage() {
  return render(<MemoryRouter><LoginPage /></MemoryRouter>)
}

test('offers magic link, Google and email + password', () => {
  renderPage()
  expect(screen.getByRole('button', { name: 'Recevoir un lien de connexion' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Continuer avec Google' })).toBeInTheDocument()
  expect(screen.getByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
})

test('Google sign-in redirects back to the app', async () => {
  renderPage()
  await userEvent.click(screen.getByRole('button', { name: 'Continuer avec Google' }))
  expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: window.location.origin } })
})

test('shows a French message on wrong credentials', async () => {
  auth.signInWithPassword.mockResolvedValueOnce({ error: { code: 'invalid_credentials', message: 'Invalid login credentials' } })
  renderPage()
  await userEvent.type(screen.getByLabelText('Email'), 'a@b.fr')
  await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret123')
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect')
})

test('confirms that the magic link was sent', async () => {
  renderPage()
  await userEvent.type(screen.getByLabelText('Email'), 'a@b.fr')
  await userEvent.click(screen.getByRole('button', { name: 'Recevoir un lien de connexion' }))
  expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'a@b.fr', options: { emailRedirectTo: window.location.origin } })
  expect(await screen.findByText(/Un lien de connexion a été envoyé à a@b.fr/)).toBeInTheDocument()
})
