import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/** حداکثر کالاهایی که هم‌زمان مقایسه می‌شوند؛ هم‌راستا با سقف API. */
export const COMPARE_MAX = 4

const STORAGE_KEY = 'nodehi.compare.v1'

type CompareContextValue = {
  slugs: string[]
  count: number
  has: (slug: string) => boolean
  add: (slug: string) => void
  remove: (slug: string) => void
  toggle: (slug: string) => void
  clear: () => void
  isFull: boolean
}

const CompareContext = createContext<CompareContextValue | null>(null)

function readCompare(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []

    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((slug): slug is string => typeof slug === 'string' && slug !== '')
      .slice(0, COMPARE_MAX)
  } catch {
    return []
  }
}

/**
 * سبد مقایسهٔ محصولات.
 *
 * فقط نامک‌ها در حافظهٔ مرورگر نگه‌داری می‌شوند و جزئیات از
 * `/api/products/by-slugs` خوانده می‌شود؛ بنابراین قیمت و موجودی همیشه تازه است.
 */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>(readCompare)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  }, [slugs])

  const toggle = useCallback((slug: string) => {
    setSlugs((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug)
      if (current.length >= COMPARE_MAX) return current
      return [...current, slug]
    })
  }, [])

  const value = useMemo<CompareContextValue>(
    () => ({
      slugs,
      count: slugs.length,
      has: (slug) => slugs.includes(slug),
      add: (slug) =>
        setSlugs((current) =>
          current.includes(slug) || current.length >= COMPARE_MAX ? current : [...current, slug],
        ),
      remove: (slug) => setSlugs((current) => current.filter((item) => item !== slug)),
      toggle,
      clear: () => setSlugs([]),
      isFull: slugs.length >= COMPARE_MAX,
    }),
    [slugs, toggle],
  )

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
}

export function useCompare(): CompareContextValue {
  const context = useContext(CompareContext)
  if (!context) throw new Error('useCompare باید داخل CompareProvider استفاده شود')
  return context
}
