import { Link } from 'react-router-dom'
import type { ProductSummary } from '../lib/api'
import { percent, price, toFa } from '../lib/format'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { useCompare } from '../context/CompareContext'
import { CartIcon, CategoryIcon, CompareIcon, ShieldIcon, StarIcon, TruckIcon } from './icons'

/** ستاره‌های امتیاز؛ نیم‌ستاره با گرادیان نمایش داده می‌شود. */
function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, rating - index))
        return (
          <span key={index} className="relative inline-block h-3.5 w-3.5">
            <StarIcon className="absolute inset-0 h-3.5 w-3.5 text-surface-border" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarIcon className="h-3.5 w-3.5 text-amber-400" />
            </span>
          </span>
        )
      })}
    </span>
  )
}

export default function ProductCard({ product }: { product: ProductSummary }) {
  const { add } = useCart()
  const { brandName, categoryName } = useCatalog()
  const { has, toggle, isFull } = useCompare()
  const image = product.images[0]
  const selected = has(product.slug)
  const compareDisabled = !selected && isFull

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-surface-border bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:border-secondary/40 hover:shadow-float">
      <div className="relative overflow-hidden bg-gradient-to-b from-surface-muted via-white to-white">
        <Link
          to={`/product/${product.slug}`}
          aria-label={product.name}
          className="block aspect-[4/3] w-full p-4 sm:p-5"
        >
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-contain transition duration-500 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            // کالاهای بدون تصویر: آیکون دسته و نام برند به‌جای حروف بزرگ و بی‌معنی
            <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/[0.05] via-white to-secondary/10">
              <span aria-hidden="true" className="absolute h-24 w-24 rounded-full bg-secondary/10 blur-2xl" />
              <CategoryIcon name={product.category} className="relative h-12 w-12 text-primary/25 sm:h-14 sm:w-14" />
              <span className="relative text-[10px] font-bold tracking-wide text-primary/45 sm:text-[11px]">
                {brandName(product.brand)}
              </span>
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute right-2.5 top-2.5 flex flex-col items-end gap-1.5 sm:right-3 sm:top-3">
          {product.discountPercent > 0 && (
            <span className="rounded-lg bg-accent px-2 py-1 text-[10px] font-extrabold text-white shadow-sm sm:text-[11px]">
              {percent(product.discountPercent)} تخفیف
            </span>
          )}
          {product.readyToShip && (
            <span className="rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold text-success shadow-sm ring-1 ring-success/15 sm:text-[11px]">
              آماده ارسال
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggle(product.slug)}
          disabled={compareDisabled}
          aria-pressed={selected}
          aria-label={selected ? `حذف ${product.name} از مقایسه` : `افزودن ${product.name} به مقایسه`}
          title={compareDisabled ? 'حداکثر ۴ کالا هم‌زمان مقایسه می‌شوند' : 'افزودن به مقایسه'}
          className={`absolute left-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-xl border backdrop-blur transition sm:left-3 sm:top-3 ${
            selected
              ? 'border-secondary bg-secondary text-secondary-foreground shadow-sm'
              : 'border-surface-border bg-white/90 text-ink-muted hover:border-secondary hover:text-secondary-dark'
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <CompareIcon className="h-4 w-4" />
        </button>

        {!product.inStock && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/55 backdrop-blur-[1px]">
            <span className="rounded-xl bg-primary-dark/85 px-4 py-2 text-xs font-extrabold text-white">
              ناموجود
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-[10px] text-ink-subtle sm:text-[11px]">
          <Link to={`/brand/${product.brand}`} className="truncate font-bold hover:text-primary">
            {brandName(product.brand)}
          </Link>
          <Link to={`/category/${product.category}`} className="truncate hover:text-primary">
            {categoryName(product.category)}
          </Link>
        </div>

        <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-bold leading-5 sm:min-h-[3rem] sm:text-sm sm:leading-6">
          <Link to={`/product/${product.slug}`} className="transition hover:text-primary">
            {product.name}
          </Link>
        </h3>

        <div className="flex items-center gap-1.5">
          <RatingStars rating={product.rating} />
          <span className="text-[11px] font-bold text-ink">{toFa(product.rating.toFixed(1))}</span>
          <span className="text-[10px] text-ink-subtle">({toFa(product.reviewCount)})</span>
        </div>

        <div className="mt-auto space-y-2 pt-2">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <div className="text-[10px] text-ink-subtle line-through sm:text-[11px]">
                  {price(product.compareAtPrice)}
                </div>
              )}
              <div className="flex flex-wrap items-baseline gap-1">
                <span className="text-sm font-extrabold text-primary sm:text-base">{price(product.price)}</span>
                <span className="text-[10px] font-medium text-ink-muted sm:text-[11px]">تومان</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                add(
                  {
                    slug: product.slug,
                    name: product.name,
                    price: product.price,
                    image: product.images[0] ?? null,
                    stock: product.stock,
                  },
                  1,
                )
              }
              disabled={!product.inStock}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-2.5 text-[11px] font-bold text-white transition hover:bg-primary-light disabled:cursor-not-allowed disabled:bg-surface-border disabled:text-ink-subtle sm:h-10 sm:px-3 sm:text-xs"
              aria-label={`افزودن ${product.name} به سبد خرید`}
            >
              <CartIcon className="h-4 w-4" />
              <span className="hidden sm:inline">افزودن</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-surface-border pt-2 text-[10px] text-ink-subtle">
            <span className="flex items-center gap-1">
              <ShieldIcon className="h-3.5 w-3.5 text-secondary-dark" />
              گارانتی اصالت
            </span>
            {product.inStock && (
              <span className="flex items-center gap-1">
                <TruckIcon className="h-3.5 w-3.5 text-secondary-dark" />
                ارسال سریع
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
