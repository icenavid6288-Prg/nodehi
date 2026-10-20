'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCatalogMeta } from '@/components/providers/catalog-provider'
import { ApplianceIcon } from '@/components/ui/appliance-icon'
import { popularSearches } from '@/lib/data/queries'
import { cn } from '@/lib/utils/cn'
import { formatPrice } from '@/lib/utils/format'

/** یک پیشنهاد جستجو — برگرفته از پاسخ `GET /api/search` */
interface Suggestion {
  type: 'product' | 'category' | 'brand' | 'term'
  label: string
  href: string
  meta: string
}

/**
 * جستجوی هوشمند با پیشنهاد خودکار.
 *
 * پیشنهادها حالا از `GET /api/search` می‌آیند، چون کاتالوگ در دیتابیس است و
 * نسخه‌ای از آن در مرورگر نگه داشته نمی‌شود. در عوض با تأخیر ۲۵۰ میلی‌ثانیه
 * فرستاده می‌شود تا هر کلید تایپ یک درخواست نسازد؛ و برچسب‌های محبوب از پیش
 * در صفحه هستند، پس کادر جستجو هیچ‌وقت خالی و خشک دیده نمی‌شود.
 */
export function SearchBox({ className, autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const { categories, getCategory } = useCatalogMeta()
  const router = useRouter()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  // پیشنهادها از سرور می‌آیند — با تأخیر، و پاسخ‌های دیررس دور ریخته می‌شوند
  useEffect(() => {
    const term = value.trim()
    if (term.length < 2) {
      setSuggestions([])
      return
    }

    let cancelled = false
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}`)
        .then((response) => response.json())
        .then((data) => {
          if (cancelled || !data?.ok) return
          setSuggestions((data.suggestions ?? []) as Suggestion[])
        })
        .catch(() => {
          // جستجوی ناموفق نباید تجربهٔ کاربر را قطع کند
        })
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [value])

  const showPopular = value.trim().length < 2

  // بستن فهرست با کلیک بیرون
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const allItems: Suggestion[] = showPopular
    ? popularSearches.map((term) => ({
        type: 'term' as const,
        label: term,
        href: `/shop?q=${encodeURIComponent(term)}`,
        meta: '',
      }))
    : suggestions

  function go(href: string) {
    setOpen(false)
    setValue('')
    router.push(href)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (activeIndex >= 0 && allItems[activeIndex]) {
      go(allItems[activeIndex].href)
      return
    }
    const term = value.trim()
    if (term) go(`/shop?q=${encodeURIComponent(term)}`)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, allItems.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={submit} role="search" className="relative">
        <label htmlFor="site-search" className="sr-only">
          جستجوی محصولات
        </label>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-subtle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id="site-search"
          type="search"
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="جستجوی محصول، برند یا دسته‌بندی..."
          autoComplete="off"
          // الگوی استاندارد ARIA برای ورودی دارای پیشنهاد خودکار
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="h-12 w-full rounded-xl border border-surface-border bg-white pr-11 pl-24 text-sm text-ink placeholder:text-ink-subtle focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25"
        />
        <button
          type="submit"
          className="absolute inset-y-1.5 left-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-light"
        >
          جستجو
        </button>
      </form>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-[26rem] overflow-y-auto rounded-xl border border-surface-border bg-white p-2 shadow-float"
        >
          {showPopular ? (
            <p className="px-3 py-2 text-xs font-medium text-ink-subtle">جستجوهای پرطرفدار</p>
          ) : null}

          {allItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-muted">
              نتیجه‌ای یافت نشد. عبارت دیگری را امتحان کنید.
            </p>
          ) : (
            <ul className="flex flex-col">
              {allItems.map((item, index) => {
                const category = item.type === 'category' ? getCategory(item.href.split('category=')[1] ?? '') : undefined
                const priceMatch = item.type === 'product' ? item.meta : null
                return (
                  <li key={`${item.type}-${item.href}-${index}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(item.href)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right transition-colors',
                        index === activeIndex ? 'bg-surface-muted' : 'hover:bg-surface-muted',
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                        {category ? (
                          <ApplianceIcon category={category.slug} className="h-4 w-4" />
                        ) : item.type === 'term' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                            <circle cx="11" cy="11" r="7" />
                            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4">
                            <path d="M4 7h16M4 12h10M4 17h7" strokeLinecap="round" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{item.label}</span>
                        {priceMatch && !priceMatch.includes('تومان') ? (
                          <span className="mt-0.5 block truncate text-xs text-ink-subtle">{priceMatch}</span>
                        ) : null}
                      </span>
                      {item.type === 'category' ? (
                        <span className="shrink-0 text-xs text-secondary-dark">{item.meta ? 'دسته‌بندی' : ''}</span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}

      {/* فهرست دسته‌بندی‌ها در حالت جستجوی خالی، برای دسترسی سریع */}
      {open && showPopular ? (
        <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
          {categories.slice(0, 5).map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => go(`/shop?category=${category.slug}`)}
              className="rounded-full border border-surface-border bg-white px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary hover:text-primary"
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** نمونه فشرده قیمت برای پیشنهادها */
export function SuggestionPrice({ price }: { price: number }) {
  return <span className="text-xs text-ink-muted">{formatPrice(price)}</span>
}
