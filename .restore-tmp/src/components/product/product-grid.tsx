import { ProductCard } from '@/components/product/product-card'
import { ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import type { Product } from '@/types'

export function ProductGrid({
  products,
  className,
  columns = 'default',
  priorityCount = 0,
  emptyTitle = 'محصولی با این مشخصات پیدا نشد',
  emptyDescription = 'فیلترها را تغییر دهید یا عبارت جستجو را ساده‌تر کنید.',
}: {
  products: Product[]
  className?: string
  columns?: 'default' | 'wide' | 'compact'
  priorityCount?: number
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-surface-border bg-white px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-ink-subtle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-7 w-7">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
        </span>
        <p className="text-sm font-bold text-ink">{emptyTitle}</p>
        <p className="max-w-sm text-xs leading-5 text-ink-muted">{emptyDescription}</p>
        <ButtonLink href="/shop" variant="outline" size="sm" className="mt-1">
          مشاهده همه محصولات
        </ButtonLink>
      </div>
    )
  }

  const columnClass =
    columns === 'wide'
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : columns === 'compact'
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'

  return (
    <div className={cn('grid gap-3 sm:gap-4', columnClass, className)}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
          compact={columns === 'compact'}
        />
      ))}
    </div>
  )
}
