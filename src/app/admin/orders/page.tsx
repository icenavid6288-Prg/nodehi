import Link from 'next/link'
import type { Metadata } from 'next'
import { OrderStatusControl } from '@/components/admin/order-status-control'
import { prisma } from '@/lib/db'
import { buildMetadata } from '@/lib/seo'
import { canMutate, getStaffUser } from '@/lib/server/admin'
import { paymentMethodLabel } from '@/lib/server/orders'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDateTime, formatPrice, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'مدیریت سفارش‌ها',
  description: 'مشاهده و تغییر وضعیت سفارش‌های فروشگاه نودهی.',
  path: '/admin/orders',
  noIndex: true,
})

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string }
}) {
  const staff = await getStaffUser()
  const readOnly = !staff || !canMutate(staff.role)

  const statusFilter = searchParams.status
  const validFilter =
    statusFilter && ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'].includes(statusFilter)
      ? statusFilter
      : undefined

  const search = (searchParams.q ?? '').trim()

  const orders = await prisma.order.findMany({
    where: {
      ...(validFilter ? { status: validFilter } : {}),
      // جست‌وجو روی شماره سفارش، نام گیرنده و شماره همراه — سه راه رایج یافتن یک سفارش
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search } },
              { customerPhone: { contains: search } },
              { customerFirstName: { contains: search } },
              { customerLastName: { contains: search } },
              { trackingCode: { contains: search } },
            ],
          }
        : {}),
    },
    include: { items: true, user: { select: { phone: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })

  const tabs = [
    { label: 'همه', value: '' },
    { label: 'در انتظار پرداخت', value: 'pending' },
    { label: 'پرداخت‌شده', value: 'paid' },
    { label: 'در حال پردازش', value: 'processing' },
    { label: 'ارسال‌شده', value: 'shipped' },
    { label: 'تحویل‌شده', value: 'delivered' },
    { label: 'لغو‌شده', value: 'cancelled' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">سفارش‌ها</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          وضعیت هر سفارش را از همین‌جا تغییر دهید. هر تغییر در لاگ حسابرسی با نام کاربر شما ثبت می‌شود.
          {readOnly ? ' نقش شما فقط اجازه مشاهده دارد.' : ''}
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-center gap-3 rounded-2xl border border-surface-border bg-white p-4">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5">
          <span className="text-xs text-ink-muted">جست‌وجو در شماره سفارش، نام گیرنده، شماره همراه یا کد رهگیری</span>
          <input
            name="q"
            defaultValue={search}
            placeholder="مثلاً ND-123456 یا ۰۹۱۲"
            className="h-11 rounded-xl border border-surface-border bg-white px-3.5 text-sm outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </label>

        {validFilter ? <input type="hidden" name="status" value={validFilter} /> : null}

        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
        >
          جست‌وجو
        </button>

        {search || validFilter ? (
          <Link
            href="/admin/orders"
            className="flex h-11 items-center rounded-xl border border-surface-border px-4 text-sm text-ink-muted transition-colors hover:bg-surface-muted"
          >
            پاک کردن
          </Link>
        ) : null}
      </form>

      <nav aria-label="فیلتر وضعیت" className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = (validFilter ?? '') === tab.value
          const params = new URLSearchParams()
          if (tab.value) params.set('status', tab.value)
          if (search) params.set('q', search)
          const query = params.toString()
          return (
            <Link
              key={tab.value || 'all'}
              href={query ? `/admin/orders?${query}` : '/admin/orders'}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/[0.06] text-primary'
                  : 'border-surface-border text-ink-muted hover:bg-surface-muted',
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-14 text-center text-sm text-ink-muted">
          سفارشی با این شرط پیدا نشد.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => {
            const buyer = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || null
            return (
              <li
                key={order.id}
                className="overflow-hidden rounded-2xl border border-surface-border bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border bg-surface-muted px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="ltr-inline text-sm font-bold text-ink hover:text-primary"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="text-[11px] text-ink-subtle">
                      {formatJalaliDateTime(order.createdAt)}
                    </span>
                    {order.user ? (
                      <span className="rounded-full bg-secondary/[0.12] px-2.5 py-0.5 text-[10px] font-medium text-secondary-dark">
                        مشتری ثبت‌شده
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] text-ink-muted">
                        سفارش مهمان
                      </span>
                    )}
                  </div>
                  <OrderStatusControl
                    orderId={order.id}
                    status={order.status}
                    readOnly={readOnly}
                  />
                </div>

                <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_260px]">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink">
                      {order.customerFirstName} {order.customerLastName}
                      <span className="ltr-inline mr-2 font-normal text-ink-subtle">
                        {toPersianDigits(order.customerPhone)}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                      {order.shippingProvince}، {order.shippingCity} — {order.shippingLine}
                    </p>

                    <ul className="mt-3 flex flex-col gap-1.5">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="truncate text-ink-muted">
                            <Link href={`/product/${item.productSlug}`} className="hover:text-primary">
                              {item.productName}
                            </Link>
                            {' × '}
                            {toPersianDigits(item.quantity)}
                          </span>
                          <span className="shrink-0 tabular-nums text-ink-subtle">
                            {formatPrice(item.lineTotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <dl className="flex h-fit flex-col gap-2 rounded-xl bg-surface-muted p-4 text-[11px]">
                    <div className="flex items-center justify-between">
                      <dt className="text-ink-muted">روش پرداخت</dt>
                      <dd className="font-medium text-ink">{paymentMethodLabel(order.paymentMethod)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-ink-muted">روش ارسال</dt>
                      <dd className="max-w-32 truncate font-medium text-ink">{order.shippingMethod}</dd>
                    </div>
                    {order.couponCode ? (
                      <div className="flex items-center justify-between">
                        <dt className="text-ink-muted">کد تخفیف</dt>
                        <dd className="ltr-inline font-medium text-secondary-dark">{order.couponCode}</dd>
                      </div>
                    ) : null}
                    {order.discount > 0 ? (
                      <div className="flex items-center justify-between">
                        <dt className="text-ink-muted">تخفیف</dt>
                        <dd className="font-medium text-success">− {formatPrice(order.discount)}</dd>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <dt className="text-ink-muted">هزینه ارسال</dt>
                      <dd className="font-medium text-ink">
                        {order.shipping === 0 ? 'رایگان' : formatPrice(order.shipping)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between border-t border-surface-border pt-2">
                      <dt className="font-bold text-ink">مبلغ کل</dt>
                      <dd className="text-sm font-extrabold tabular-nums text-primary">
                        {formatPrice(order.total)}
                      </dd>
                    </div>
                    {order.trackingCode ? (
                      <div className="flex items-center justify-between">
                        <dt className="text-ink-muted">کد رهگیری</dt>
                        <dd className="ltr-inline font-medium text-primary">{order.trackingCode}</dd>
                      </div>
                    ) : null}
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
