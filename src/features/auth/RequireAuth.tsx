import { Navigate, Outlet } from 'react-router'
import { Spinner } from '@/components/ui'
import { useAuth } from './AuthProvider'

export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/connexion" replace />
  return <Outlet />
}

export function RedirectIfSignedIn({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Spinner />
  if (session) return <Navigate to="/" replace />
  return children
}
