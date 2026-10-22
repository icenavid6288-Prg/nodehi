import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { get, type ProductSummary } from '../lib/api'
import { useCatalog } from '../context/CatalogContext'
import ProductCard from '../components/ProductCard'
import { toFa } from '../lib/format'
import { brandMeta, categoryMeta, shopMeta, usePageMeta } from '../lib/seo'

type ProductList = {
  items: ProductSummary[]
  total: number
  page: number
  pageCount: number
  perPage: number
}

const sortOptions = [
  { value: 'relevance', label: 'مرتب‌سازی: پیشنهاد نودهی' },
  { value: 'newest', label: 'جدیدترین' },
  { value: 'price-asc', label: 'ارزان‌ترین' },
  { value: 'price-desc', label: 'گران‌ترین' },
  { value: 'popular', label: 'پرفروش‌ترین' },
  { value: 'discount', label: 'بیشترین تخفیف' },
]

export default function Shop() {
  // مسیرهای /category/:slug و /brand/:slug هم پشتیبانی می‌شوند تا صفحه‌های
  // دسته و برند canonical مستقل و قابل ایندکس داشته باشند.
  const { categorySlug, brandSlug } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { categories, brands } = useCatalog()
  const [data, setData] = useState<ProductList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const q = params.get('q') ?? ''
  const category = categorySlug ?? params.get('category') ?? ''
  const brand = brandSlug ?? params.get('brand') ?? ''
  const sort = params.get('sort') ?? 'relevance'
  const inStock = params.get('inStock') === '1'
  const onSale = params.get('onSale') === '1'
  const page = Number(params.get('page') ?? '1')

  const queryString = useMemo(() => {
    const search = new URLSearchParams()
    if (q) search.set('q', q)
    if (category) search.set('category', category)
    if (brand) search.set('brand', brand)
    if (sort) search.set('sort', sort)
    if (inStock) search.set('inStock', '1')
    if (onSale) search.set('onSale', '1')
    search.set('page', String(page))
    search.set('perPage', '12')
    return search.toString()
  }, [q, category, brand, sort, inStock, onSale, page])

  useEffect(() => {
    setLoading(true)
    setError(null)
    get<ProductList>(`/products?${queryString}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'خطا در دریافت محصولات'))
      .finally(() => setLoading(false))
  }, [queryString])

  function update(key: string, value: string) {
    // دسته و برند به مسیرهای canonical می‌روند تا با /category/:slug و
    // /brand/:slug تداخل نکنند؛ بقیه فیلترها پارامتر باقی می‌مانند.
    if (key === 'category') {
      setParams(value ? new URLSearchParams() : params)
      if (value) navigate(`/category/${value}`)
      else navigate('/shop')
      return
    }
    if (key === 'brand') {
      if (value) navigate(`/brand/${value}`)
      else navigate('/shop')
      return
    }
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const activeCategory = categories.find((item) => item.slug === category)
  const activeBrand = brands.find((item) => item.slug === brand)

  // فقط فهرست دسته/برندِ بدون فیلتر ارزش ایندکس دارد؛ جستجو و فیلترهای
  // ترکیبی محتوای تکراری می‌سازند و noindex می‌شوند.
  const filterCount = [q, inStock, onSale, sort !== 'relevance', page > 1].filter(Boolean).length
  const hasIndexableFilter = filterCount === 0 && !q

  usePageMeta(
    activeCategory && hasIndexableFilter
      ? categoryMeta({
          slug: activeCategory.slug,
          name: activeCategory.name,
          seoIntro: activeCategory.description,
        })
      : activeBrand && hasIndexableFilter
        ? brandMeta({ slug: activeBrand.slug, name: activeBrand.name, description: activeBrand.description })
        : {
            ...shopMeta(),
            title: q ? `جستجو «${q}» | فروشگاه نودهی` : shopMeta().title,
            canonical: undefined,
            path: '/shop',
            robots: hasIndexableFilter ? 'index' : 'noindex',
          },
  )

  return (
    <div className="container-page py-8">
      <nav className="mb-4 text-xs text-ink-subtle" aria-label="مسیر صفحه">
        <span>خانه</span> / <span className="text-ink-muted">{activeCategory?.name ?? 'فروشگاه'}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{activeCategory?.name ?? 'فروشگاه نودهی'}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {activeCategory?.description || 'همه کالاهای موجود با گارانتی و ارسال سریع.'}
            {data && <span className="mr-2 text-ink-subtle">({toFa(data.total)} کالا)</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-surface-border bg-white px-3 py-2 text-xs">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(event) => update('inStock', event.target.checked ? '1' : '')}
            />
            فقط موجود
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-surface-border bg-white px-3 py-2 text-xs">
            <input
              type="checkbox"
              checked={onSale}
              onChange={(event) => update('onSale', event.target.checked ? '1' : '')}
            />
            دارای تخفیف
          </label>
          <select
            value={sort}
            onChange={(event) => update('sort', event.target.value)}
            aria-label="مرتب‌سازی"
            className="rounded-xl border border-surface-border bg-white px-3 py-2 text-xs"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* نوار فیلتر موبایل: دسته‌ها به‌جای ستون بلند، چیپ افقی و برند به‌شکل انتخابگر */}
      <div className="mb-5 space-y-2.5 lg:hidden">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            onClick={() => update('category', '')}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition ${
              !category
                ? 'border-primary bg-primary text-white'
                : 'border-surface-border bg-white text-ink-muted'
            }`}
          >
            همه دسته‌ها
          </button>
          {categories.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => update('category', item.slug)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition ${
                category === item.slug
                  ? 'border-primary bg-primary text-white'
                  : 'border-surface-border bg-white text-ink-muted'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={brand}
            onChange={(event) => update('brand', event.target.value)}
            aria-label="انتخاب برند"
            className="h-10 min-w-0 flex-1 rounded-xl border border-surface-border bg-white px-3 text-xs"
          >
            <option value="">همه برندها</option>
            {brands.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>

          {(category || brand || q || inStock || onSale) && (
            <button
              type="button"
              onClick={() => {
                setParams(new URLSearchParams())
                navigate('/shop')
              }}
              className="shrink-0 rounded-xl border border-danger/30 px-3 text-xs font-bold text-danger"
            >
              حذف فیلترها
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="order-1 hidden space-y-4 lg:block">
          <div className="rounded-2xl border border-surface-border bg-white p-4">
            <h2 className="mb-3 text-sm font-bold">دسته‌بندی</h2>
            <ul className="grid gap-1 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => update('category', '')}
                  className={`w-full rounded-lg px-2 py-1.5 text-right hover:bg-surface-muted ${!category ? 'font-bold text-primary' : 'text-ink-muted'}`}
                >
                  همه دسته‌ها
                </button>
              </li>
              {categories.map((item) => (
                <li key={item.slug}>
                <button
                  type="button"
                  onClick={() => update('category', item.slug)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-muted ${category === item.slug ? 'font-bold text-primary' : 'text-ink-muted'}`}
                  >
                    <span>{item.name}</span>
                    <span className="text-[11px] text-ink-subtle">{toFa(item.count)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-surface-border bg-white p-4">
            <h2 className="mb-3 text-sm font-bold">برند</h2>
            <ul className="grid max-h-72 gap-1 overflow-y-auto text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => update('brand', '')}
                  className={`w-full rounded-lg px-2 py-1.5 text-right hover:bg-surface-muted ${!brand ? 'font-bold text-primary' : 'text-ink-muted'}`}
                >
                  همه برندها
                </button>
              </li>
              {brands.map((item) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    onClick={() => update('brand', item.slug)}
                    className={`w-full rounded-lg px-2 py-1.5 text-right hover:bg-surface-muted ${brand === item.slug ? 'font-bold text-primary' : 'text-ink-muted'}`}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="order-1 lg:order-2">
          {error && (
            <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</div>
          )}

          {loading && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-72 animate-pulse rounded-3xl bg-white shadow-card" />
              ))}
            </div>
          )}

          {!loading && data && data.items.length === 0 && (
            <div className="rounded-2xl border border-surface-border bg-white p-10 text-center">
              <p className="text-sm text-ink-muted">کالایی با این فیلترها پیدا نشد.</p>
              <button
                type="button"
                onClick={() => setParams(new URLSearchParams())}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
              >
                حذف فیلترها
              </button>
            </div>
          )}

          {!loading && data && data.items.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {data.items.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>

              {data.pageCount > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {Array.from({ length: data.pageCount }).map((_, index) => {
                    const number = index + 1
                    return (
                      <button
                        key={number}
                        type="button"
                        onClick={() => update('page', String(number))}
                        className={`h-9 min-w-9 rounded-lg px-2 text-sm font-bold ${
                          number === data.page
                            ? 'bg-primary text-white'
                            : 'border border-surface-border bg-white text-ink-muted hover:border-secondary'
                        }`}
                      >
                        {toFa(number)}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
