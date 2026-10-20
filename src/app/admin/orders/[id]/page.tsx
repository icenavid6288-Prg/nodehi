import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OrderAdminForm } from '@/components/admin/order-admin-form'
import { OrderStatusControl } from '@/components/admin/order-status-control'
import { prisma } from '@/lib/db'
import { orderStatusLabels } from '@/lib/data/orders'
import type { OrderStatus } from '@/lib/data/orders'
import { buildMetadata } from '@/lib/seo'
import { auditActionLabel, auditActorName, canMutate, getAuditLogs, getStaffUser } from '@/lib/server/admin'
import { formatAuditMetadata } from '@/lib/server/audit'
import { paymentMethodLabel } from '@/lib/server/orders'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDateTime, formatPrice, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'جزئیات سفارش',
  description: 'نمایش کامل یک سفارش، اقلام، آدرس، پرداخت و تاریخچه تغییرها.',
  path: '/admin/orders',
  noIndex: true,
})

function statusTone(status: string): string {
  switch (status) {
    case 'delivered':
      return 'bg-success/[0.12] text-success'
    case 'shipped':
      return 'bg-secondary/[0.12] text-secondary-dark'
    case 'processing':
      return 'bg-amber-100 text-amber-700'
    case 'paid':
      return 'bg-primary/[0.08] text-primary'
    case 'cancelled':
      return 'bg-danger/[0.08] text-danger'
    default:
      return 'bg-surface-muted text-ink-muted'
  }
}

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  const readOnly = !staff || !canMutate(staff.role)

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      user: { select: { id: true, phone: true, firstName: true, lastName: true, role: true } },
    },
  })

  if (!order) notFound()

  // تاریخچه تغییرهای همین سفارش — همان چیزی که پاسخ «چه کسی این را عوض کرد؟» است
  const history = await getAuditLogs({ entity: 'Order', entityId: order.id, take: 20 })

  const buyer = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || null
  const timeline = [
    { label: 'ثبت سفارش', at: order.createdAt },
    { label: 'تأیید پرداخت', at: order.paidAt },
    { label: 'تحویل به شرکت حمل', at: order.shippedAt },
    { label: 'تحویل به مشتری', at: order.deliveredAt },
    { label: 'لغو سفارش', at: order.cancelledAt },
  ].filter((step) => step.at !== null)

  return (
    <div className="flex flex-col gap-5">
      <nav className="text-xs text-ink-muted">
        <Link href="/admin/orders" className="hover:text-primary">
          سفارش‌ها
        </Link>
        <span className="mx-2">/</span>
        <span className="ltr-inline text-ink">{order.orderNumber}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-surface-border bg-white p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="ltr-inline text-lg font-extrabold text-ink">{order.orderNumber}</h1>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-bold',
                statusTone(order.status),
              )}
            >
              {orderStatusLabels[order.status as OrderStatus] ?? order.status}
            </span>
            {order.user ? (
              <Link
                href={`/admin/customers/${order.user.id}`}
                className="rounded-full bg-secondary/[0.12] px-2.5 py-0.5 text-[10px] font-medium text-secondary-dark hover:bg-secondary/20"
              >
                مشتری ثبت‌شده{buyer ? ` — ${buyer}` : ''}
              </Link>
            ) : (
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] text-ink-muted">
                سفارش مهمان
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            ثبت‌شده در {formatJalaliDateTime(order.createdAt)}
            {order.user ? ' — کاربر به این سفارش متصل است' : ' — بدون حساب کاربری'}
          </p>
        </div>

        <OrderStatusControl orderId={order.id} status={order.status} readOnly={readOnly} />
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* اقلام سفارش */}
          <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
            <h2 className="border-b border-surface-border px-5 py-3.5 text-sm font-bold text-ink">
              اقلام سفارش
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-right text-xs">
                <thead>
                  <tr className="bg-surface-muted text-ink-muted">
                    <th className="px-5 py-3 font-medium">کالا</th>
                    <th className="px-5 py-3 font-medium">قیمت واحد</th>
                    <th className="px-5 py-3 font-medium">تعداد</th>
                    <th className="px-5 py-3 font-medium">جمع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <Link href={`/product/${item.productSlug}`} className="text-ink hover:text-primary">
                          {item.productName}
                        </Link>
                        <span className="mt-0.5 block text-[10px] text-ink-subtle ltr-inline">
                          {item.productSlug}
                        </span>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-ink-muted">
                        {formatPrice(item.unitPrice)}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-ink-muted">
                        {toPersianDigits(item.quantity)}
                      </td>
                      <td className="px-5 py-3 font-medium tabular-nums text-ink">
                        {formatPrice(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* جمع‌بندی مالی — همان ترتیبی که در محاسبه قیمت استفاده می‌شود */}
            <dl className="flex flex-col gap-2 border-t border-surface-border bg-surface-muted px-5 py-4 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">جمع کالاها</dt>
                <dd className="tabular-nums text-ink">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-muted">
                    تخفیف{order.couponCode ? ` (${order.couponCode})` : ''}
                  </dt>
                  <dd className="tabular-nums text-success">− {formatPrice(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">هزینه ارسال</dt>
                <dd className="tabular-nums text-ink">
                  {order.shipping === 0 ? 'رایگان' : formatPrice(order.shipping)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-surface-border pt-2">
                <dt className="font-bold text-ink">مبلغ پرداختی</dt>
                <dd className="text-sm font-extrabold tabular-nums text-primary">
                  {formatPrice(order.total)}
                </dd>
              </div>
            </dl>
          </section>

          {readOnly ? (
            <section className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold text-ink">اطلاعات ارسال و پیگیری</h2>
              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-ink-subtle">روش ارسال</dt>
                  <dd className="mt-0.5 text-ink">{order.shippingMethod}</dd>
                </div>
                <div>
                  <dt className="text-ink-subtle">کد رهگیری</dt>
                  <dd className="mt-0.5 text-ink ltr-inline">{order.trackingCode ?? 'ثبت نشده'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-ink-subtle">یادداشت داخلی</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-ink">{order.note ?? 'ندارد'}</dd>
                </div>
              </dl>
              <p className="mt-4 text-[11px] text-ink-subtle">
                نقش شما اجازه ویرایش سفارش‌ها را ندارد؛ این بخش فقط‌خواندنی است.
              </p>
            </section>
          ) : (
            <OrderAdminForm
              orderId={order.id}
              shippingMethod={order.shippingMethod}
              trackingCode={order.trackingCode}
              note={order.note}
            />
          )}

          {/* تاریخچه تغییرها */}
          <section className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="text-sm font-bold text-ink">تاریخچه تغییرها</h2>
            <p className="mt-1.5 text-xs text-ink-muted">
              هر تغییر وضعیت، کد رهگیری و یادداشت این سفارش با نام کاربر ثبت شده است.
            </p>

            {history.length === 0 ? (
              <p className="mt-4 rounded-xl bg-surface-muted p-4 text-xs text-ink-muted">
                هنوز تغییر مدیریتی روی این سفارش ثبت نشده است.
              </p>
            ) : (
              <ol className="mt-4 flex flex-col gap-3">
                {history.map((entry) => {
                  const metadata = formatAuditMetadata(entry.metadata)
                  return (
                    <li key={entry.id} className="rounded-xl border border-surface-border px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink">
                          {auditActionLabel(entry.action)}
                        </span>
                        <span className="text-[10px] text-ink-subtle">
                          {formatJalaliDateTime(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        توسط {auditActorName(entry.actor)}
                        {entry.ip ? ` — ${entry.ip}` : ''}
                      </p>
                      {metadata.length > 0 ? (
                        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-ink-subtle">
                          {metadata.map((item) => (
                            <span key={item.key}>
                              {item.key}: <span className="text-ink-muted">{item.value}</span>
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>

        {/* ستون کنار: گیرنده، نشانی، پرداخت */}
        <div className="flex h-fit flex-col gap-5">
          <section className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="text-sm font-bold text-ink">گیرنده</h2>
            <dl className="mt-4 flex flex-col gap-3 text-xs">
              <div>
                <dt className="text-ink-subtle">نام</dt>
                <dd className="mt-0.5 text-ink">
                  {order.customerFirstName} {order.customerLastName}
                </dd>
              </div>
              <div>
                <dt className="text-ink-subtle">شماره همراه</dt>
                <dd className="mt-0.5 tabular-nums text-ink ltr-inline">
                  {toPersianDigits(order.customerPhone)}
                </dd>
              </div>
              {order.customerEmail ? (
                <div>
                  <dt className="text-ink-subtle">ایمیل</dt>
                  <dd className="mt-0.5 text-ink" dir="ltr">
                    {order.customerEmail}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-ink-subtle">نشانی</dt>
                <dd className="mt-0.5 leading-6 text-ink">
                  {order.shippingProvince}، {order.shippingCity}
                  <br />
                  {order.shippingLine}
                  {order.shippingPostalCode ? (
                    <>
                      <br />
                      کد پستی: <span className="ltr-inline">{toPersianDigits(order.shippingPostalCode)}</span>
                    </>
                  ) : null}
                </dd>
              </div>
            </dl>

            <Link
              href={`/track?order=${order.orderNumber}`}
              className="mt-4 inline-block text-[11px] text-primary hover:underline"
            >
              پیگیری همین سفارش در سایت ←
            </Link>
          </section>

          <section className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="text-sm font-bold text-ink">پرداخت و ارسال</h2>
            <dl className="mt-4 flex flex-col gap-3 text-xs">
              <div>
                <dt className="text-ink-subtle">روش پرداخت</dt>
                <dd className="mt-0.5 text-ink">{paymentMethodLabel(order.paymentMethod)}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">روش ارسال</dt>
                <dd className="mt-0.5 text-ink">{order.shippingMethod}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">کد رهگیری</dt>
                <dd className="mt-0.5 text-ink ltr-inline">{order.trackingCode ?? 'ثبت نشده'}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">شناسه جلوگیری از ثبت تکراری</dt>
                <dd className="mt-0.5 break-all text-ink-subtle ltr-inline">
                  {order.idempotencyKey ?? '—'}
                </dd>
              </div>
            </dl>

            <h3 className="mt-5 text-xs font-bold text-ink">خط زمانی</h3>
            <ol className="mt-3 flex flex-col gap-2">
              {timeline.map((step) => (
                <li key={step.label} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-ink-muted">{step.label}</span>
                  <span className="text-ink-subtle">{formatJalaliDateTime(step.at as Date)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}
