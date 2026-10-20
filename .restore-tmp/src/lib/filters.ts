import { defaultFilters } from '@/lib/data/queries'
import { toLatinDigits } from '@/lib/utils/format'
import type { CategorySlug, ProductFilters, SortKey } from '@/types'

const SORT_KEYS: SortKey[] = ['relevance', 'newest', 'price-asc', 'price-desc', 'rating', 'popular']

export type RawSearchParams = Record<string, string | string[] | undefined>

export interface ShopSearchState {
  filters: ProductFilters
  page: number
  discountedOnly: boolean
  perPage: number
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function list(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : []
  return raw
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function numberOrNull(value: string | string[] | undefined): number | null {
  const raw = toLatinDigits(first(value)).replace(/[^\d]/g, '')
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * تبدیل searchParams به وضعیت فیلتر.
 * همه ورودی‌ها اعتبارسنجی می‌شوند تا پارامتر دستکاری‌شده در URL نتواند
 * رفتار غیرمنتظره ایجاد کند.
 */
export function parseShopSearchParams(params: RawSearchParams): ShopSearchState {
  const sortRaw = first(params.sort)
  const sort = (SORT_KEYS as string[]).includes(sortRaw) ? (sortRaw as SortKey) : 'relevance'

  // از parseInt استفاده می‌کنیم تا مقدار منفی مانند "-5" به ۵ تبدیل نشود؛
  // ورودی نامعتبر یا منفی به صفحه یک اصلاح می‌گردد.
  const parsedPage = Number.parseInt(toLatinDigits(first(params.page)).trim(), 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  return {
    filters: {
      ...defaultFilters,
      q: first(params.q).slice(0, 100),
      categories: list(params.category) as CategorySlug[],
      brands: list(params.brand),
      minPrice: numberOrNull(params.minPrice),
      maxPrice: numberOrNull(params.maxPrice),
      energyRatings: list(params.energy),
      colors: list(params.color),
      inverterOnly: first(params.inverter) === '1',
      installmentOnly: first(params.installment) === '1',
      readyToShipOnly: first(params.ready) === '1',
      inStockOnly: first(params.instock) === '1',
      sort,
    },
    page,
    discountedOnly: first(params.discounted) === '1',
    perPage: Math.min(48, Math.max(8, Number(toLatinDigits(first(params.perPage))) || 24)),
  }
}

/** تبدیل وضعیت فیلتر به query string — برای لینک‌های قابل اشتراک */
export function toSearchParams(state: ShopSearchState): URLSearchParams {
  const params = new URLSearchParams()
  const { filters } = state

  if (filters.q) params.set('q', filters.q)
  if (filters.categories.length) params.set('category', filters.categories.join(','))
  if (filters.brands.length) params.set('brand', filters.brands.join(','))
  if (filters.minPrice !== null) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice !== null) params.set('maxPrice', String(filters.maxPrice))
  if (filters.energyRatings.length) params.set('energy', filters.energyRatings.join(','))
  if (filters.colors.length) params.set('color', filters.colors.join(','))
  if (filters.inverterOnly) params.set('inverter', '1')
  if (filters.installmentOnly) params.set('installment', '1')
  if (filters.readyToShipOnly) params.set('ready', '1')
  if (filters.inStockOnly) params.set('instock', '1')
  if (filters.sort !== 'relevance') params.set('sort', filters.sort)
  if (state.discountedOnly) params.set('discounted', '1')
  if (state.page > 1) params.set('page', String(state.page))

  return params
}

/** افزودن یا حذف یک مقدار از فهرست چندگانه */
export function toggleListValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

/** تعداد فیلترهای فعال — برای نشان دادن روی دکمه موبایل */
export function countActiveFilters(filters: ProductFilters, discountedOnly: boolean): number {
  return (
    filters.categories.length +
    filters.brands.length +
    filters.energyRatings.length +
    filters.colors.length +
    (filters.minPrice !== null || filters.maxPrice !== null ? 1 : 0) +
    (filters.inverterOnly ? 1 : 0) +
    (filters.installmentOnly ? 1 : 0) +
    (filters.readyToShipOnly ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (discountedOnly ? 1 : 0)
  )
}

export const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'مرتبط‌ترین' },
  { value: 'popular', label: 'پرفروش‌ترین' },
  { value: 'newest', label: 'جدیدترین' },
  { value: 'price-asc', label: 'ارزان‌ترین' },
  { value: 'price-desc', label: 'گران‌ترین' },
  { value: 'rating', label: 'بیشترین امتیاز' },
]
