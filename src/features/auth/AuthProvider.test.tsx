import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { AuthProvider } from './AuthProvider'

const auth = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: unknown) => void),
}))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'a' } } } }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        auth.listener = cb
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
    },
  },
}))

test('cached data of the previous user is cleared when the user changes', async () => {
  const qc = new QueryClient()
  render(<QueryClientProvider client={qc}><AuthProvider><p>app</p></AuthProvider></QueryClientProvider>)
  await act(async () => auth.listener!('SIGNED_IN', { user: { id: 'a' } }))
  qc.setQueryData(['vehicles'], [{ id: 'car-of-a' }])
  await act(async () => auth.listener!('SIGNED_OUT', null))
  expect(qc.getQueryData(['vehicles'])).toBeUndefined()
})

test('a token refresh for the same user keeps the cache', async () => {
  const qc = new QueryClient()
  render(<QueryClientProvider client={qc}><AuthProvider><p>app</p></AuthProvider></QueryClientProvider>)
  await act(async () => auth.listener!('SIGNED_IN', { user: { id: 'a' } }))
  qc.setQueryData(['vehicles'], [{ id: 'car-of-a' }])
  await act(async () => auth.listener!('TOKEN_REFRESHED', { user: { id: 'a' } }))
  expect(qc.getQueryData(['vehicles'])).toEqual([{ id: 'car-of-a' }])
})
