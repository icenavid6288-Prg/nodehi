'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input } from '@/components/ui/input'
import { useCatalogMeta } from '@/components/providers/catalog-provider'
import type { ProductFacets } from '@/lib/data/queries'
import { countActiveFilters, parseShopSearchParams, toSearchParams, toggleListValue } from '@/lib/filters'
import { cn } from '@/lib/utils/cn'
import { formatNumber, toLatinDigits, toPersianDigits } from '@/lib/utils/format'
import type { CategorySlug } from '@/types'

/**
 * پنل فیلتر پیشرفته.
 * منبع حقیقت، آدرس صفحه است: هر تغییر فیلتر با router.replace در query string
 * نوشته می‌شود. نتیجه این‌که هر ترکیب فیلتر یک لینک قابل اشتراک و ایندکس‌شدنی
 * است و دکمه Back مرورگر هم درست کار می‌کند.
 */
export function FilterPanel({
  facets,
  categoryCounts,
  totalCount,
  className,
}: {
  facets: ProductFacets
  /** تعداد کالای هر دسته در نتیجه فیلترشده فعلی */
  categoryCounts: Record<string, number>
  totalCount: number
  className?: string
}) {
  const { categories, getBrandName } = useCatalogMeta()
  const router = useRouter()
  const searchParams = useSearchParams()
  const state = useMemo(() => parseShopSearchParams(Object.fromEntries(searchParams.entries())), [searchParams])
  const activeCount = countActiveFilters(state.filters, state.discountedOnly)

  const [priceDraft, setPriceDraft] = useState<{ min: string; max: string }>({
    min: state.filters.minPrice !== null ? String(state.filters.minPrice) : '',
    max: state.filters.maxPrice !== null ? String(state.filters.maxPrice) : '',
  })

  const push = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = toSearchParams({ ...state, page: 1 })
      mutate(params)
      const query = params.toString()
      router.replace(query ? `/shop?${query}` : '/shop', { scroll: false })
    },
    [router, state],
  )

  const toggleFilter = useCallback(
    (key: 'category' | 'brand' | 'energy' | 'color', value: string) => {
      push((params) => {
        const current = (params.get(key) ?? '').split(',').filter(Boolean)
        const next = toggleListValue(current, value)
        if (next.length) params.set(key, next.join(','))
        else params.delete(key)
      })
    },
    [push],
  )

  const toggleFlag = useCallback(
    (key: string) => {
      push((params) => {
        if (params.get(key) === '1') params.delete(key)
        else params.set(key, '1')
      })
    },
    [push],
  )

  const applyPrice = useCallback(() => {
    push((params) => {
      const min = toLatinDigits(priceDraft.min).replace(/[^\d]/g, '')
      const max = toLatinDigits(priceDraft.max).replace(/[^\d]/g, '')
      if (min) params.set('minPrice', min)
      else params.delete('minPrice')
      if (max) params.set('maxPrice', max)
      else params.delete('maxPrice')
    })
  }, [priceDraft, push])

  const resetAll = useCallback(() => {
    router.replace('/shop', { scroll: false })
    setPriceDraft({ min: '', max: '' })
  }, [router])

  return (
    <aside className={cn('flex flex-col gap-4', className)} aria-label="فیلتر محصولات">
      <div className="flex items-center justify-between rounded-2xl border border-surface-border bg-white px-4 py-3">
        <p className="text-sm font-bold text-ink">
          فیلترها
          {activeCount > 0 ? (
            <span className="mr-2 rounded-full bg-accent/[0.12] px-2 py-0.5 text-[11px] font-medium text-accent-dark">
              {toPersianDigits(activeCount)} فعال
            </span>
          ) : null}
        </p>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={resetAll}
            className="text-xs text-primary transition-colors hover:text-accent"
          >
            حذف همه
          </button>
        ) : null}
      </div>

      <p className="px-1 text-xs text-ink-muted">
        {toPersianDigits(totalCount)} کالا با شرایط انتخابی شما یافت شد.
      </p>

      {/* دسته‌بندی */}
      <FilterGroup title="دسته‌بندی">
        <ul className="flex flex-col">
          {categories.map((category) => {
            const slug = category.slug
            const count = categoryCounts[slug] ?? 0
            return (
              <li key={slug}>
                <Checkbox
                  label={category.name}
                  count={count}
                  checked={state.filters.categories.includes(slug)}
                  onChange={() => toggleFilter('category', slug)}
                />
              </li>
            )
          })}
        </ul>
      </FilterGroup>

      {/* برند */}
      {facets.brands.length > 0 ? (
        <FilterGroup title="برند" collapsedByDefault={false}>
          <ul className="flex flex-col">
            {facets.brands.map((option) => (
              <li key={option.value}>
                <Checkbox
                  label={getBrandName(option.value)}
                  count={option.count}
                  checked={state.filters.brands.includes(option.value)}
                  onChange={() => toggleFilter('brand', option.value)}
                />
              </li>
            ))}
          </ul>
        </FilterGroup>
      ) : null}

      {/* بازه قیمت */}
      <FilterGroup title="بازه قیمت (تومان)">
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <Field label="از" htmlFor="price-min">
              <Input
                id="price-min"
                inputMode="numeric"
                dir="ltr"
                className="text-left"
                value={priceDraft.min}
                onChange={(event) => setPriceDraft((draft) => ({ ...draft, min: event.target.value }))}
                placeholder={String(facets.priceRange.min)}
              />
            </Field>
            <Field label="تا" htmlFor="price-max">
              <Input
                id="price-max"
                inputMode="numeric"
                dir="ltr"
                className="text-left"
                value={priceDraft.max}
                onChange={(event) => setPriceDraft((draft) => ({ ...draft, max: event.target.value }))}
                placeholder={String(facets.priceRange.max)}
              />
            </Field>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={applyPrice}>
            اعمال بازه قیمت
          </Button>
          <p className="text-[11px] leading-5 text-ink-subtle">
            قیمت‌های فروشگاه از {formatNumber(facets.priceRange.min)} تا {formatNumber(facets.priceRange.max)} تومان است.
          </p>
        </div>
      </FilterGroup>

      {/* رده انرژی */}
      {facets.energyRatings.length > 0 ? (
        <FilterGroup title="رده مصرف انرژی">
          <ul className="flex flex-wrap gap-1.5">
            {facets.energyRatings.map((option) => {
              const active = state.filters.energyRatings.includes(option.value)
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => toggleFilter('energy', option.value)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                      active
                        ? 'border-secondary bg-secondary/10 font-medium text-secondary-dark'
                        : 'border-surface-border text-ink-muted hover:border-primary/40',
                    )}
                  >
                    <span className="ltr-inline">{option.value}</span>
                    <span className="mr-1 text-[10px] text-ink-subtle">({toPersianDigits(option.count)})</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </FilterGroup>
      ) : null}

      {/* رنگ */}
      {facets.colors.length > 0 ? (
        <FilterGroup title="رنگ">
          <ul className="flex flex-wrap gap-1.5">
            {facets.colors.map((option) => {
              const active = state.filters.colors.includes(option.value)
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => toggleFilter('color', option.value)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs transition-colors',
                      active
                        ? 'border-secondary bg-secondary/10 font-medium text-secondary-dark'
                        : 'border-surface-border text-ink-muted hover:border-primary/40',
                    )}
                  >
                    {option.value}
                    <span className="mr-1 text-[10px] text-ink-subtle">({toPersianDigits(option.count)})</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </FilterGroup>
      ) : null}

      {/* ویژگی‌های چک‌باکسی */}
      <FilterGroup title="ویژگی‌ها">
        <ul className="flex flex-col">
          <li>
            <Checkbox
              label="موتور اینورتر"
              checked={state.filters.inverterOnly}
              onChange={() => toggleFlag('inverter')}
            />
          </li>
          <li>
            <Checkbox
              label="امکان خرید اقساطی"
              checked={state.filters.installmentOnly}
              onChange={() => toggleFlag('installment')}
            />
          </li>
          <li>
            <Checkbox
              label="فقط کالاهای آماده ارسال"
              checked={state.filters.readyToShipOnly}
              onChange={() => toggleFlag('ready')}
            />
          </li>
          <li>
            <Checkbox
              label="فقط کالاهای موجود"
              checked={state.filters.inStockOnly}
              onChange={() => toggleFlag('instock')}
            />
          </li>
          <li>
            <Checkbox
              label="فقط کالاهای تخفیف‌دار"
              checked={state.discountedOnly}
              onChange={() => toggleFlag('discounted')}
            />
          </li>
        </ul>
      </FilterGroup>
    </aside>
  )
}

function FilterGroup({
  title,
  children,
  collapsedByDefault = false,
}: {
  title: string
  children: React.ReactNode
  collapsedByDefault?: boolean
}) {
  const [open, setOpen] = useState(!collapsedByDefault)

  return (
    <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-bold text-ink transition-colors hover:bg-surface-muted"
      >
        {title}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={cn('h-4 w-4 text-ink-subtle transition-transform', open && 'rotate-180')}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? <div className="border-t border-surface-border px-3 py-3">{children}</div> : null}
    </section>
  )
}

/** نسخه موبایل پنل فیلتر — به‌صورت کشوی تمام‌صفحه */
export function MobileFilterDrawer({
  facets,
  categoryCounts,
  totalCount,
  triggerLabel,
}: {
  facets: ProductFacets
  categoryCounts: Record<string, number>
  totalCount: number
  triggerLabel: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="lg:hidden">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
        </svg>
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-surface-muted p-4 shadow-float">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-ink">فیلتر محصولات</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن فیلترها"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-ink-muted"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <FilterPanel facets={facets} categoryCounts={categoryCounts} totalCount={totalCount} />
            <Button variant="primary" className="mt-4 w-full" onClick={() => setOpen(false)}>
              نمایش نتایج
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}
