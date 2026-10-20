'use client'

import { createContext, useContext, useMemo } from 'react'
import type { CatalogMeta, Category, CategorySlug, Brand } from '@/types'

/**
 * فرادادهٔ کاتالوگ در مرورگر: دسته‌ها، برندها و شمارش‌ها.
 *
 * چرا لازم شد؟ کاتالوگ پیش‌تر یک آرایهٔ ثابت در کد بود و کامپوننت‌های کلاینتی
 * (هدر، فیلتر، کارت محصول) مستقیم از همان فایل می‌خواندند. حالا منبع، دیتابیس
 * است و ماژول‌های دیتابیس هرگز نباید به باندل مرورگر بروند. این ارائه‌دهنده
 * داده را یک‌بار از سرور می‌گیرد و در اختیار همان کامپوننت‌ها می‌گذارد.
 */

interface CatalogContextValue {
  categories: Category[]
  brands: Brand[]
  counts: Record<CategorySlug, number>
  brandNames: Record<string, string>
  categoryNames: Record<string, string>
  getCategory: (slug: string) => Category | undefined
  getBrandName: (slug: string) => string
  popularSlugs: string[]
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogMetaProvider({
  meta,
  children,
}: {
  meta: CatalogMeta
  children: React.ReactNode
}) {
  const value = useMemo<CatalogContextValue>(() => {
    const bySlug = new Map(meta.categories.map((category) => [category.slug, category]))
    return {
      ...meta,
      getCategory: (slug: string) => bySlug.get(slug as CategorySlug),
      getBrandName: (slug: string) => meta.brandNames[slug] ?? slug,
      popularSlugs: meta.popularSlugs,
    }
  }, [meta])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

/**
 * فرادادهٔ کاتالوگ.
 *
 * اگر خارج از ارائه‌دهنده فراخوانی شود، مقدار خالی برمی‌گرداند تا یک اشتباه
 * جای‌گذاری در درخت، کل صفحه را با خطا سفید نکند — برچسب‌ها در بدترین حالت
 * نامک لاتین نشان داده می‌شوند.
 */
export function useCatalogMeta(): CatalogContextValue {
  const context = useContext(CatalogContext)
  if (context) return context

  return {
    categories: [],
    brands: [],
    counts: {} as Record<CategorySlug, number>,
    brandNames: {},
    categoryNames: {},
    getCategory: () => undefined,
    getBrandName: (slug: string) => slug,
    popularSlugs: [],
  }
}
