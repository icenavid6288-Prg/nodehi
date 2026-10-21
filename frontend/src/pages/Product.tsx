import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { get, post, type ProductDetail, type ProductSummary } from '../lib/api'
import { useCatalog } from '../context/CatalogContext'
import { useCart } from '../context/CartContext'
import ProductCard from '../components/ProductCard'
import { CheckIcon, StarIcon, TruckIcon } from '../components/icons'
import { percent, price, toFa } from '../lib/format'
import { productMeta, usePageMeta } from '../lib/seo'

type DetailResponse = { product: ProductDetail; related: ProductSummary[] }
type ReviewRow = { id: number; author: string; rating: number; title: string; body: string; created_at: string }

export default function Product() {
  const { slug = '' } = useParams()
  const { brandName, categoryName } = useCatalog()
  const { add } = useCart()
  const [data, setData] = useState<DetailResponse | null>(null)
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const seoProduct = data?.product
  // متادیتای کامل (Product + Breadcrumb + WebPage در JSON-LD) از هستهٔ مشترک
  // سئو می‌آید تا صفحهٔ ایستای همین محصول عنوان و دادهٔ یکسانی داشته باشد.
  usePageMeta(
    seoProduct
      ? productMeta({
          slug: seoProduct.slug,
          name: seoProduct.name,
          shortDescription: seoProduct.shortDescription,
          description: seoProduct.description,
          price: seoProduct.price,
          compareAtPrice: seoProduct.compareAtPrice,
          stock: seoProduct.stock,
          rating: seoProduct.rating,
          reviewCount: seoProduct.reviewCount,
          images: seoProduct.images,
          brand: brandName(seoProduct.brand),
          category: { name: categoryName(seoProduct.category), slug: seoProduct.category },
        })
      : {
          title: 'صفحهٔ محصول | نودهی',
          description: 'مشخصات، قیمت و موجودی این کالا در فروشگاه نودهی.',
          path: `/product/${slug}`,
          robots: error ? 'noindex' : 'index',
        },
  )

  useEffect(() => {
    setLoading(true)
    setError(null)
    get<DetailResponse>(`/products/${slug}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'محصول یافت نشد'))
      .finally(() => setLoading(false))

    get<{ items: ReviewRow[] }>(`/products/${slug}/reviews`)
      .then((result) => setReviews(result.items))
      .catch(() => setReviews([]))
  }, [slug])

  if (loading) {
    return (
      <div className="container-page grid gap-8 py-10 md:grid-cols-2">
        <div className="h-96 animate-pulse rounded-2xl bg-white shadow-card" />
        <div className="h-96 animate-pulse rounded-2xl bg-white shadow-card" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-lg font-bold">محصول پیدا نشد</p>
        <p className="mt-2 text-sm text-ink-muted">{error}</p>
        <Link to="/shop" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
          بازگشت به فروشگاه
        </Link>
      </div>
    )
  }

  const { product, related } = data
  const image = product.images[0]

  return (
    <div className="container-page py-8">
      <nav className="mb-5 text-xs text-ink-subtle" aria-label="مسیر صفحه">
        <Link to="/" className="hover:text-primary">خانه</Link> /{' '}
        <Link to={`/category/${product.category}`} className="hover:text-primary">
          {categoryName(product.category)}
        </Link>{' '}
        / <span className="text-ink-muted">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card">
            <div className="relative aspect-square bg-gradient-to-br from-primary/5 to-secondary/10">
              {image ? (
                <img src={image} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center">
                  <span className="text-6xl font-black text-primary/20">{brandName(product.brand).slice(0, 2)}</span>
                </div>
              )}
              {product.discountPercent > 0 && (
                <span className="absolute right-4 top-4 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white">
                  {percent(product.discountPercent)} تخفیف
                </span>
              )}
            </div>
          </div>

          {product.highlights.length > 0 && (
            <div className="mt-6 rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="mb-3 text-sm font-extrabold">ویژگی‌های کلیدی</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {product.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink-muted">
                    <span className="mt-0.5 text-success">
                      <CheckIcon />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="mb-3 text-sm font-extrabold">توضیحات محصول</h2>
            <p className="text-sm leading-7 text-ink-muted">{product.description}</p>
          </div>

          {product.specs.length > 0 && (
            <div className="mt-6 rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="mb-3 text-sm font-extrabold">مشخصات فنی</h2>
              <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {product.specs.map((spec) => (
                  <div key={`${spec.label}-${spec.value}`} className="flex justify-between gap-4 border-b border-dashed border-surface-border py-2 text-sm last:border-0">
                    <dt className="text-ink-subtle">{spec.label}</dt>
                    <dd className="font-medium">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="mb-3 text-sm font-extrabold">نظرات کاربران ({toFa(reviews.length)})</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-ink-muted">هنوز نظری برای این کالا ثبت نشده است.</p>
            ) : (
              <ul className="grid gap-3">
                {reviews.map((review) => (
                  <li key={review.id} className="rounded-xl bg-surface-muted p-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-bold">{review.author}</span>
                      <span className="flex items-center gap-1 text-amber-500">
                        <StarIcon />
                        <span className="text-ink">{toFa(review.rating)}</span>
                      </span>
                    </div>
                    <p className="text-sm font-bold">{review.title}</p>
                    <p className="mt-1 text-xs leading-6 text-ink-muted">{review.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
            <div className="mb-1 flex items-center gap-2 text-xs text-ink-subtle">
              <Link to={`/brand/${product.brand}`} className="hover:text-primary">
                {brandName(product.brand)}
              </Link>
              <span>·</span>
              <span>{categoryName(product.category)}</span>
            </div>

            <h1 className="text-xl font-extrabold leading-8">{product.name}</h1>

            <div className="mt-2 flex items-center gap-2 text-amber-500">
              <StarIcon />
              <span className="text-sm font-bold text-ink">{toFa(product.rating.toFixed(1))}</span>
              <span className="text-xs text-ink-subtle">({toFa(product.reviewCount)} نظر)</span>
            </div>

            <p className="mt-3 text-sm leading-6 text-ink-muted">{product.shortDescription}</p>

            <div className="mt-5 rounded-xl bg-surface-muted p-4">
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <div className="text-xs text-ink-subtle line-through">{price(product.compareAtPrice)} تومان</div>
              )}
              <div className="text-2xl font-extrabold text-primary">
                {price(product.price)} <span className="text-sm font-medium text-ink-muted">تومان</span>
              </div>
              <p className={`mt-1 text-xs font-bold ${product.inStock ? 'text-success' : 'text-danger'}`}>
                {product.inStock ? `موجود در انبار (${toFa(product.stock)} عدد)` : 'ناموجود'}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-surface-border">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="h-10 w-10 text-lg text-ink-muted"
                  aria-label="کاهش تعداد"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-bold">{toFa(quantity)}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(value + 1, Math.max(product.stock, 1)))}
                  className="h-10 w-10 text-lg text-ink-muted"
                  aria-label="افزایش تعداد"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                disabled={!product.inStock}
                onClick={() =>
                  add(
                    {
                      slug: product.slug,
                      name: product.name,
                      price: product.price,
                      image: product.images[0] ?? null,
                      stock: product.stock,
                    },
                    quantity
                  )
                }
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-extrabold text-white transition hover:bg-primary-light disabled:cursor-not-allowed disabled:bg-surface-border disabled:text-ink-subtle"
              >
                افزودن به سبد خرید
              </button>
            </div>

            <ul className="mt-5 grid gap-2 border-t border-surface-border pt-4 text-xs text-ink-muted">
              <li className="flex items-center gap-2">
                <TruckIcon className="h-4 w-4" /> ارسال همان‌روز برای سفارش‌های قبل از ساعت ۱۴
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon /> ضمانت اصالت و گارانتی رسمی
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon /> امکان پرداخت در محل
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-extrabold">محصولات مرتبط</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
