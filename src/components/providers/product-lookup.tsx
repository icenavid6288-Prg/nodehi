'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Product } from '@/types'

/**
 * دریافت محصولات بر اساس نامک، از سرور.
 *
 * سبد خرید، علاقه‌مندی و مقایسه در `localStorage` فقط **نامک** نگه می‌دارند.
 * نام و قیمت و موجودی باید از دیتابیس بیاید؛ نگه‌داشتن قیمت در مرورگر یعنی
 * کاربر می‌تواند قیمت کهنه یا دست‌کاری‌شده ببیند. مزیت جانبی: با تغییر قیمت در
 * پنل، سبد کاربر هم به‌روز می‌شود.
 *
 * یک کش در سطح ماژول نگه داشته می‌شود تا حرکت بین صفحه‌ها هر بار درخواست تازه
 * نزند؛ در ازای آن، قیمت هر بار **بارگذاری صفحه** تازه می‌شود که برای سبد خرید
 * رفتار درستی است.
 */

const cache = new Map<string, Product>()

export interface ProductLookup {
  products: Product[]
  loading: boolean
  error: string
  /** نامک‌هایی که در دیتابیس پیدا نشدند (کالای حذف‌شده) */
  missing: string[]
}

export function useProductsBySlugs(slugs: string[]): ProductLookup {
  // ترتیب نامک‌ها نباید وابستگی افکت را بی‌دلیل عوض کند
  const key = useMemo(() => [...new Set(slugs)].sort().join(','), [slugs])

  const [state, setState] = useState<ProductLookup>(() => ({
    products: [],
    loading: true,
    error: '',
    missing: [],
  }))

  useEffect(() => {
    const wanted = key ? key.split(',') : []
    if (wanted.length === 0) {
      setState({ products: [], loading: false, error: '', missing: [] })
      return
    }

    const missingFromCache = wanted.filter((slug) => !cache.has(slug))
    if (missingFromCache.length === 0) {
      setState({
        products: wanted.map((slug) => cache.get(slug)!).filter(Boolean),
        loading: false,
        error: '',
        missing: [],
      })
      return
    }

    let cancelled = false
    setState((previous) => ({ ...previous, loading: true, error: '' }))

    fetch(`/api/products?slugs=${encodeURIComponent(missingFromCache.join(','))}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        if (!data?.ok) {
          setState({ products: [], loading: false, error: 'دریافت اطلاعات کالاها ناموفق بود.', missing: [] })
          return
        }
        for (const item of data.items as Product[]) cache.set(item.slug, item)
        const products = wanted.map((slug) => cache.get(slug)).filter((p): p is Product => Boolean(p))
        setState({
          products,
          loading: false,
          error: '',
          missing: wanted.filter((slug) => !cache.has(slug)),
        })
      })
      .catch(() => {
        if (cancelled) return
        setState({ products: [], loading: false, error: 'ارتباط با سرور برقرار نشد.', missing: [] })
      })

    return () => {
      cancelled = true
    }
  }, [key])

  return state
}
