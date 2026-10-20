'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnnouncementBar } from '@/components/layout/announcement-bar'
import { Logo } from '@/components/layout/logo'
import { MobileMenu } from '@/components/layout/mobile-menu'
import { menuShortcuts, primaryNav } from '@/components/layout/nav-links'
import { SearchBox } from '@/components/layout/search-box'
import { UserMenu } from '@/components/layout/user-menu'
import { useStore } from '@/components/providers/store-provider'
import { ApplianceIcon } from '@/components/ui/appliance-icon'
import { useCatalogMeta } from '@/components/providers/catalog-provider'
import { brand } from '@/config/brand'
import { cn } from '@/lib/utils/cn'
import { toPersianDigits } from '@/lib/utils/format'

function CountBadge({ count, tone = 'accent' }: { count: number; tone?: 'accent' | 'primary' }) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        'absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white',
        tone === 'accent' ? 'bg-accent' : 'bg-primary',
      )}
    >
      {toPersianDigits(count)}
    </span>
  )
}

export function Header() {
  const { categories } = useCatalogMeta()
  const pathname = usePathname()
  const { cartCount, compare, wishlist, hydrated } = useStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  // بستن منوها هنگام تغییر مسیر
  useEffect(() => {
    setMobileOpen(false)
    setCategoriesOpen(false)
  }, [pathname])

  // قفل اسکرول هنگام باز بودن منوی موبایل داخل خودِ کشو انجام می‌شود
  // (`mobile-menu.tsx`)، چون آنجا عمر قفل با عمر انیمیشن بسته‌شدن هم‌گام است.

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      {/* اعلان سایت / حالت تعمیرات — از تنظیمات پنل می‌آید */}
      <AnnouncementBar />

      {/* نوار اعتماد بالایی */}
      <div className="hidden bg-primary text-white lg:block">
        <div className="mx-auto flex max-w-container items-center justify-between px-4 py-2 text-xs">
          <p className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-secondary" />
            ارسال همان‌روز در تهران و کرج · ضمانت اصالت کالا · پرداخت درب منزل
          </p>
          <div className="flex items-center gap-4">
            <a href={`tel:${brand.contact.phoneRaw}`} className="transition-colors hover:text-secondary">
              پشتیبانی: {brand.contact.phone}
            </a>
            <span className="text-white/40">|</span>
            <Link href="/track" className="transition-colors hover:text-secondary">
              پیگیری سفارش
            </Link>
          </div>
        </div>
      </div>

      {/* ردیف اصلی */}
      <div className="mx-auto flex max-w-container items-center gap-3 px-4 py-3 sm:gap-5">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="-mr-1 flex h-10 w-10 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-muted lg:hidden"
          aria-label="باز کردن منو"
          aria-expanded={mobileOpen}
          aria-haspopup="dialog"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>

        <Logo showTagline className="shrink-0" />

        <div className="hidden flex-1 md:block">
          <SearchBox />
        </div>

        <div className="mr-auto flex items-center gap-1">
          <Link
            href="/account/wishlist"
            className="relative hidden h-10 w-10 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-muted sm:flex"
            aria-label={`علاقه‌مندی‌ها (${wishlist.length})`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
              <path
                d="M12 20s-7-4.5-7-9.5A4 4 0 0112 8a4 4 0 017 2.5c0 5-7 9.5-7 9.5z"
                strokeLinejoin="round"
              />
            </svg>
            {hydrated ? <CountBadge count={wishlist.length} tone="primary" /> : null}
          </Link>

          <UserMenu />

          <Link
            href="/compare"
            className="relative hidden h-10 w-10 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-muted lg:flex"
            aria-label={`مقایسه (${compare.length})`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
              <path d="M5 4v16M12 4v16M19 4v16" strokeLinecap="round" />
              <path d="M3.5 16.5h3M10.5 9h3M17.5 13h3" strokeLinecap="round" />
            </svg>
            {hydrated ? <CountBadge count={compare.length} tone="primary" /> : null}
          </Link>

          <Link
            href="/cart"
            className="relative mr-1 flex h-10 items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-light"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
              <path d="M3 4h2.2l2.2 11.5h11.2L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9.5" cy="19" r="1.4" />
              <circle cx="17.5" cy="19" r="1.4" />
            </svg>
            <span className="hidden sm:inline">سبد خرید</span>
            {hydrated ? <CountBadge count={cartCount} /> : null}
          </Link>
        </div>
      </div>

      {/* جستجو در موبایل */}
      <div className="px-4 pb-3 md:hidden">
        <SearchBox />
      </div>

      {/* نوار ناوبری دسکتاپ */}
      <nav className="hidden border-t border-surface-border lg:block" aria-label="ناوبری اصلی">
        <div className="mx-auto flex max-w-container items-center gap-1 px-4">
          <div
            className="relative"
            onMouseEnter={() => setCategoriesOpen(true)}
            onMouseLeave={() => setCategoriesOpen(false)}
          >
            <button
              type="button"
              onClick={() => setCategoriesOpen((open) => !open)}
              aria-expanded={categoriesOpen}
              className="flex h-11 items-center gap-2 px-3 text-sm font-bold text-primary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
              دسته‌بندی کالاها
            </button>

            {categoriesOpen ? (
              <div className="absolute right-0 top-full z-50 w-[46rem] overflow-hidden rounded-xl border border-surface-border bg-white shadow-float">
                <div className="grid grid-cols-[1fr_230px]">
                  {/* ستون اصلی: همه دسته‌ها با آیکون و توضیح کوتاه */}
                  <ul className="grid grid-cols-2 gap-0.5 p-2">
                    {categories.map((category) => (
                      <li key={category.slug}>
                        <Link
                          href={`/category/${category.slug}`}
                          className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-muted"
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                            <ApplianceIcon category={category.slug} className="h-4.5 w-4.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-ink">{category.name}</span>
                            <span className="line-clamp-2 block text-xs leading-5 text-ink-subtle">
                              {category.description}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {/* ستون کناری: میانبرهای پرکاربرد — کاربر دنبال "تخفیف" یا "برند" بگردد */}
                  <div className="border-r border-surface-border bg-surface-muted p-4">
                    <p className="text-xs font-bold text-ink-subtle">دسترسی سریع</p>
                    <ul className="mt-2.5 flex flex-col gap-0.5">
                      {menuShortcuts.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-white hover:text-primary"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/shop"
                      className="mt-3 flex items-center justify-center rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-light"
                    >
                      مشاهده همه کالاها
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <span className="mx-1 h-5 w-px bg-surface-border" />

          <ul className="flex items-center">
            {primaryNav.map((item) => {
              const active = pathname === item.href.split('?')[0]
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex h-11 items-center px-3 text-sm transition-colors',
                      active ? 'font-bold text-primary' : 'text-ink-muted hover:text-primary',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* منوی موبایل — در `document.body` رندر می‌شود (جزئیات در خودِ کامپوننت) */}
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  )
}
