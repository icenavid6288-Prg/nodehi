import Link from 'next/link'
import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/button'
import { buildMetadata } from '@/lib/seo'
import { prisma } from '@/lib/db'
import { orderStatusLabels } from '@/lib/data/orders'
import { loyaltyProgress } from '@/lib/loyalty'
import { getCurrentUser } from '@/lib/server/auth/session'
import { getUserOrderSummary, getUserOrders } from '@/lib/server/orders'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate, formatPrice, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'پیشخوان',
  description: 'خلاصه حساب کاربری، سفارش‌های اخیر و امتیاز باشگاه مشتریان نودهی.',
  path: '/account',
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

export default async function AccountDashboardPage() {
  // دسترسی در layout بررسی شده است
  const user = await getCurrentUser()
  if (!user) return null

  const [summary, recentOrders, myReviews] = await Promise.all([
    getUserOrderSummary(user.id),
    getUserOrders(user.id),
    prisma.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 2,
    }),
  ])

  const loyalty = loyaltyProgress(user.loyaltyPoints)
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">
          {fullName ? `${fullName} عزیز، خوش آمدید` : 'به نودهی خوش آمدید'}
        </h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          از این بخش می‌توانید سفارش‌های خود را پیگیری کنید، آدرس‌های ارسال را مدیریت کنید و امتیازهای
          باشگاه مشتریان را ببینید.
        </p>
      </header>

      {/* اگر نام کاربر ثبت نشده، از او بخواه کاملش کند — نام روی بسته ارسالی چاپ می‌شود */}
      {!fullName ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-secondary/40 bg-secondary/[0.08] px-5 py-4">
          <div>
            <p className="text-sm font-bold text-secondary-dark">اطلاعات حساب شما کامل نیست</p>
            <p className="mt-1 text-xs leading-6 text-secondary-dark/80">
              نام و نام خانوادگی برای صدور فاکتور و ارسال مرسوله لازم است.
            </p>
          </div>
          <ButtonLink href="/account/profile" variant="primary" size="sm">
            تکمیل اطلاعات
          </ButtonLink>
        </div>
      ) : null}

      {/* آمار سریع */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="سفارش‌های فعال"
          value={toPersianDigits(summary.activeOrders)}
          hint="در حال پردازش یا ارسال"
          href="/account/orders"
        />
        <StatCard
          label="کل سفارش‌ها"
          value={toPersianDigits(summary.totalOrders)}
          hint="از ابتدای عضویت"
          href="/account/orders"
        />
        <StatCard
          label="امتیاز باشگاه"
          value={toPersianDigits(user.loyaltyPoints)}
          hint={
            loyalty.next
              ? `${toPersianDigits(loyalty.pointsToNext)} امتیاز تا ${loyalty.next.name}`
              : 'بالاترین سطح'
          }
          href="/loyalty"
        />
        <StatCard
          label="مجموع خرید"
          value={summary.totalSpent > 0 ? formatPrice(summary.totalSpent) : '—'}
          hint={`عضو از ${formatJalaliDate(user.createdAt)}`}
          href="/loyalty"
        />
      </div>

      {/* سفارش‌های اخیر */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-ink">سفارش‌های اخیر</h2>
          <ButtonLink href="/account/orders" variant="link" size="sm">
            مشاهده همه ←
          </ButtonLink>
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState
            title="هنوز سفارشی ثبت نکرده‌اید"
            description="اولین سفارش خود را ثبت کنید تا وضعیت ارسال و فاکتور آن را از همین‌جا پیگیری کنید."
            actionHref="/shop"
            actionLabel="شروع خرید"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-surface-border">
            {recentOrders.slice(0, 3).map((order) => {
              const itemsTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
              return (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                      <span className="ltr-inline">{order.id}</span>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                          statusTone[order.status],
                        )}
                      >
                        {orderStatusLabels[order.status]}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-ink-subtle">
                      {formatJalaliDate(order.createdAt)} · {toPersianDigits(order.items.length)} قلم کالا
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold tabular-nums text-ink">
                      {formatPrice(itemsTotal - order.discount + order.shippingCost)}
                    </span>
                    <Link
                      href={`/account/orders#${order.id}`}
                      className="text-xs text-primary transition-colors hover:text-accent"
                    >
                      جزئیات
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* پیشرفت باشگاه */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">باشگاه مشتریان</h2>
          <span className="rounded-full bg-secondary/[0.12] px-3 py-1 text-[11px] font-bold text-secondary-dark">
            سطح {loyalty.current.name}
          </span>
        </div>

        {loyalty.next ? (
          <>
            <p className="text-xs leading-6 text-ink-muted">
              تنها {toPersianDigits(loyalty.pointsToNext)} امتیاز تا سطح{' '}
              <span className="font-bold text-ink">{loyalty.next.name}</span> فاصله دارید؛ در آن سطح{' '}
              {toPersianDigits(loyalty.next.discountPercent)}٪ تخفیف وفاداری دریافت می‌کنید.
            </p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={loyalty.progressPercent}
              aria-label="پیشرفت سطح باشگاه مشتریان"
            >
              <span
                className="block h-full rounded-full bg-secondary transition-all"
                style={{ width: `${loyalty.progressPercent}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-xs leading-6 text-ink-muted">
            شما در بالاترین سطح باشگاه نودهی هستید و بیشترین تخفیف وفاداری را دریافت می‌کنید.
          </p>
        )}

        <ButtonLink href="/loyalty" variant="link" size="sm" className="mt-3">
          جزئیات باشگاه مشتریان ←
        </ButtonLink>
      </section>

      {/* اطلاعات حساب */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-ink">اطلاعات حساب</h2>
          <ButtonLink href="/account/profile" variant="link" size="sm">
            ویرایش ←
          </ButtonLink>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="نام و نام خانوادگی" value={fullName || 'ثبت نشده'} />
          <Field label="شماره همراه" value={toPersianDigits(user.phone)} ltr />
          <Field label="ایمیل" value={user.email ?? 'ثبت نشده'} ltr={Boolean(user.email)} />
          <Field label="تاریخ عضویت" value={formatJalaliDate(user.createdAt)} />
        </dl>
      </section>

      {/* نظرات */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-ink">آخرین نظرهای شما</h2>
          <ButtonLink href="/account/reviews" variant="link" size="sm">
            همه نظرات ←
          </ButtonLink>
        </div>

        {myReviews.length === 0 ? (
          <p className="rounded-xl bg-surface-muted p-4 text-xs leading-6 text-ink-muted">
            هنوز نظری ثبت نکرده‌اید. پس از خرید و تحویل کالا، می‌توانید تجربه خود را برای سایر
            خریداران بنویسید.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {myReviews.map((review) => (
              <li key={review.id} className="rounded-xl bg-surface-muted p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-ink">{review.title}</p>
                  <span className="text-[11px] text-ink-subtle">
                    {review.status === 'approved' ? 'منتشرشده' : 'در انتظار تأیید'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-6 text-ink-muted">«{review.body}»</p>
                <p className="mt-2 text-[11px] text-ink-subtle">{formatJalaliDate(review.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string
  value: string
  hint: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-surface-border bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-float"
    >
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-2 text-lg font-extrabold tabular-nums text-primary">{value}</p>
      <p className="mt-1 text-[11px] text-ink-subtle">{hint}</p>
    </Link>
  )
}

function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string
  description: string
  actionHref: string
  actionLabel: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-surface-border px-5 py-10 text-center">
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="max-w-md text-xs leading-6 text-ink-muted">{description}</p>
      <ButtonLink href={actionHref} variant="primary" size="sm">
        {actionLabel}
      </ButtonLink>
    </div>
  )
}

function Field({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={cn('mt-1 text-sm font-medium text-ink', ltr && 'ltr-inline')}>{value}</dd>
    </div>
  )
}
