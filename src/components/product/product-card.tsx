'use client'

import Link from 'next/link'
import { AddToCartButton, CompareButton, WishlistButton } from '@/components/product/actions'
import { Price } from '@/components/product/price'
import { Badge, DiscountBadge } from '@/components/ui/badge'
import { ProductImage } from '@/components/ui/product-image'
import { Rating } from '@/components/ui/rating'
import { useCatalogMeta } from '@/components/providers/catalog-provider'
import { cn } from '@/lib/utils/cn'
import { formatRelativeTime } from '@/lib/utils/format'
import type { Product } from '@/types'

const NEW_THRESHOLD_DAYS = 30

function isNew(publishedAt: string): boolean {
  const days = (Date.now() - new Date(publishedAt).getTime()) / 86_400_000
  return days <= NEW_THRESHOLD_DAYS
}

export function ProductCard({
  product,
  className,
  priority = false,
  compact = false,
}: {
  product: Product
  className?: string
  priority?: boolean
  compact?: boolean
}) {
  // نام دسته و برند از دیتابیس می‌آید و از طریق ارائه‌دهندهٔ کاتالوگ به این
  // کامپوننت می‌رسد — کارت محصول هم در صفحه‌های سرور و هم در صفحه‌های کلاینتی
  // (علاقه‌مندی، مقایسه) استفاده می‌شود
  const { getCategory, getBrandName } = useCatalogMeta()
  const category = getCategory(product.category)
  const outOfStock = product.stock <= 0
  const isFresh = isNew(product.publishedAt)

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-float',
        className,
      )}
    >
      {/* تصویر و برچسب‌ها */}
      <div className="relative">
        <Link href={`/product/${product.slug}`} className="block" tabIndex={-1} aria-hidden="true">
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            category={product.category}
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn('w-full', compact ? 'aspect-[4/3]' : 'aspect-square')}
            iconClassName={compact ? 'h-12 w-12' : 'h-16 w-16'}
          />
        </Link>

        <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-start gap-1.5">
          <DiscountBadge price={product.price} compareAtPrice={product.compareAtPrice} />
          {product.attributes.readyToShip && !outOfStock ? (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              آماده ارسال
            </span>
          ) : null}
          {isFresh ? (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              جدید
            </span>
          ) : null}
        </div>

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          <WishlistButton slug={product.slug} />
          <CompareButton slug={product.slug} size="icon" withLabel={false} />
        </div>

        {outOfStock ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/[0.72] backdrop-blur-[1px]">
            <span className="rounded-full border border-surface-border bg-white px-4 py-2 text-sm font-bold text-ink-muted">
              ناموجود
            </span>
          </div>
        ) : null}
      </div>

      {/* اطلاعات */}
      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <Link
            href={`/shop?brand=${product.attributes.brand}`}
            className="font-medium text-primary transition-colors hover:text-accent"
          >
            {getBrandName(product.attributes.brand)}
          </Link>
          {category ? (
            <Link
              href={`/shop?category=${category.slug}`}
              className="text-ink-subtle transition-colors hover:text-primary"
            >
              {category.name}
            </Link>
          ) : null}
        </div>

        <h3 className="text-sm font-bold leading-6">
          <Link
            href={`/product/${product.slug}`}
            className="line-clamp-2 text-ink transition-colors group-hover:text-primary"
          >
            {product.name}
          </Link>
        </h3>

        {!compact ? (
          <p className="line-clamp-2 text-xs leading-5 text-ink-muted">{product.shortDescription}</p>
        ) : null}

        {product.reviewCount > 0 ? (
          <Rating value={product.rating} count={product.reviewCount} size="sm" />
        ) : (
          <span className="text-xs text-ink-subtle">اولین نظر را شما ثبت کنید</span>
        )}

        <div className="mt-auto flex flex-col gap-2.5 pt-1.5">
          <Price price={product.price} compareAtPrice={product.compareAtPrice} />

          <div className="flex flex-wrap items-center gap-1.5">
            {product.attributes.warrantyMonths ? (
              <Badge tone="neutral" className="text-[10px]">
                گارانتی {product.attributes.warrantyMonths} ماهه
              </Badge>
            ) : null}
            {product.attributes.installmentAvailable && product.price > 0 ? (
              <Badge tone="primary" className="text-[10px]">
                اقساطی
              </Badge>
            ) : null}
          </div>

          <AddToCartButton product={product} size="sm" />
        </div>
      </div>
    </article>
  )
}

/** کارت فشرده افقی — مناسب فهرست‌های کنار هم و نتایج جستجو */
export function ProductRow({ product }: { product: Product }) {
  const { getBrandName } = useCatalogMeta()

  return (
    <article className="flex gap-4 rounded-2xl border border-surface-border bg-white p-3 shadow-card transition-colors hover:border-primary/25">
      <Link href={`/product/${product.slug}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          category={product.category}
          sizes="120px"
          className="h-24 w-24 rounded-xl"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="line-clamp-1 text-sm font-bold">
          <Link href={`/product/${product.slug}`} className="text-ink hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="text-xs text-ink-subtle">
          {getBrandName(product.attributes.brand)} · {formatRelativeTime(product.publishedAt)}
        </p>
        <Price price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
      </div>
    </article>
  )
}
