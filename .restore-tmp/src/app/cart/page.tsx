'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { useStore } from '@/components/providers/store-provider'
import { COUPONS, FREE_SHIPPING_THRESHOLD, lookupCoupon, SHIPPING_COST } from '@/lib/commerce'
import { Button, ButtonLink } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProductsBySlugs } from '@/components/providers/product-lookup'
import { ProductImage } from '@/components/ui/product-image'
import { cn } from '@/lib/utils/cn'
import { formatNumber, formatPrice, toLatinDigits, toPersianDigits } from '@/lib/utils/format'

export default function CartPage() {
  const { cart, cartSubtotal, setQuantity, removeFromCart, clearCart, hydrated, couponCode, setCouponCode } =
    useStore()
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)

  // نام، تصویر و موجودی از دیتابیس می‌آید (مرورگر فقط نامک را نگه می‌دارد)،
  // پس با تغییر قیمت یا حذف کالا در پنل، سبد هم به‌روز می‌شود
  const { products: catalogProducts } = useProductsBySlugs(cart.map((line) => line.slug))

  // کد اعمال‌شده در Provider نگه داشته می‌شود تا هنگام رفتن به تسویه حساب
  // از دست نرود. درصد تخفیف از `lookupCoupon` خوانده می‌شود — همان قاعده‌ای
  // که کمپین را روی سرور تعریف می‌کند (شامل حداقل مبلغ سبد).
  const coupon = couponCode ? lookupCoupon(couponCode, cartSubtotal) : null
  // کد ثبت شده ولی شرطش الان برقرار نیست (مثلاً مبلغ سبد کمتر از حداقل شده)
  const couponBlocked = Boolean(couponCode) && !coupon

  const discount = coupon ? Math.round((cartSubtotal * coupon.percent) / 100) : 0
  const payableAfterDiscount = cartSubtotal - discount
  const shipping = payableAfterDiscount >= FREE_SHIPPING_THRESHOLD || cart.length === 0 ? 0 : SHIPPING_COST
  const total = payableAfterDiscount + shipping
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - payableAfterDiscount)

  function applyCoupon(event: React.FormEvent) {
    event.preventDefault()
    const code = toLatinDigits(couponInput).trim().toUpperCase()
    const found = lookupCoupon(code, cartSubtotal)
    if (!found) {
      setCouponError('این کد تخفیف معتبر نیست، منقضی شده است یا شرط مبلغ سبدش برقرار نیست.')
      return
    }
    setCouponCode(found.code)
    setCouponError(null)
    setCouponInput('')
  }

  const breadcrumbItems = [{ name: 'سبد خرید', path: '/cart' }]

  if (!hydrated) {
    return (
      <div className="container-page py-10">
        <div className="rounded-2xl border border-surface-border bg-white p-12 text-center text-sm text-ink-muted">
          در حال بارگذاری سبد خرید…
        </div>
      </div>
    )
  }

  return (
    <div className="container-page">
      <div className="py-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <h1 className="pb-6 text-xl font-extrabold text-ink sm:text-2xl">سبد خرید شما</h1>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-surface-border bg-white px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-ink-subtle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
              <path d="M3 4h2.2l2.2 11.5h11.2L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9.5" cy="19" r="1.4" />
              <circle cx="17.5" cy="19" r="1.4" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-ink">سبد خرید شما خالی است</p>
            <p className="mt-1.5 max-w-md text-xs leading-6 text-ink-muted">
              محصولات مورد نظر خود را به سبد اضافه کنید تا در این صفحه خلاصه سفارش و هزینه ارسال را ببینید.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/shop" variant="primary" size="sm">
              رفتن به فروشگاه
            </ButtonLink>
            <ButtonLink href="/ready-to-ship" variant="outline" size="sm">
              کالاهای آماده ارسال
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 pb-12 lg:grid-cols-[1fr_380px]">
          {/* فهرست اقلام */}
          <div className="flex flex-col gap-3">
            {remainingForFreeShipping > 0 ? (
              <div className="rounded-2xl border border-secondary/25 bg-secondary/[0.08] px-5 py-4 text-sm text-secondary-dark">
                <p>
                  تنها {formatPrice(remainingForFreeShipping)} تا ارسال رایگان فاصله دارید.
                </p>
                <div
                  className="mt-2.5 h-2 overflow-hidden rounded-full bg-white"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((payableAfterDiscount / FREE_SHIPPING_THRESHOLD) * 100)}
                >
                  <span
                    className="block h-full rounded-full bg-secondary transition-all"
                    style={{ width: `${Math.min(100, (payableAfterDiscount / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}

            <ul className="flex flex-col gap-3">
              {cart.map((line) => {
                const product = catalogProducts.find((item) => item.slug === line.slug)
                const category = product?.category ?? 'small-appliance'

                return (
                  <li
                    key={line.productId}
                    className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-white p-4 sm:flex-row sm:items-center"
                  >
                    <Link href={`/product/${line.slug}`} className="shrink-0" aria-label={line.name}>
                      <ProductImage
                        src={product?.images[0]}
                        alt={line.name}
                        category={category}
                        sizes="96px"
                        className="h-24 w-24 rounded-xl"
                        iconClassName="h-10 w-10"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <h2 className="text-sm font-bold leading-6">
                        <Link href={`/product/${line.slug}`} className="text-ink transition-colors hover:text-primary">
                          {line.name}
                        </Link>
                      </h2>
                      {line.readyToShip ? (
                        <span className="w-fit rounded-full bg-secondary/[0.12] px-2.5 py-1 text-[10px] font-medium text-secondary-dark">
                          آماده ارسال همان روز
                        </span>
                      ) : (
                        <span className="w-fit rounded-full bg-surface-muted px-2.5 py-1 text-[10px] text-ink-muted">
                          ارسال ۲ تا ۴ روز کاری
                        </span>
                      )}
                      <p className="text-xs text-ink-muted">{formatPrice(line.price)} × {toPersianDigits(line.quantity)}</p>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <div className="flex items-center rounded-xl border border-surface-border">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          disabled={line.maxStock > 0 && line.quantity >= line.maxStock}
                          aria-label={`افزایش تعداد ${line.name}`}
                          className="flex h-9 w-9 items-center justify-center text-lg text-ink transition-colors hover:bg-surface-muted disabled:opacity-40"
                        >
                          +
                        </button>
                        <span className="w-9 text-center text-sm font-bold tabular-nums">
                          {toPersianDigits(line.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          disabled={line.quantity <= 1}
                          aria-label={`کاهش تعداد ${line.name}`}
                          className="flex h-9 w-9 items-center justify-center text-lg text-ink transition-colors hover:bg-surface-muted disabled:opacity-40"
                        >
                          −
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-ink tabular-nums">
                          {formatNumber(line.price * line.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(line.productId)}
                          aria-label={`حذف ${line.name} از سبد`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4">
                            <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-ink-muted transition-colors hover:text-danger"
              >
                حذف همه اقلام سبد
              </button>
              <ButtonLink href="/shop" variant="link" size="sm">
                ادامه خرید ←
              </ButtonLink>
            </div>
          </div>

          {/* خلاصه سفارش */}
          <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-32">
            <div className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold text-ink">خلاصه سفارش</h2>

              <form onSubmit={applyCoupon} className="flex flex-col gap-2">
                <label htmlFor="coupon" className="text-xs text-ink-muted">
                  کد تخفیف دارید؟
                </label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    dir="ltr"
                    className="text-left uppercase"
                    value={couponInput}
                    onChange={(event) => {
                      setCouponInput(event.target.value)
                      setCouponError(null)
                    }}
                    placeholder="NODEHI10"
                    aria-describedby="coupon-status"
                  />
                  <Button type="submit" variant="outline" size="md" className="shrink-0">
                    اعمال
                  </Button>
                </div>
                <p id="coupon-status" role="status" aria-live="polite" className="min-h-5 text-xs">
                  {couponError ? (
                    <span className="text-danger">{couponError}</span>
                  ) : coupon && couponCode ? (
                    <span className="flex items-center gap-2 text-success">
                      کد {coupon.code} اعمال شد — {coupon.label}
                      <button
                        type="button"
                        onClick={() => {
                          setCouponCode(null)
                          setCouponError(null)
                        }}
                        className="text-[11px] text-ink-muted underline transition-colors hover:text-danger"
                      >
                        حذف کد
                      </button>
                    </span>
                  ) : couponBlocked ? (
                    <span className="text-amber-700">
                      شرط این کد تخفیف برقرار نیست؛ مبلغ سبد را بررسی کنید یا کد را حذف کنید.
                    </span>
                  ) : null}
                </p>
              </form>

              <dl className="flex flex-col gap-2.5 border-y border-surface-border py-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-muted">جمع کالاها</dt>
                  <dd className="font-medium text-ink tabular-nums">{formatPrice(cartSubtotal)}</dd>
                </div>
                {discount > 0 && coupon ? (
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-muted">تخفیف ({toPersianDigits(coupon.percent)}٪)</dt>
                    <dd className="font-medium text-success tabular-nums">− {formatPrice(discount)}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <dt className="text-ink-muted">هزینه ارسال</dt>
                  <dd className={cn('font-medium tabular-nums', shipping === 0 ? 'text-success' : 'text-ink')}>
                    {shipping === 0 ? 'رایگان' : formatPrice(shipping)}
                  </dd>
                </div>
              </dl>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink">مبلغ قابل پرداخت</span>
                <span className="text-base font-extrabold text-primary tabular-nums">{formatPrice(total)}</span>
              </div>

              <ButtonLink href="/checkout" variant="accent" size="lg" className="w-full">
                ادامه فرایند خرید
              </ButtonLink>

              <ul className="flex flex-col gap-1.5 text-[11px] text-ink-muted">
                <li>✓ پرداخت امن از طریق درگاه بانکی</li>
                <li>✓ امکان پرداخت درب منزل</li>
                <li>✓ ۷ روز ضمانت بازگشت کالا</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold text-ink">کدهای تخفیف فعال</h2>
              <ul className="mt-3 flex flex-col gap-2 text-xs">
                {Object.entries(COUPONS).map(([code, value]) => (
                  <li key={code} className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCouponInput(code)
                        setCouponError(null)
                      }}
                      className="ltr-inline rounded-lg border border-dashed border-primary/40 px-2.5 py-1 font-bold text-primary transition-colors hover:bg-primary/[0.06]"
                    >
                      {code}
                    </button>
                    <span className="text-ink-muted">{value.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-5 text-ink-subtle">
                این کدها نمونه هستند و برای محیط نمایشی فعال شده‌اند. کدهای واقعی از پنل مدیریت کمپین‌ها مدیریت
                می‌شوند.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
