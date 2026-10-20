'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { cn } from '@/lib/utils/cn'
import { toPersianDigits } from '@/lib/utils/format'

/**
 * منوی حساب کاربری در هدر.
 * سه حالت دارد: در حال بارگذاری، مهمان (دکمه ورود) و وارد‌شده (منوی کشویی).
 */
export function UserMenu({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // بستن منو با کلیک بیرون و کلید Escape
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handleLogout() {
    setOpen(false)
    await logout()
    router.push('/')
    router.refresh()
  }

  // ── حالت بارگذاری: دکمه بی‌اثر تا از پرش چیدمان جلوگیری شود ──
  if (loading) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'h-10 animate-pulse rounded-xl bg-surface-muted',
          variant === 'desktop' ? 'hidden w-24 sm:block' : 'w-full',
        )}
      />
    )
  }

  // ── مهمان ──
  if (!user) {
    if (variant === 'mobile') {
      return (
        <div className="flex flex-col gap-2 p-1">
          <p className="px-1 text-xs leading-5 text-ink-muted">
            برای دیدن سفارش‌ها، لیست علاقه‌مندی و امتیاز باشگاه وارد شوید.
          </p>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-light"
          >
            <UserGlyph />
            <span>ورود | ثبت‌نام</span>
          </Link>
          <p className="text-center text-[11px] text-ink-subtle">ورود با شماره همراه و کد پیامکی، بدون رمز عبور</p>
        </div>
      )
    }

    return (
      <Link
        href="/login"
        className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
      >
        <UserGlyph />
        <span>ورود | ثبت‌نام</span>
      </Link>
    )
  }

  // ── وارد‌شده: در نمای موبایل فهرست کاربری کشوی ناوبری، در دسکتاپ منوی کشویی ──
  if (variant === 'mobile') {
    const loyalty = `${toPersianDigits(user.loyaltyPoints)} امتیاز`
    const rows: { href: string; label: string; icon: React.ReactNode }[] = [
      { href: '/account', label: 'پیشخوان من', icon: <DashboardGlyph /> },
      { href: '/account/orders', label: 'سفارش‌های من', icon: <BagGlyph /> },
      { href: '/account/wishlist', label: 'علاقه‌مندی‌ها', icon: <HeartGlyph /> },
      { href: '/account/addresses', label: 'آدرس‌های من', icon: <PinGlyph /> },
      { href: '/account/profile', label: 'اطلاعات حساب', icon: <UserGlyph /> },
    ]

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-surface-border">
          <Avatar initial={user.initial} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{user.displayName}</p>
            <p className="ltr-inline truncate text-[11px] text-ink-subtle">{user.phone}</p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary/[0.12] px-2.5 py-1 text-[11px] font-medium text-secondary-dark">
            {user.loyaltyTier} · {loyalty}
          </span>
        </div>

        <ul className="mt-1 flex flex-col gap-0.5">
          {rows.map((row) => (
            <li key={row.href}>
              <Link
                href={row.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface-muted"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                  {row.icon}
                </span>
                <span className="flex-1">{row.label}</span>
                <ChevronGlyph />
              </Link>
            </li>
          ))}

          {user.isAdmin ? (
            <li>
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl bg-primary/[0.06] px-3 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/[0.12]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                  <ShieldGlyph />
                </span>
                <span className="flex-1">پنل مدیریت</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-primary ring-1 ring-primary/15">کارکنان</span>
              </Link>
            </li>
          ) : null}
        </ul>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm text-danger transition-colors hover:bg-danger/[0.08]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/[0.08]">
            <LogoutGlyph />
          </span>
          خروج از حساب
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm text-ink transition-colors hover:bg-surface-muted"
      >
        <Avatar initial={user.initial} />
        <span className="hidden max-w-24 truncate font-medium lg:inline">{user.displayName}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-surface-border bg-white p-2 shadow-float"
        >
          <div className="mb-1 flex items-center gap-3 rounded-lg bg-surface-muted px-3 py-2.5">
            <Avatar initial={user.initial} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{user.displayName}</p>
              <p className="text-[11px] text-ink-subtle">
                {toPersianDigits(user.loyaltyPoints)} امتیاز · {user.loyaltyTier}
              </p>
            </div>
          </div>

          {user.isAdmin ? (
            <MenuLink href="/admin" onClick={() => setOpen(false)} highlight>
              پنل مدیریت
            </MenuLink>
          ) : null}

          <MenuLink href="/account" onClick={() => setOpen(false)}>
            پیشخوان من
          </MenuLink>
          <MenuLink href="/account/orders" onClick={() => setOpen(false)}>
            سفارش‌های من
          </MenuLink>
          <MenuLink href="/account/wishlist" onClick={() => setOpen(false)}>
            علاقه‌مندی‌ها
          </MenuLink>
          <MenuLink href="/account/profile" onClick={() => setOpen(false)}>
            اطلاعات حساب
          </MenuLink>

          <div className="my-1 h-px bg-surface-border" />

          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            className="w-full rounded-lg px-3 py-2.5 text-right text-sm text-danger transition-colors hover:bg-danger/[0.08]"
          >
            خروج از حساب کاربری
          </button>
        </div>
      ) : null}
    </div>
  )
}

function MenuLink({
  href,
  children,
  onClick,
  highlight = false,
}: {
  href: string
  children: React.ReactNode
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className={cn(
        'block rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-surface-muted',
        highlight ? 'font-bold text-primary' : 'text-ink',
      )}
    >
      {children}
    </Link>
  )
}

function Avatar({ initial }: { initial: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-xs font-bold text-primary"
    >
      {initial || <UserGlyph />}
    </span>
  )
}

function ChevronGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-4 w-4 shrink-0 text-ink-subtle"
      aria-hidden="true"
    >
      <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DashboardGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4" aria-hidden="true">
      <path d="M4 5h7v6H4zM13 5h7v9h-7zM4 13h7v6H4zM13 16h7v3h-7z" strokeLinejoin="round" />
    </svg>
  )
}

function BagGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4" aria-hidden="true">
      <path d="M5 8h14l-1 12H6L5 8z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 016 0v2" strokeLinecap="round" />
    </svg>
  )
}

function HeartGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4" aria-hidden="true">
      <path d="M12 20s-7-4.5-7-9.5A4 4 0 0112 8a4 4 0 017 2.5c0 5-7 9.5-7 9.5z" strokeLinejoin="round" />
    </svg>
  )
}

function PinGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4" aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  )
}

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9.5 12l2 2 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LogoutGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4" aria-hidden="true">
      <path d="M15 5H6v14h9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 12H10m8 0l-3-3m3 3l-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UserGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" strokeLinecap="round" />
    </svg>
  )
}
