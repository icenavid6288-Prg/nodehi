import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { get, type ProductDetail } from '../lib/api'
import { useCompare } from '../context/CompareContext'
import { useCatalog } from '../context/CatalogContext'
import { useCart } from '../context/CartContext'
import { price, toFa } from '../lib/format'
import { useNoindex } from '../lib/seo'
import { CartIcon, CategoryIcon, CloseIcon, CompareIcon, StarIcon } from '../components/icons'

type CompareProduct = ProductDetail

export default function Compare() {
  const { slugs, remove, clear } = useCompare()
  const { brandName, categoryName } = useCatalog()
  const { add } = useCart()
  const [items, setItems] = useState<CompareProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useNoindex('مقایسهٔ محصولات', '/compare')

  useEffect(() => {
    if (slugs.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    get<{ items: CompareProduct[] }>(`/products/by-slugs?slugs=${encodeURIComponent(slugs.join(','))}`)
      .then((data) => {
        if (active) setItems(data.items)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت محصولات مقایسه ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slugs])

  /** اتحاد برچسب‌های مشخصات، به ترتیب اولین ظهور، تا جدول همه را نشان دهد. */
  const specLabels = useMemo(() => {
    const labels: string[] = []
    items.forEach((item) => {
      item.specs.forEach((spec) => {
        if (!labels.includes(spec.label)) labels.push(spec.label)
      })
    })
    return labels
  }, [items])

  const cheapest = useMemo(() => {
    const priced = items.filter((item) => item.price > 0)
    if (priced.length < 2) return null
    return Math.min(...priced.map((item) => item.price))
  }, [items])

  const bestRating = useMemo(() => {
    if (items.length < 2) return null
    const best = Math.max(...items.map((item) => item.rating))
    return best > 0 ? best : null
  }, [items])

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            <CompareIcon className="h-6 w-6 text-secondary-dark" />
            مقایسهٔ محصولات
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {items.length > 0 ? `${toFa(items.length)} کالا در حال مقایسه` : 'کالاهایی که می‌خواهید کنار هم بسنجید را انتخاب کنید.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="rounded-xl border border-surface-border bg-white px-4 py-2 text-xs font-bold text-ink-muted hover:border-danger/40 hover:text-danger"
            >
              پاک‌کردن همه
            </button>
          )}
          <Link to="/shop" className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-light">
            افزودن کالا
          </Link>
        </div>
      </div>

      {error && <p className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</p>}

      {loading && <div className="h-64 animate-pulse rounded-2xl bg-white shadow-card" />}

      {!loading && items.length === 0 && (
        <div className="rounded-3xl border border-dashed border-surface-border bg-white p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary/10 text-secondary-dark">
            <CompareIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold">هنوز کالایی برای مقایسه انتخاب نشده</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-muted">
            روی دکمهٔ مقایسه در کارت هر محصول (یا صفحهٔ محصول) بزنید تا حداکثر چهار کالا کنار هم بررسی شوند.
          </p>
          <Link to="/shop" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
            رفتن به فروشگاه
          </Link>
        </div>
      )}

      {!loading && items.length > 0 && items.length < 2 && (
        <p className="mb-4 rounded-2xl bg-amber-50 p-3 text-xs leading-6 text-amber-700">
          برای مقایسهٔ واقعی، دست‌کم یک کالای دیگر هم انتخاب کنید.
        </p>
      )}

      {!loading && items.length > 0 && (
        <div className="overflow-x-auto rounded-3xl border border-surface-border bg-white shadow-card">
          <table className="w-full min-w-[640px] border-collapse text-right text-xs">
            <caption className="sr-only">جدول مقایسهٔ مشخصات محصولات</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky right-0 z-10 w-32 border-b border-surface-border bg-white p-3 text-[11px] font-bold text-ink-subtle">
                  مشخصات
                </th>
                {items.map((item) => (
                  <th key={item.slug} scope="col" className="min-w-[190px] border-b border-r border-surface-border p-3 align-top">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => remove(item.slug)}
                        aria-label={`حذف ${item.name} از مقایسه`}
                        className="absolute -left-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-surface-border bg-white text-ink-subtle hover:border-danger/40 hover:text-danger"
                      >
                        <CloseIcon className="h-3 w-3" />
                      </button>

                      <Link to={`/product/${item.slug}`} className="block">
                        <span className="mb-2 grid h-24 place-items-center rounded-2xl bg-surface-muted p-2">
                          {item.images[0] ? (
                            <img src={item.images[0]} alt={item.name} className="h-full w-full object-contain" loading="lazy" />
                          ) : (
                            <CategoryIcon name={item.category} className="h-9 w-9 text-primary/30" />
                          )}
                        </span>
                        <span className="line-clamp-2 block text-[13px] font-bold leading-6 hover:text-primary">
                          {item.name}
                        </span>
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          add(
                            {
                              slug: item.slug,
                              name: item.name,
                              price: item.price,
                              image: item.images[0] ?? null,
                              stock: item.stock,
                            },
                            1,
                          )
                        }
                        disabled={!item.inStock}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-[11px] font-bold text-white hover:bg-primary-light disabled:bg-surface-border disabled:text-ink-subtle"
                      >
                        <CartIcon className="h-3.5 w-3.5" />
                        {item.inStock ? 'افزودن به سبد' : 'ناموجود'}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <Row label="قیمت" cells={items.map((item) => (
                <div key={item.slug} className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-sm font-extrabold text-primary">{price(item.price)}</span>
                  <span className="text-[10px] text-ink-muted">تومان</span>
                  {item.compareAtPrice && item.compareAtPrice > item.price && (
                    <span className="text-[10px] text-ink-subtle line-through">{price(item.compareAtPrice)}</span>
                  )}
                  {cheapest !== null && item.price === cheapest && (
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      کمترین قیمت
                    </span>
                  )}
                </div>
              ))} />

              <Row label="امتیاز" cells={items.map((item) => (
                <span key={item.slug} className="flex flex-wrap items-center gap-1">
                  <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span className="font-bold">{toFa(item.rating.toFixed(1))}</span>
                  <span className="text-[10px] text-ink-subtle">({toFa(item.reviewCount)} نظر)</span>
                  {bestRating !== null && item.rating === bestRating && (
                    <span className="rounded-md bg-secondary/10 px-1.5 py-0.5 text-[10px] font-bold text-secondary-dark">
                      بالاترین امتیاز
                    </span>
                  )}
                </span>
              ))} />

              <Row label="موجودی" cells={items.map((item) => (
                <span key={item.slug} className={item.inStock ? 'font-bold text-success' : 'font-bold text-danger'}>
                  {item.inStock ? `موجود (${toFa(item.stock)} عدد)` : 'ناموجود'}
                </span>
              ))} />

              <Row label="برند" cells={items.map((item) => <span key={item.slug}>{brandName(item.brand)}</span>)} />
              <Row label="دسته‌بندی" cells={items.map((item) => <span key={item.slug}>{categoryName(item.category)}</span>)} />

              {specLabels.map((label) => (
                <Row
                  key={label}
                  label={label}
                  cells={items.map((item) => {
                    const spec = item.specs.find((row) => row.label === label)
                    return (
                      <span key={item.slug} className={spec ? '' : 'text-ink-subtle'}>
                        {spec?.value || '—'}
                      </span>
                    )
                  })}
                />
              ))}

              {items.some((item) => item.highlights.length > 0) && (
                <Row label="ویژگی‌ها" cells={items.map((item) => (
                  <ul key={item.slug} className="grid gap-1 text-[11px] leading-5 text-ink-muted">
                    {item.highlights.length === 0 && <li>—</li>}
                    {item.highlights.map((highlight) => (
                      <li key={highlight} className="flex gap-1">
                        <span className="text-secondary-dark">•</span>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                ))} />
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Row({ label, cells }: { label: string; cells: ReactNode[] }) {
  return (
    <tr className="border-b border-surface-border last:border-0">
      <th
        scope="row"
        className="sticky right-0 z-10 bg-white p-3 text-right align-top text-[11px] font-bold text-ink-subtle"
      >
        {label}
      </th>
      {cells.map((cell, index) => (
        <td key={index} className="border-r border-surface-border p-3 align-top leading-6">
          {cell}
        </td>
      ))}
    </tr>
  )
}
