'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useCatalogMeta } from '@/components/providers/catalog-provider'
import { parseShopSearchParams, sortOptions, toSearchParams, toggleListValue } from '@/lib/filters'
import { Select } from '@/components/ui/input'
import { formatNumber, toPersianDigits } from '@/lib/utils/format'
import type { CategorySlug } from '@/types'

/** انتخاب ترتیب نمایش — با نوشتن در URL تا نتیجه قابل اشتراک باشد */
export function SortSelect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const state = useMemo(() => parseShopSearchParams(Object.fromEntries(searchParams.entries())), [searchParams])

  return (
    <label className="flex items-center gap-2 text-xs text-ink-muted">
      <span className="whitespace-nowrap">ترتیب:</span>
      <Select
        value={state.filters.sort}
        onChange={(event) => {
          const params = toSearchParams({ ...state, page: 1 })
          if (event.target.value === 'relevance') params.delete('sort')
          else params.set('sort', event.target.value)
          const query = params.toString()
          router.replace(query ? `/shop?${query}` : '/shop', { scroll: false })
        }}
        className="h-9 w-40 text-xs"
        aria-label="ترتیب نمایش محصولات"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  )
}

/**
 * تراشه‌های فیلتر فعال.
 * هر تراشه یک فیلتر را حذف می‌کند — کاهش اصطکاک برای لغو انتخاب‌ها.
 */
export function ActiveFilterChips() {
  const { getCategory, getBrandName } = useCatalogMeta()
  const router = useRouter()
  const searchParams = useSearchParams()
  const state = useMemo(() => parseShopSearchParams(Object.fromEntries(searchParams.entries())), [searchParams])
  const { filters, discountedOnly } = state

  const chips: { key: string; label: string; onRemove: () => void }[] = []

  function buildRemove(
    mutate: (params: URLSearchParams) => void,
  ): () => void {
    return () => {
      const params = toSearchParams({ ...state, page: 1 })
      mutate(params)
      const query = params.toString()
      router.replace(query ? `/shop?${query}` : '/shop', { scroll: false })
    }
  }

  if (filters.q) {
    chips.push({ key: 'q', label: `جستجو: ${filters.q}`, onRemove: buildRemove((p) => p.delete('q')) })
  }

  for (const slug of filters.categories) {
    chips.push({
      key: `category-${slug}`,
      label: getCategory(slug)?.name ?? slug,
      onRemove: buildRemove((p) => {
        const next = toggleListValue(filters.categories, slug)
        if (next.length) p.set('category', next.join(','))
        else p.delete('category')
      }),
    })
  }

  for (const brand of filters.brands) {
    chips.push({
      key: `brand-${brand}`,
      label: getBrandName(brand),
      onRemove: buildRemove((p) => {
        const next = toggleListValue(filters.brands, brand)
        if (next.length) p.set('brand', next.join(','))
        else p.delete('brand')
      }),
    })
  }

  for (const energy of filters.energyRatings) {
    chips.push({
      key: `energy-${energy}`,
      label: `رده انرژی ${energy}`,
      onRemove: buildRemove((p) => {
        const next = toggleListValue(filters.energyRatings, energy)
        if (next.length) p.set('energy', next.join(','))
        else p.delete('energy')
      }),
    })
  }

  for (const color of filters.colors) {
    chips.push({
      key: `color-${color}`,
      label: `رنگ ${color}`,
      onRemove: buildRemove((p) => {
        const next = toggleListValue(filters.colors, color)
        if (next.length) p.set('color', next.join(','))
        else p.delete('color')
      }),
    })
  }

  if (filters.minPrice !== null || filters.maxPrice !== null) {
    chips.push({
      key: 'price',
      label: `قیمت: ${filters.minPrice !== null ? formatNumber(filters.minPrice) : '۰'} تا ${
        filters.maxPrice !== null ? formatNumber(filters.maxPrice) : 'بی‌نهایت'
      } تومان`,
      onRemove: buildRemove((p) => {
        p.delete('minPrice')
        p.delete('maxPrice')
      }),
    })
  }

  const flags: { key: string; label: string; active: boolean }[] = [
    { key: 'inverter', label: 'اینورتر', active: filters.inverterOnly },
    { key: 'installment', label: 'اقساطی', active: filters.installmentOnly },
    { key: 'ready', label: 'آماده ارسال', active: filters.readyToShipOnly },
    { key: 'instock', label: 'موجود', active: filters.inStockOnly },
    { key: 'discounted', label: 'تخفیف‌دار', active: discountedOnly },
  ]

  for (const flag of flags) {
    if (!flag.active) continue
    chips.push({ key: flag.key, label: flag.label, onRemove: buildRemove((p) => p.delete(flag.key)) })
  }

  if (chips.length === 0) return null

  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.onRemove}
            className="group flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs text-primary transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent-dark"
          >
            {chip.label}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3 w-3">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
            <span className="sr-only">حذف فیلتر</span>
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() => router.replace('/shop', { scroll: false })}
          className="px-2 text-xs text-ink-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
        >
          حذف همه فیلترها
        </button>
      </li>
    </ul>
  )
}

/** صفحه‌بندی با لینک‌های قابل خزش */
export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const state = useMemo(() => parseShopSearchParams(Object.fromEntries(searchParams.entries())), [searchParams])

  if (totalPages <= 1) return null

  function goTo(target: number) {
    const params = toSearchParams({ ...state, page: target })
    if (target <= 1) params.delete('page')
    router.replace(`/shop?${params.toString()}`, { scroll: true })
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === totalPages || Math.abs(item - page) <= 1,
  )

  return (
    <nav aria-label="صفحه‌بندی نتایج" className="mt-8 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        className="flex h-10 items-center gap-1 rounded-xl border border-surface-border px-3 text-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        قبلی
      </button>

      {pages.map((item, index) => (
        <span key={item} className="flex items-center gap-2">
          {index > 0 && item - pages[index - 1]! > 1 ? <span className="text-ink-subtle">…</span> : null}
          <button
            type="button"
            onClick={() => goTo(item)}
            aria-current={item === page ? 'page' : undefined}
            className={
              item === page
                ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white'
                : 'flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border text-sm text-ink transition-colors hover:border-primary hover:text-primary'
            }
          >
            {toPersianDigits(item)}
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
        className="flex h-10 items-center gap-1 rounded-xl border border-surface-border px-3 text-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        بعدی
      </button>
    </nav>
  )
}
