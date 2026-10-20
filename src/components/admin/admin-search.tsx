'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toPersianDigits } from '@/lib/utils/format'

interface SearchItem {
  href: string
  label: string
  meta: string
}

interface SearchGroup {
  type: string
  label: string
  items: SearchItem[]
}

/**
 * جست‌وجوی سراسری پنل مدیریت.
 *
 * پیش‌تر برای یافتن یک سفارش باید حدس زده می‌شد کدام صفحه باز شود. این کادر در
 * بالای سایدبار پنل است و سفارش، کاربر، کد تخفیف و کالا را هم‌زمان می‌جوید.
 *
 * دو نکتهٔ رفتاری:
 *  • درخواست با تأخیر ۲۵۰ میلی‌ثانیه فرستاده می‌شود و پاسخ‌های دیررس با یک
 *    نشانهٔ `cancelled` دور ریخته می‌شوند تا نتیجهٔ درخواست قدیمی روی عبارت
 *    تازه ننشیند.
 *  • نتیجه‌ها فقط «خواندنی»‌اند و در سرور هم بررسی می‌شود که کاربر کارمند باشد.
 */
export function AdminSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const value = query.trim()
    if (value.length < 2) {
      setGroups([])
      setOpen(false)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(value)}`)
        const data = await response.json()
        if (cancelled) return
        if (data?.ok) {
          setGroups((data.groups ?? []) as SearchGroup[])
          setOpen(true)
        }
      } catch {
        // جست‌وجوی ناموفق نباید کار مدیر را متوقف کند؛ سکوت می‌کنیم و کادر
        // باز می‌ماند تا خودش دوباره تایپ کند
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  // بستن با کلیک بیرون — وگرنه پنل روی محتوای صفحه می‌ماند
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const firstItem = groups[0]?.items[0]
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)

  return (
    <div ref={boxRef} className="relative mb-3">
      <label htmlFor="admin-global-search" className="sr-only">
        جست‌وجوی سراسری در پنل مدیریت
      </label>
      <input
        id="admin-global-search"
        type="search"
        value={query}
        placeholder="جست‌وجو: سفارش، کاربر، کد تخفیف…"
        autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (groups.length > 0) setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
          if (event.key === 'Enter' && firstItem) {
            setOpen(false)
            router.push(firstItem.href)
          }
        }}
        className="h-11 w-full rounded-xl border border-surface-border bg-white px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      />

      {loading ? (
        <span className="absolute left-3 top-3.5 text-[10px] text-ink-subtle">…</span>
      ) : null}

      {open ? (
        <div className="absolute inset-x-0 z-40 mt-1 max-h-80 overflow-y-auto rounded-xl border border-surface-border bg-white p-2 shadow-lg">
          {total === 0 ? (
            <p className="px-3 py-4 text-center text-[11px] text-ink-muted">
              {loading ? 'در حال جست‌وجو…' : 'نتیجه‌ای پیدا نشد.'}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.type} className="mb-1 last:mb-0">
                <p className="px-2 py-1.5 text-[10px] font-bold text-ink-subtle">{group.label}</p>
                <ul>
                  {group.items.map((item) => (
                    <li key={`${group.type}-${item.href}-${item.label}`}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-2 py-2 transition-colors hover:bg-surface-muted"
                      >
                        <span className="block truncate text-[11px] font-medium text-ink">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-ink-subtle">
                          {item.meta}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <p className="mt-1 border-t border-surface-border px-2 pt-2 text-[10px] text-ink-subtle">
            {total > 0 ? `${toPersianDigits(total)} نتیجه` : 'برای جست‌وجو حداقل دو نویسه بنویسید'} — Enter
            برای نخستین نتیجه، Esc برای بستن
          </p>
        </div>
      ) : null}
    </div>
  )
}
