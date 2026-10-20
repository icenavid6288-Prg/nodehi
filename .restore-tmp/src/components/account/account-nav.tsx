'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { useStore } from '@/components/providers/store-provider'
import { cn } from '@/lib/utils/cn'
import { toPersianDigits } from '@/lib/utils/format'
import type { AuthUser } from '@/types'

const links = [
  { href: '/account', label: 'پیشخوان', icon: 'dashboard' as const },
  { href: '/account/orders', label: 'سفارش‌های من', icon: 'orders' as const },
  { href: '/account/wishlist', label: 'علاقه‌مندی‌ها', icon: 'heart' as const, showWishlistCount: true },
  { href: '/account/addresses', label: 'آدرس‌ها', icon: 'pin' as const },
  { href: '/account/reviews', label: 'نظرات من', icon: 'star' as const },
  { href: '/account/notifications', label: 'اعلان‌ها', icon: 'bell' as const },
  { href: '/account/profile', label: 'اطلاعات حساب', icon: 'user' as const },
]

const secondaryLinks = [
  { href: '/loyalty', label: 'باشگاه مشتریان', icon: 'crown' as const },
  { href: '/faq', label: 'سوالات متداول', icon: 'help' as const },
]

/**
 * سایدبار پنل کاربری.
 * `user` از سرور (layout) می‌آید تا مقدار پیش‌فرض آماده باشد و سایدبار
 * دچار پرش نشود؛ کانتکست کلاینت فقط برای هم‌گام‌سازی پس از تغییر پروفایل
 * یا خروج استفاده می‌شود.
 */
export function AccountNav({ user: serverUser }: { user: AuthUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user: contextUser, logout } = useAuth()
  const { wishlist, hydrated } = useStore()
  const [loggingOut, setLoggingOut] = useState(false)

  // کاربر کانتکست تازه‌تر است (مثلاً بعد از ویرایش نام)؛ در نبودش از سرور می‌خوانیم
  const user = contextUser ?? serverUser

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      router.push('/')
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <nav aria-label="ناوبری پنل کاربری" className="lg:sticky lg:top-32 lg:h-fit">
      {/* کارت کاربر */}
      <div className="mb-3 rounded-2xl border border-surface-border bg-white p-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-lg font-bold text-primary"
          >
            {user.initial || <UserGlyph />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">{user.displayName}</p>
            {user.initial ? (
              <p className="ltr-inline truncate text-xs text-ink-subtle">{user.phone}</p>
            ) : (
              <p className="text-xs text-ink-subtle">نام خود را کامل کنید</p>
            )}
          </div>
        </div>

        {!user.initial ? (
          <Link
            href="/account/profile"
            className="mt-3 block rounded-lg bg-secondary/10 px-3 py-2 text-center text-[11px] font-medium text-secondary-dark transition-colors hover:bg-secondary/[0.16]"
          >
            تکمیل اطلاعات حساب
          </Link>
        ) : null}

        <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary/[0.08] px-3.5 py-2.5">
          <span className="text-xs text-secondary-dark">امتیاز باشگاه</span>
          <span className="text-sm font-bold tabular-nums text-secondary-dark">
            {toPersianDigits(user.loyaltyPoints)}
          </span>
        </div>

        <p className="mt-2 text-center text-[10px] text-ink-subtle">سطح {user.loyaltyTier}</p>

        {/* برای کارکنان: راهی روشن برای رفتن به پنل مدیریت */}
        {user.isAdmin ? (
          <Link
            href="/admin"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-dark"
          >
            ورود به پنل مدیریت
          </Link>
        ) : null}
      </div>

      <ul className="flex flex-col gap-0.5 rounded-2xl border border-surface-border bg-white p-2">
        {links.map((link) => {
          const active = pathname === link.href
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-primary/[0.06] font-bold text-primary'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                )}
              >
                <NavIcon name={link.icon} className="h-4.5 w-4.5" />
                <span className="flex-1">{link.label}</span>
                {link.showWishlistCount && hydrated && wishlist.length > 0 ? (
                  <span className="rounded-full bg-accent/[0.12] px-2 py-0.5 text-[10px] font-bold text-accent-dark">
                    {toPersianDigits(wishlist.length)}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>

      <ul className="mt-3 flex flex-col gap-0.5 rounded-2xl border border-surface-border bg-white p-2">
        {secondaryLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <NavIcon name={link.icon} className="h-4.5 w-4.5" />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={loggingOut}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-surface-border bg-white px-3 py-3 text-sm text-ink-muted transition-colors hover:border-danger/30 hover:text-danger disabled:opacity-60"
      >
        <NavIcon name="logout" className="h-4 w-4" />
        {loggingOut ? 'در حال خروج…' : 'خروج از حساب کاربری'}
      </button>
    </nav>
  )
}

function UserGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" strokeLinecap="round" />
    </svg>
  )
}

function NavIcon({ name, className }: { name: string; className?: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }

  switch (name) {
    case 'orders':
      return (
        <svg {...common}>
          <path d="M5 3.5h14v17l-7-3.5-7 3.5z" />
          <path d="M9 8h6M9 12h4" />
        </svg>
      )
    case 'heart':
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.5-7-9.5A4 4 0 0112 8a4 4 0 017 2.5c0 5-7 9.5-7 9.5z" />
        </svg>
      )
    case 'pin':
      return (
        <svg {...common}>
          <path d="M12 21s-6.5-6-6.5-10.5a6.5 6.5 0 1113 0C18.5 15 12 21 12 21z" />
          <circle cx="12" cy="10.5" r="2.3" />
        </svg>
      )
    case 'star':
      return (
        <svg {...common}>
          <path d="M12 3.5l2.6 5.4 5.9.9-4.3 4.2 1 5.9L12 17l-5.2 2.9 1-5.9L3.5 9.8l5.9-.9L12 3.5z" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...common}>
          <path d="M18 15.5V10a6 6 0 10-12 0v5.5L4.5 18h15z" />
          <path d="M10 21h4" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
        </svg>
      )
    case 'crown':
      return (
        <svg {...common}>
          <path d="M3 8l4 3 5-6 5 6 4-3-2 11H5L3 8z" />
        </svg>
      )
    case 'help':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 114 2c-.8.6-1.5 1-1.5 2" />
          <path d="M12 17h.01" />
        </svg>
      )
    case 'logout':
      return (
        <svg {...common}>
          <path d="M15 4h3.5A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5H15" />
          <path d="M10 8l-4 4 4 4M6 12h9" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
        </svg>
      )
  }
}
