import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { get, type ProductSummary } from '../lib/api'
import { useCompare } from '../context/CompareContext'
import { toFa } from '../lib/format'
import { ArrowLeftIcon, CloseIcon, CompareIcon } from './icons'

/**
 * نوار شناور مقایسه.
 *
 * فقط نامک‌ها در context هستند و نام/تصویر از API خوانده می‌شود تا با ویرایش
 * محصول در پنل، نوار هم به‌روز بماند.
 */
export default function CompareBar() {
  const { slugs, count, remove, clear } = useCompare()
  const location = useLocation()
  const [items, setItems] = useState<ProductSummary[]>([])

  useEffect(() => {
    if (slugs.length === 0) {
      setItems([])
      return
    }

    let active = true

    get<{ items: ProductSummary[] }>(`/products/by-slugs?slugs=${encodeURIComponent(slugs.join(','))}`)
      .then((data) => {
        if (active) setItems(data.items)
      })
      .catch(() => {
        if (active) setItems([])
      })

    return () => {
      active = false
    }
  }, [slugs])

  // در خود صفحهٔ مقایسه، نوار تکراری و مزاحم است.
  if (count === 0 || location.pathname === '/compare') return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-3 rounded-2xl border border-surface-border bg-white/95 p-2.5 shadow-float backdrop-blur sm:gap-4 sm:p-3">
        <span className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-primary px-2.5 py-2 text-[11px] font-bold text-white sm:flex">
          <CompareIcon className="h-4 w-4" />
          {toFa(count)} کالا
        </span>

        <ul className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto">
          {items.map((item) => (
            <li key={item.slug} className="relative shrink-0">
              <span className="block h-11 w-11 overflow-hidden rounded-xl border border-surface-border bg-surface-muted p-1 sm:h-12 sm:w-12">
                {item.images[0] ? (
                  <img src={item.images[0]} alt={item.name} className="h-full w-full object-contain" loading="lazy" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[9px] font-bold text-primary/40">
                    {item.name.slice(0, 6)}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => remove(item.slug)}
                className="absolute -left-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary-dark text-white shadow-sm"
                aria-label={`حذف ${item.name} از مقایسه`}
              >
                <CloseIcon className="h-2.5 w-2.5" />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={clear}
            className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-ink-subtle hover:bg-surface-muted hover:text-danger sm:text-[11px]"
          >
            پاک‌کردن
          </button>
          <Link
            to="/compare"
            aria-disabled={count < 2}
            onClick={(event) => {
              if (count < 2) event.preventDefault()
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition sm:px-4 sm:text-xs ${
              count < 2
                ? 'cursor-not-allowed bg-surface-border text-ink-subtle'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary-light'
            }`}
          >
            مقایسه
            <ArrowLeftIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
