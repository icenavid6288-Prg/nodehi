import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { get, type AuthUser } from '../lib/api'

type AuthContextValue = {
  user: AuthUser | null
  ready: boolean
  signIn: (token: string, user: AuthUser) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('nodehi.token')
    if (!token) {
      setReady(true)
      return
    }

    get<{ ok: boolean; user: AuthUser }>('/auth/session')
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('nodehi.token'))
      .finally(() => setReady(true))
  }, [])

  const signIn = useCallback((token: string, nextUser: AuthUser) => {
    localStorage.setItem('nodehi.token', token)
    setUser(nextUser)
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem('nodehi.token')
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth باید داخل AuthProvider استفاده شود')
  return context
}
