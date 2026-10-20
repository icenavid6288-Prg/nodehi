import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { get, type Brand, type Category } from '../lib/api'

type CatalogContextValue = {
  categories: Category[]
  brands: Brand[]
  categoryName: (slug: string) => string
  brandName: (slug: string) => string
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])

  useEffect(() => {
    Promise.all([get<{ items: Category[] }>('/categories'), get<{ items: Brand[] }>('/brands')])
      .then(([categoryData, brandData]) => {
        setCategories(categoryData.items)
        setBrands(brandData.items)
      })
      .catch(() => {
        setCategories([])
        setBrands([])
      })
  }, [])

  const value = useMemo<CatalogContextValue>(() => {
    const categoryMap = new Map(categories.map((item) => [item.slug, item.name]))
    const brandMap = new Map(brands.map((item) => [item.slug, item.name]))

    return {
      categories,
      brands,
      categoryName: (slug) => categoryMap.get(slug) ?? slug,
      brandName: (slug) => brandMap.get(slug) ?? slug,
    }
  }, [categories, brands])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext)
  if (!context) throw new Error('useCatalog باید داخل CatalogProvider استفاده شود')
  return context
}
