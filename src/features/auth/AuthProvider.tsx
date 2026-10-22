import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()
  const userId = useRef<string | null>(null)

  useEffect(() => {
    // Query keys are not scoped by user: drop the cache whenever the user changes,
    // so the next person on a shared phone never sees the previous one's data.
    function apply(next: Session | null) {
      const nextId = next?.user.id ?? null
      if (nextId !== userId.current) queryClient.clear()
      userId.current = nextId
      setSession(next)
    }
    supabase.auth.getSession().then(({ data }) => {
      apply(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => apply(next))
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    loading,
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** The signed-in user's id; only call below <RequireAuth>. */
export function useUserId(): string {
  const { user } = useAuth()
  if (!user) throw new Error('No signed-in user')
  return user.id
}
