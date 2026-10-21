import { Link } from 'react-router-dom'
import type { ProductSummary } from '../lib/api'
import { percent, price, toFa } from '../lib/format'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { CartIcon, StarIcon } from './icons'

export default function ProductCard({ product }: { product: ProductSummary }) {
  const { add } = useCart()
  const { brandName, categoryName } = useCatalog()
  const image = product.images[0]

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-float">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
        <Link to={`/product/${product.slug}`} aria-label={product.name}>
          {image ? (
            <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/5 to-secondary/10">
              <span className="text-3xl font-black text-primary/25">{brandName(product.brand).slice(0, 2)}</span>
            </div>
          )}
        </Link>

        {product.discountPercent > 0 && (
          <span className="absolute right-3 top-3 rounded-lg bg-accent px-2 py-1 text-[11px] font-bold text-white">
            {percent(product.discountPercent)} تخفیف
          </span>
        )}
        {product.readyToShip && (
          <span className="absolute bottom-3 right-3 rounded-lg bg-white/95 px-2 py-1 text-[11px] font-bold text-success shadow-sm">
            آماده ارسال
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between text-[11px] text-ink-subtle">
          <Link to={`/brand/${product.brand}`} className="hover:text-primary">
            {brandName(product.brand)}
          </Link>
          <span>{categoryName(product.category)}</span>
        </div>

        <h3 className="min-h-11 text-sm font-bold leading-6">
          <Link to={`/product/${product.slug}`} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>

        <div className="flex items-center gap-1 text-amber-500">
          <StarIcon />
          <span className="text-xs font-bold text-ink">{toFa(product.rating.toFixed(1))}</span>
          <span className="text-[11px] text-ink-subtle">({toFa(product.reviewCount)} نظر)</span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-1">
          <div>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <div className="text-[11px] text-ink-subtle line-through">{price(product.compareAtPrice)}</div>
            )}
            <div className="text-base font-extrabold text-primary">
              {price(product.price)} <span className="text-[11px] font-medium text-ink-muted">تومان</span>
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
                1
              )
            }
            disabled={!product.inStock}
            className="rounded-xl bg-primary p-2.5 text-white transition hover:bg-primary-light disabled:cursor-not-allowed disabled:bg-surface-border disabled:text-ink-subtle"
            aria-label={`افزودن ${product.name} به سبد خرید`}
          >
            <CartIcon />
          </button>
        </div>
      </div>
    </article>
  )
}
