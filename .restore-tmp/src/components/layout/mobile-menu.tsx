'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Logo } from '@/components/layout/logo'
import { menuShortcuts } from '@/components/layout/nav-links'
import { UserMenu } from '@/components/layout/user-menu'
import { useStore } from '@/components/providers/store-provider'
import { ApplianceIcon } from '@/components/ui/appliance-icon'
import { useCatalogMeta } from '@/components/providers/catalog-provider'
import { brand } from '@/config/brand'
import { cn } from '@/lib/utils/cn'
import { toPersianDigits } from '@/lib/utils/format'

/** مدت انیمیشن ورود/خروج — با transition کلاس‌ها یکی نگه داشته می‌شود */
const TRANSITION_MS = 300

/**
 * کشوی ناوبری موبایل.
 *
 * ── باگ قبلی: چرا منو «کامل خراب» بود؟ ──
 * کشو داخل خودِ `<header>` رندر می‌شد و هدر `backdrop-blur` (یعنی
 * `backdrop-filter`) دارد. در CSS، عنصری با `backdrop-filter` یک
 * **containing block** برای فرزندان `position: fixed` می‌سازد؛ پس
 * `fixed inset-0` به‌جای کل صفحه، فقط به کادر ۱۶۶ پیکسلی هدر بسته می‌شد.
 * نتیجه: پوشش تیره فقط روی هدر می‌افتاد، پنل ۱۶۶ پیکسل ارتفاع داشت در حالی
 * که محتوایش ۱۳۰۰ پیکسل بود، و چون اسکرول صفحه هم قفل بود هیچ راهی برای
 * دیدن بقیه آیتم‌ها نمی‌ماند.
 *
 * ── راه‌حل ──
 * رندر با `createPortal` روی `document.body`. حالا containing block همان
 * viewport است و کشو تمام‌قد می‌شود. این کار استکینگ‌کانتکست هدر را هم دور
 * می‌زند، پس نیازی به z-index مسابقه‌ای با بقیه عناصر نیست.
 */
