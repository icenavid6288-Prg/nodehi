import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { get, post, type AuthUser } from '../lib/api'

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

  // هر پاسخ ۴۰۱ (نشست منقضی) کاربر را در کل برنامه خارج می‌کند؛ وگرنه
  // صفحه‌هایی مثل سفارش‌ها به‌جای هدایت به ورود، «خالی» نشان می‌دادند.
  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('nodehi:unauthorized', onUnauthorized)
    return () => window.removeEventListener('nodehi:unauthorized', onUnauthorized)
  }, [])

  const signIn = useCallback((token: string, nextUser: AuthUser) => {
    localStorage.setItem('nodehi.token', token)
    setUser(nextUser)
  }, [])

  const signOut = useCallback(() => {
    // ابتدا نشست سرور باطل می‌شود؛ پاک‌کردن فقط localStorage باعث می‌شد
    // توکن تا ۳۰ روز روی سرور معتبر بماند.
    const token = localStorage.getItem('nodehi.token')
    if (token) post('/auth/logout', {}).catch(() => undefined)

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
