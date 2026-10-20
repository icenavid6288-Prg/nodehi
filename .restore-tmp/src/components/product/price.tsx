import { cn } from '@/lib/utils/cn'
import { discountPercent, formatNumber, formatPrice, toPersianDigits } from '@/lib/utils/format'

/**
 * نمایش قیمت.
 * قیمت خط‌خورده فقط زمانی نمایش داده می‌شود که تخفیف واقعی وجود داشته باشد.
 */
export function Price({
  price,
  compareAtPrice = null,
  size = 'md',
  className,
}: {
  price: number
  compareAtPrice?: number | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const percent = discountPercent(price, compareAtPrice)
  const priceClass =
    size === 'lg' ? 'text-xl font-extrabold' : size === 'sm' ? 'text-sm font-bold' : 'text-base font-bold'

  if (price <= 0) {
    return (
      <span className={cn('text-sm font-medium text-secondary-dark', className)}>تماس بگیرید</span>
    )
  }

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {percent ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-subtle line-through tabular-nums">
            {formatNumber(compareAtPrice!)}
          </span>
          <span className="rounded-md bg-accent/[0.12] px-1.5 py-0.5 text-[10px] font-bold text-accent-dark">
            {toPersianDigits(percent)}٪
          </span>
        </div>
      ) : null}
      <span className={cn(priceClass, 'text-ink tabular-nums')}>
        {formatNumber(price)}
        <span className="mr-1 text-xs font-normal text-ink-muted">تومان</span>
      </span>
    </div>
  )
}

/** قیمت کل و تعداد — در سبد خرید و تسویه حساب */
export function LineTotal({ price, quantity }: { price: number; quantity: number }) {
  return (
    <span className="text-sm font-bold text-ink tabular-nums">
      {formatPrice(price * quantity)}
    </span>
  )
}
