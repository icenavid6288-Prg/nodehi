'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthUser } from '@/types'

/**
 * وضعیت احراز هویت در سمت کلاینت.
 *
 * چرا نشست در layout ریشه (سمت سرور) خوانده نمی‌شود؟ چون `cookies()` در
 * Server Component همه صفحات را از رندر استاتیک به پویا تبدیل می‌کند و
 * مزیت اصلی این پروژه (SG/SSG و باندل کوچک) از دست می‌رود. در عوض این
 * Provider یک بار `/api/auth/session` را می‌خواند و نتیجه را در کانتکست
 * می‌گذارد تا هدر، سایدبار پنل و هر جای دیگری از یک درخواست استفاده کنند.
 *
 * محافظت واقعی از مسیرهای خصوصی در `app/account/layout.tsx` سمت سرور انجام
 * می‌شود؛ این Provider فقط برای نمایش وضعیت است و لایه امنیتی نیست.
 */

interface AuthContextValue {
  user: AuthUser | null
  /** تا زمانی که پاسخ نشست نرسیده، true است */
  loading: boolean
  isAuthenticated: boolean
  /** به‌روزرسانی دستی پس از ورود یا تغییر پروفایل */
  refresh: () => Promise<AuthUser | null>
  /** جایگزینی مستقیم کاربر پس از تأیید کد — بدون درخواست دوباره */
  setUser: (user: AuthUser | null) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' })
      const data = await response.json()
      const next: AuthUser | null = data?.user ?? null
      setUser(next)
      return next
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      // حتی اگر درخواست شکست بخورد، وضعیت محلی پاک می‌شود تا کاربر
      // در حالت «وارد شده» گیر نکند.
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      refresh,
      setUser,
      logout,
    }),
    [user, loading, refresh, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth باید داخل AuthProvider استفاده شود.')
  }
  return context
}
