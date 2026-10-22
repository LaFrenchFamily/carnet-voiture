import { render, screen } from '@testing-library/react'
import App from './App'

const auth = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string } },
}))
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: auth.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }), is: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }),
  },
}))

test('signed out, the login page is shown', async () => {
  auth.session = null
  render(<App />)
  expect(await screen.findByRole('button', { name: 'Continuer avec Google' })).toBeInTheDocument()
})

test('signed in, the app layout is shown', async () => {
  auth.session = { user: { id: 'u1', email: 'a@b.fr' } }
  render(<App />)
  expect(await screen.findByRole('navigation')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Carnet de Voiture' })).toBeInTheDocument()
})