export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { categories } = useCatalogMeta()

  const router = useRouter()
  const { cartCount, wishlist, compare } = useStore()
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  // ── چرخه ورود/خروج: تا وقتی انیمیشن بسته‌شدن تمام نشده، کامپوننت می‌ماند ──
  useEffect(() => {
    if (open) {
      setMounted(true)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }

    setVisible(false)
    const timer = setTimeout(() => setMounted(false), TRANSITION_MS)
    return () => clearTimeout(timer)
  }, [open])

  // ── قفل اسکرول پس‌زمینه، با جبران عرض نوار اسکرول تا صفحه نپرد ──
  useEffect(() => {
    if (!mounted) return
    const { body } = document
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
    }
  }, [mounted])

  // ── تمرکز: هنگام باز شدن روی دکمه بستن، هنگام بستن به دکمه همبرگری برگردد ──
  useEffect(() => {
    if (!mounted) return
    restoreFocusRef.current = document.activeElement as HTMLElement | null
    const timer = setTimeout(() => closeButtonRef.current?.focus(), 60)
    return () => clearTimeout(timer)
  }, [mounted])

  useEffect(() => {
    if (open || mounted) return
    restoreFocusRef.current?.focus?.()
  }, [open, mounted])

  // ── Escape برای بستن + تله تمرکز برای صفحه‌کلید و صفحه‌خوان ──
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!mounted) return
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mounted, onKeyDown])

  // ── اگر کاربر پنجره را به عرض دسکتاپ بزرگ کرد (چرخش تبلت، تغییر اندازه پنجره)،
  //    کشو نامرئی می‌شود ولی پوشش و قفل اسکرول می‌ماند؛ پس عمداً بسته می‌شود. ──
  useEffect(() => {
    if (!open) return
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) onClose()
    }
    desktop.addEventListener('change', onChange)
    return () => desktop.removeEventListener('change', onChange)
  }, [open, onClose])

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    setQuery('')
    onClose()
    router.push(`/shop?q=${encodeURIComponent(term)}`)
  }

  if (!mounted || typeof document === 'undefined') return null

  const quickTiles = [
    { href: '/cart', label: 'سبد خرید', count: cartCount, icon: <CartGlyph /> },
    { href: '/account/wishlist', label: 'علاقه‌مندی', count: wishlist.length, icon: <HeartGlyph /> },
    { href: '/compare', label: 'مقایسه', count: compare.length, icon: <CompareGlyph /> },
    { href: '/track', label: 'پیگیری سفارش', count: 0, icon: <TrackGlyph /> },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="منوی موبایل">
      {/* پس‌زمینه تیره — با لمس بیرون پنل، منو بسته می‌شود */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-primary-dark/60 backdrop-blur-sm transition-opacity ease-out motion-reduce:transition-none',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        style={{ transitionDuration: `${TRANSITION_MS}ms` }}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 right-0 flex w-[88%] max-w-[22rem] flex-col overflow-hidden bg-white shadow-float outline-none transition-transform ease-out motion-reduce:transition-none ltr:rounded-r-2xl rtl:rounded-l-2xl',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ transitionDuration: `${TRANSITION_MS}ms` }}
      >
        {/* ── سربرگ: برند، جستجو و پشتیبانی در یک نگاه ── */}
        <div className="relative overflow-hidden bg-primary px-4 pb-4 pt-4 text-white">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-secondary/25 blur-2xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 right-0 h-32 w-32 rounded-full bg-accent/20 blur-2xl"
          />

          <div className="relative flex items-center justify-between">
            <Logo tone="inverse" />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="بستن منو"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <p className="relative mt-3 text-[11px] leading-5 text-white/70">
            ارسال همان‌روز در تهران و کرج · ضمانت اصالت کالا · پرداخت درب منزل
          </p>

          <form onSubmit={submitSearch} role="search" className="relative mt-3">
            <label htmlFor="mobile-menu-search" className="sr-only">
              جستجوی محصولات
            </label>
            <input
              id="mobile-menu-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجوی محصول، برند یا دسته‌بندی..."
              autoComplete="off"
              className="h-11 w-full rounded-xl border-0 bg-white/[0.12] pr-4 pl-11 text-sm text-white placeholder:text-white/60 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <button
              type="submit"
              aria-label="جستجو"
              className="absolute inset-y-0 left-0 flex w-11 items-center justify-center text-white/80 transition-colors hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
            </button>
          </form>
        </div>

        {/* ── بدنه قابل اسکرول ── */}
        <div className="thin-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="rounded-2xl border border-surface-border bg-surface-muted/60 p-2">
            <UserMenu variant="mobile" />
          </div>

          <ul className="mt-4 grid grid-cols-4 gap-2">
            {quickTiles.map((tile) => (
              <li key={tile.href}>
                <Link
                  href={tile.href}
                  className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-surface-border px-1 py-2.5 text-[11px] text-ink-muted transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                    {tile.icon}
                  </span>
                  <span className="truncate">{tile.label}</span>
                  {tile.count > 0 ? (
                    <span className="absolute -top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                      {toPersianDigits(tile.count)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          <SectionTitle>دسته‌بندی کالاها</SectionTitle>
          <ul className="grid grid-cols-2 gap-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/category/${category.slug}`}
                  className="group flex h-full flex-col gap-2 rounded-2xl border border-surface-border p-3 transition-colors hover:border-primary/30 hover:bg-surface-muted"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <ApplianceIcon category={category.slug} className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium leading-5 text-ink">{category.name}</span>
                </Link>
              </li>
            ))}
          </ul>

          <SectionTitle>دسترسی سریع</SectionTitle>
          <ul className="flex flex-col gap-0.5">
            {menuShortcuts.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-primary"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                    {item.label}
                  </span>
                  <ChevronGlyph />
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/shop"
            className="mt-4 flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-light"
          >
            مشاهده همه کالاها
          </Link>
        </div>

        {/* ── پابرگ: راه تماس همیشه در دسترس ── */}
        <div className="border-t border-surface-border bg-surface-muted px-4 py-3">
          <a
            href={`tel:${brand.contact.phoneRaw}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary/[0.12] px-4 py-3 text-sm font-bold text-secondary-dark transition-colors hover:bg-secondary/20"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4.5 w-4.5">
              <path
                d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3A2 2 0 0116 19C9.9 18.4 5.6 14.1 5 8V6a2 2 0 010-2z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            مشاوره تلفنی: {brand.contact.phone}
          </a>
          <p className="mt-2 text-center text-[11px] text-ink-subtle">{brand.contact.workingHours}</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 mt-5 flex items-center gap-2 text-xs font-bold text-ink-subtle">
      <span className="h-3.5 w-1 rounded-full bg-secondary" />
      {children}
    </p>
  )
}

/** فلش «بعدی» — در چیدمان راست‌به‌چپ به سمت چپ اشاره می‌کند */
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

function CartGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4.5 w-4.5" aria-hidden="true">
      <path d="M3 4h2.2l2.2 11.5h11.2L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="19" r="1.4" />
      <circle cx="17.5" cy="19" r="1.4" />
    </svg>
  )
}

function HeartGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4.5 w-4.5" aria-hidden="true">
      <path d="M12 20s-7-4.5-7-9.5A4 4 0 0112 8a4 4 0 017 2.5c0 5-7 9.5-7 9.5z" strokeLinejoin="round" />
    </svg>
  )
}

function CompareGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4.5 w-4.5" aria-hidden="true">
      <path d="M5 4v16M12 4v16M19 4v16" strokeLinecap="round" />
      <path d="M3.5 16.5h3M10.5 9h3M17.5 13h3" strokeLinecap="round" />
    </svg>
  )
}

function TrackGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4.5 w-4.5" aria-hidden="true">
      <path d="M3 7h9v9H3zM12 10h4l3 3v3h-7z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="1.4" />
      <circle cx="16.5" cy="17.5" r="1.4" />
    </svg>
  )
}
