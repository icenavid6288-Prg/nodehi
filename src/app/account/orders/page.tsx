import Link from 'next/link'
import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/button'
import { ProductImage } from '@/components/ui/product-image'
import { productIndex } from '@/lib/server/catalog'
import { orderStatusLabels } from '@/lib/data/orders'
import { buildMetadata } from '@/lib/seo'
import { getCurrentUser } from '@/lib/server/auth/session'
import { getUserOrders } from '@/lib/server/orders'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate, formatPrice, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'سفارش‌های من',
  description: 'پیگیری وضعیت سفارش‌ها، مراحل ارسال و کد رهگیری مرسوله.',
  path: '/account/orders',
  noIndex: true,
})

const statusTone: Record<string, string> = {
  delivered: 'bg-success/10 text-success',
  shipped: 'bg-secondary/[0.12] text-secondary-dark',
  processing: 'bg-amber-50 text-amber-700',
  paid: 'bg-primary/[0.08] text-primary',
  pending: 'bg-surface-muted text-ink-muted',
  cancelled: 'bg-danger/10 text-danger',
}

export default async function AccountOrdersPage() {
  // دسترسی در layout بررسی شده است
  const user = await getCurrentUser()
  if (!user) return null

  const orders = await getUserOrders(user.id)

  // نام و تصویر کالاها از دیتابیس؛ کالای نرم‌حذف‌شده هم می‌آید تا تاریخچهٔ سفارش
  // کاربر ناقص نشود (نام کالا روی خود سفارش هم ذخیره شده است)
  const productBySlug = await productIndex(
    orders.flatMap((order) => order.items.map((item) => item.productSlug)),
    { includeInactive: true },
  )

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">سفارش‌های من</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          وضعیت هر سفارش و مراحل ارسال آن را در این بخش پیگیری کنید. کد رهگیری مرسوله پس از تحویل به شرکت حمل،
          در همین صفحه نمایش داده می‌شود.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-surface-border bg-white px-6 py-16 text-center">
          <p className="text-sm font-bold text-ink">هنوز سفارشی ثبت نکرده‌اید</p>
          <ButtonLink href="/shop" variant="primary" size="sm">
            شروع خرید
          </ButtonLink>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => {
            const itemsTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
            const payable = itemsTotal - order.discount + order.shippingCost

            return (
              <li
                key={order.id}
                id={order.id}
                className="scroll-mt-32 overflow-hidden rounded-2xl border border-surface-border bg-white"
              >
                {/* سربرگ سفارش */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border bg-surface-muted px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="ltr-inline text-sm font-bold text-ink">{order.id}</span>
                    <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-medium', statusTone[order.status])}>
                      {orderStatusLabels[order.status]}
                    </span>
                    <span className="text-xs text-ink-muted">تاریخ ثبت: {formatJalaliDate(order.createdAt)}</span>
                  </div>
                  {order.trackingCode ? (
                    <p className="text-xs text-ink-muted">
                      کد رهگیری: <span className="ltr-inline font-medium text-primary">{order.trackingCode}</span>
                    </p>
                  ) : null}
                </div>

                {/* اقلام */}
                <ul className="divide-y divide-surface-border px-5">
                  {order.items.map((item) => {
                    const product = productBySlug[item.productSlug]
                    return (
                      <li key={item.productSlug} className="flex items-center gap-4 py-4">
                        <Link href={`/product/${item.productSlug}`} className="shrink-0">
                          <ProductImage
                            src={product?.images[0]}
                            alt={item.name}
                            category={product?.category ?? 'small-appliance'}
                            sizes="72px"
                            className="h-16 w-16 rounded-xl"
                            iconClassName="h-7 w-7"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium">
                            <Link href={`/product/${item.productSlug}`} className="text-ink hover:text-primary">
                              {item.name}
                            </Link>
                          </p>
                          <p className="mt-1 text-xs text-ink-subtle">
                            {toPersianDigits(item.quantity)} عدد × {formatPrice(item.price)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                {/* زمان‌بندی و خلاصه */}
                <div className="grid gap-5 border-t border-surface-border px-5 py-5 lg:grid-cols-[1fr_280px]">
                  <div>
                    <h2 className="mb-4 text-xs font-bold text-ink">مراحل سفارش</h2>
                    <ol className="flex flex-col gap-0">
                      {order.timeline.map((entry, index) => (
                        <li key={entry.label} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                entry.done ? 'bg-secondary text-white' : 'bg-surface-muted text-ink-subtle',
                              )}
                            >
                              {entry.done ? '✓' : toPersianDigits(index + 1)}
                            </span>
                            {index < order.timeline.length - 1 ? (
                              <span className={cn('w-px flex-1', entry.done ? 'bg-secondary/40' : 'bg-surface-border')} />
                            ) : null}
                          </div>
                          <div className="pb-4">
                            <p className={cn('text-xs font-medium', entry.done ? 'text-ink' : 'text-ink-subtle')}>
                              {entry.label}
                            </p>
                            <p className="mt-0.5 text-[11px] text-ink-subtle">
                              {entry.date === '—' ? 'در انتظار انجام' : formatJalaliDate(entry.date)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <dl className="flex h-fit flex-col gap-2 rounded-xl bg-surface-muted p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <dt className="text-ink-muted">روش پرداخت</dt>
                      <dd className="font-medium text-ink">{order.paymentMethod}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-ink-muted">روش ارسال</dt>
                      <dd className="font-medium text-ink">{order.shippingMethod}</dd>
                    </div>
                    {order.discount > 0 ? (
                      <div className="flex items-center justify-between">
                        <dt className="text-ink-muted">تخفیف</dt>
                        <dd className="font-medium text-success">− {formatPrice(order.discount)}</dd>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between border-t border-surface-border pt-2">
                      <dt className="font-bold text-ink">مبلغ کل</dt>
                      <dd className="text-sm font-extrabold text-primary tabular-nums">{formatPrice(payable)}</dd>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <ButtonLink href="/contact" variant="outline" size="sm" className="flex-1">
                        پشتیبانی سفارش
                      </ButtonLink>
                      {order.status === 'delivered' ? (
                        <ButtonLink href={`/product/${order.items[0]!.productSlug}#reviews`} variant="primary" size="sm" className="flex-1">
                          ثبت نظر
                        </ButtonLink>
                      ) : null}
                    </div>
                  </dl>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
