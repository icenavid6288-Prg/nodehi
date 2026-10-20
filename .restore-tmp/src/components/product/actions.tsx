'use client'

import { useState } from 'react'
import { useStore } from '@/components/providers/store-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { toPersianDigits } from '@/lib/utils/format'
import type { Product } from '@/types'

/** دکمه افزودن به سبد خرید با انتخاب تعداد و بازخورد لحظه‌ای */
export function AddToCartButton({
  product,
  size = 'md',
  variant = 'accent',
  showQuantity = false,
  className,
  label = 'افزودن به سبد خرید',
}: {
  product: Product
  size?: 'sm' | 'md' | 'lg'
  variant?: 'accent' | 'primary' | 'secondary' | 'outline'
  showQuantity?: boolean
  className?: string
  label?: string
}) {
  const { addToCart } = useStore()
  const [quantity, setQuantity] = useState(1)
  const outOfStock = product.stock <= 0

  if (outOfStock) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Button variant="outline" size={size} disabled className="w-full">
          ناموجود
        </Button>
        <NotifyWhenAvailableButton productName={product.name} />
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {showQuantity ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-muted">تعداد:</span>
          <div className="flex items-center rounded-xl border border-surface-border">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(q + 1, product.stock))}
              disabled={quantity >= product.stock}
              className="flex h-10 w-10 items-center justify-center text-lg text-ink transition-colors hover:bg-surface-muted disabled:opacity-40"
              aria-label="افزایش تعداد"
            >
              +
            </button>
            <span className="w-10 text-center text-sm font-bold tabular-nums">
              {toPersianDigits(quantity)}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-10 w-10 items-center justify-center text-lg text-ink transition-colors hover:bg-surface-muted disabled:opacity-40"
              aria-label="کاهش تعداد"
            >
              −
            </button>
          </div>
          {product.stock <= 5 ? (
            <span className="text-xs text-accent-dark">
              تنها {toPersianDigits(product.stock)} عدد باقی مانده
            </span>
          ) : null}
        </div>
      ) : null}

      <Button
        variant={variant}
        size={size}
        className="w-full"
        onClick={() => addToCart(product, quantity)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path d="M3 4h2.2l2.2 11.5h11.2L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9.5" cy="19" r="1.4" />
          <circle cx="17.5" cy="19" r="1.4" />
        </svg>
        {label}
      </Button>
    </div>
  )
}

/** ثبت درخواست اطلاع از موجود شدن کالا */
export function NotifyWhenAvailableButton({ productName }: { productName: string }) {
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <p className="rounded-xl bg-secondary/10 px-4 py-3 text-center text-xs leading-5 text-secondary-dark">
        به‌محض موجود شدن «{productName}» از طریق پیامک به شما اطلاع می‌دهیم.
      </p>
    )
  }

  return (
    <Button variant="secondary" size="sm" className="w-full" onClick={() => setDone(true)}>
      اطلاع‌دهی هنگام موجود شدن
    </Button>
  )
}

/** افزودن/حذف از مقایسه — با سقف چهار محصول */
export function CompareButton({
  slug,
  size = 'md',
  withLabel = true,
  className,
}: {
  slug: string
  size?: 'sm' | 'md' | 'lg' | 'icon'
  withLabel?: boolean
  className?: string
}) {
  const { toggleCompare, isInCompare, canAddToCompare, maxCompare, compare } = useStore()
  const active = isInCompare(slug)
  const full = !canAddToCompare && !active

  return (
    <button
      type="button"
      onClick={() => toggleCompare(slug)}
      disabled={full}
      aria-pressed={active}
      title={full ? `حداکثر ${toPersianDigits(maxCompare)} محصول را می‌توانید مقایسه کنید` : undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border transition-colors',
        size === 'icon' ? 'h-9 w-9' : size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm',
        active
          ? 'border-secondary bg-secondary/10 text-secondary-dark'
          : 'border-surface-border text-ink-muted hover:border-primary hover:text-primary',
        full && 'cursor-not-allowed opacity-45',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4">
        <path d="M5 4v16M12 4v16M19 4v16" strokeLinecap="round" />
        <path d="M3.5 16.5h3M10.5 9h3M17.5 13h3" strokeLinecap="round" />
      </svg>
      {withLabel ? (active ? 'در مقایسه' : 'مقایسه') : null}
      {active && compare.length > 0 ? (
        <span className="sr-only">این محصول در فهرست مقایسه است</span>
      ) : null}
    </button>
  )
}

/** افزودن/حذف از علاقه‌مندی‌ها */
export function WishlistButton({
  slug,
  size = 'icon',
  className,
}: {
  slug: string
  size?: 'sm' | 'icon'
  className?: string
}) {
  const { toggleWishlist, isInWishlist } = useStore()
  const active = isInWishlist(slug)

  return (
    <button
      type="button"
      onClick={() => toggleWishlist(slug)}
      aria-pressed={active}
      aria-label={active ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border transition-colors',
        size === 'icon' ? 'h-9 w-9' : 'h-9 px-3 text-xs',
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-surface-border text-ink-muted hover:border-accent hover:text-accent',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.7}
        className="h-4 w-4"
      >
        <path d="M12 20s-7-4.5-7-9.5A4 4 0 0112 8a4 4 0 017 2.5c0 5-7 9.5-7 9.5z" strokeLinejoin="round" />
      </svg>
      {size === 'sm' ? (active ? 'ذخیره شد' : 'علاقه‌مندی') : null}
    </button>
  )
}
