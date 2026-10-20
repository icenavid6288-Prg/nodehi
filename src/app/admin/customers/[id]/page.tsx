import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { UserAdminPanel } from '@/components/admin/user-admin-panel'
import { prisma } from '@/lib/db'
import { orderStatusLabels } from '@/lib/data/orders'
import type { OrderStatus } from '@/lib/data/orders'
import { loyaltyProgress } from '@/lib/loyalty'
import { buildMetadata } from '@/lib/seo'
import { auditActionLabel, auditActorName, getAuditLogs, getStaffUser, isAdminRole } from '@/lib/server/admin'
import { roleLabel } from '@/lib/roles'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate, formatJalaliDateTime, formatPrice, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'پروفایل مشتری',
  description: 'نمای کامل یک مشتری: سفارش‌ها، آدرس‌ها، نظرات و فعالیت حساب.',
  path: '/admin/customers',
  noIndex: true,
})

export default async function AdminCustomerDetailPage({ params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  const canManage = Boolean(staff && isAdminRole(staff.role))

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
      reviews: { orderBy: { createdAt: 'desc' } },
      stockAlerts: { orderBy: { createdAt: 'desc' }, take: 20 },
      orders: {
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
    },
  })

  if (!user) notFound()

  const [spendGroups, sessionCount, activity] = await Promise.all([
    prisma.order.aggregate({
      where: { userId: user.id, status: { not: 'cancelled' } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.session.count({ where: { userId: user.id } }),
    getAuditLogs({ actorId: user.id, take: 10 }),
  ])

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'بدون نام'
  const totalSpend = spendGroups._sum.total ?? 0
  const orderCount = spendGroups._count._all
  // سطح از روی امتیاز محاسبه می‌شود تا با صفحه باشگاه مشتریان یکی باشد
  const progress = loyaltyProgress(user.loyaltyPoints)
  const tierLabel = progress.current.name

  return (
    <div className="flex flex-col gap-5">
      <nav className="text-xs text-ink-muted">
        <Link href="/admin/customers" className="hover:text-primary">
          مشتریان
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-surface-border bg-white p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-lg font-extrabold text-primary">
            {user.firstName?.slice(0, 1) || '؟'}
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-ink">{name}</h1>
            <p className="mt-1 text-xs tabular-nums text-ink-muted ltr-inline">
              {toPersianDigits(user.phone)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                  user.role === 'customer'
                    ? 'bg-surface-muted text-ink-muted'
                    : 'bg-secondary/[0.12] text-secondary-dark',
                )}
              >
                {roleLabel(user.role)}
              </span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                  user.isActive ? 'bg-success/[0.12] text-success' : 'bg-danger/[0.08] text-danger',
                )}
              >
                {user.isActive ? 'حساب فعال' : 'حساب غیرفعال'}
              </span>
              <span className="rounded-full bg-primary/[0.08] px-2.5 py-0.5 text-[10px] font-medium text-primary">
                {tierLabel}
              </span>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
          <div>
            <dt className="text-ink-subtle">عضویت</dt>
            <dd className="mt-0.5 text-ink">{formatJalaliDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">آخرین ورود</dt>
            <dd className="mt-0.5 text-ink">
              {user.lastLoginAt ? formatJalaliDate(user.lastLoginAt) : 'ثبت نشده'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">نشست‌های فعال</dt>
            <dd className="mt-0.5 tabular-nums text-ink">{toPersianDigits(sessionCount)}</dd>
          </div>
          <div>
            <dt className="text-ink-subtle">تأیید شماره</dt>
            <dd className="mt-0.5 text-ink">
              {user.phoneVerifiedAt ? formatJalaliDate(user.phoneVerifiedAt) : 'تأیید نشده'}
            </dd>
          </div>
        </dl>
      </header>

      {/* شاخص‌های خرید */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="مجموع خرید" value={totalSpend > 0 ? formatPrice(totalSpend) : '—'} />
        <Stat label="تعداد سفارش" value={toPersianDigits(orderCount)} />
        <Stat
          label="امتیاز باشگاه"
          value={toPersianDigits(user.loyaltyPoints)}
          hint={progress.next ? `${toPersianDigits(progress.pointsToNext)} امتیاز تا ${progress.next.name}` : 'بالاترین سطح'}
        />
        <Stat label="آدرس‌های ثبت‌شده" value={toPersianDigits(user.addresses.length)} />
      </div>

      {/* نوار پیشرفت باشگاه */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">پیشرفت در باشگاه مشتریان</h2>
          <span className="text-xs text-ink-muted">
            سطح {progress.current.name} — {toPersianDigits(progress.current.discountPercent)}٪ تخفیف وفاداری
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
          <span className="block h-full rounded-full bg-secondary" style={{ width: `${progress.progressPercent}%` }} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* سفارش‌های مشتری */}
          <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
            <h2 className="border-b border-surface-border px-5 py-3.5 text-sm font-bold text-ink">
              سفارش‌ها
            </h2>
            {user.orders.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs text-ink-muted">این کاربر سفارشی ثبت نکرده است.</p>
            ) : (
              <ul className="divide-y divide-surface-border">
                {user.orders.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="ltr-inline text-xs font-bold text-ink hover:text-primary"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="mt-0.5 text-[10px] text-ink-subtle">
                        {formatJalaliDate(order.createdAt)} — {toPersianDigits(order.items.length)} قلم
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] text-ink-muted">
                        {orderStatusLabels[order.status as OrderStatus] ?? order.status}
                      </span>
                      <span className="text-xs font-medium tabular-nums text-ink">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* نظرات */}
          <section className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="text-sm font-bold text-ink">نظرات ثبت‌شده</h2>
            {user.reviews.length === 0 ? (
              <p className="mt-4 rounded-xl bg-surface-muted p-4 text-xs text-ink-muted">
                این کاربر نظری ثبت نکرده است.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {user.reviews.map((review) => (
                  <li key={review.id} className="rounded-xl border border-surface-border px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/product/${review.productSlug}`}
                        className="text-xs font-bold text-ink hover:text-primary"
                      >
                        {review.title}
                      </Link>
                      <span className="text-[10px] text-ink-subtle">
                        {formatJalaliDate(review.createdAt)} — وضعیت:{' '}
                        {review.status === 'approved' ? 'تأییدشده' : review.status === 'rejected' ? 'ردشده' : 'در انتظار'}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-3 text-[11px] leading-6 text-ink-muted">{review.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* فعالیت حساب */}
          <section className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="text-sm font-bold text-ink">فعالیت حساب</h2>
            {activity.length === 0 ? (
              <p className="mt-4 rounded-xl bg-surface-muted p-4 text-xs text-ink-muted">
                فعالیت ثبت‌شده‌ای وجود ندارد.
              </p>
            ) : (
              <ol className="mt-4 flex flex-col gap-2">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-ink-muted">{auditActionLabel(entry.action)}</span>
                    <span className="text-ink-subtle">
                      {auditActorName(entry.actor)} — {formatJalaliDateTime(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="flex h-fit flex-col gap-5">
          {/* آدرس‌ها */}
          <section className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="text-sm font-bold text-ink">آدرس‌ها</h2>
            {user.addresses.length === 0 ? (
              <p className="mt-4 rounded-xl bg-surface-muted p-4 text-xs text-ink-muted">
                آدرسی ذخیره نشده است.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {user.addresses.map((address) => (
                  <li key={address.id} className="rounded-xl border border-surface-border p-3.5 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink">{address.title}</span>
                      {address.isDefault ? (
                        <span className="rounded-full bg-primary/[0.08] px-2 py-0.5 text-[10px] text-primary">
                          پیش‌فرض
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 leading-6 text-ink-muted">
                      {address.receiver} — <span className="ltr-inline tabular-nums">{toPersianDigits(address.phone)}</span>
                      <br />
                      {address.province}، {address.city}
                      <br />
                      {address.line}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* هشدارهای موجودی */}
          <section className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="text-sm font-bold text-ink">هشدارهای موجودی</h2>
            {user.stockAlerts.length === 0 ? (
              <p className="mt-4 rounded-xl bg-surface-muted p-4 text-xs text-ink-muted">
                درخواستی ثبت نکرده است.
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {user.stockAlerts.map((alert) => (
                  <li key={alert.id} className="flex items-center justify-between gap-3 text-[11px]">
                    <Link href={`/product/${alert.productSlug}`} className="truncate text-ink-muted hover:text-primary">
                      {alert.productSlug}
                    </Link>
                    <span className={cn('shrink-0', alert.notifiedAt ? 'text-success' : 'text-ink-subtle')}>
                      {alert.notifiedAt ? 'اطلاع داده شد' : 'در انتظار'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canManage ? (
            <UserAdminPanel
              userId={user.id}
              role={user.role}
              isActive={user.isActive}
              loyaltyPoints={user.loyaltyPoints}
              isSelf={staff?.id === user.id}
              canManageRole
            />
          ) : (
            <p className="rounded-2xl border border-surface-border bg-white p-5 text-[11px] leading-5 text-ink-subtle">
              مدیریت حساب (تغییر نقش، فعال/غیرفعال‌سازی و امتیاز باشگاه) تنها برای مدیر کل فعال است.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-2 text-lg font-extrabold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-5 text-ink-subtle">{hint}</p> : null}
    </div>
  )
}
