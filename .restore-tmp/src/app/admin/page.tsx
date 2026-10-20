import Link from 'next/link'
import type { Metadata } from 'next'
import { TrendChart } from '@/components/admin/trend-chart'
import { buildMetadata } from '@/lib/seo'
import { orderStatusLabels } from '@/lib/data/orders'
import {
  getAdminNavCounts,
  getDashboardStats,
  getDashboardTrend,
  getLowStockReport,
  getRecentOrders,
  getStaffUser,
  STAFF_ROLE_LABELS,
} from '@/lib/server/admin'
import { cn } from '@/lib/utils/cn'
import {
  formatJalaliDate,
  formatPrice,
  formatRelativeTime,
  toPersianDigits,
} from '@/lib/utils/format'
import type { OrderStatus } from '@/lib/data/orders'

export const metadata: Metadata = buildMetadata({
  title: 'داشبورد مدیریت',
  description: 'نمای کلی فروش، سفارش‌ها و وضعیت فروشگاه نودهی.',
  path: '/admin',
  noIndex: true,
})

export default async function AdminDashboardPage() {
  const [stats, staff, trend, recentOrders, lowStock, navCounts] = await Promise.all([
    getDashboardStats(),
    getStaffUser(),
    getDashboardTrend(),
    getRecentOrders(6),
    getLowStockReport(),
    getAdminNavCounts(),
  ])

  const isAccountant = staff?.role === 'accountant'
  const currentAvg =
    trend.currentOrders > 0 ? Math.round(trend.currentRevenue / trend.currentOrders) : 0
  const previousAvg =
    trend.previousOrders > 0 ? Math.round(trend.previousRevenue / trend.previousOrders) : 0

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">داشبورد فروشگاه</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          نمای کلی فروش، سفارش‌ها و کارهای در انتظار رسیدگی.
          {isAccountant ? ' نقش شما حسابدار است، پس فقط گزارش‌ها را می‌بینید.' : ''}
        </p>
      </header>

      {/* شاخص‌های کلیدی — هر کدام با مقایسهٔ ۳۰ روز اخیر نسبت به ۳۰ روز پیش از آن */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="درآمد ۳۰ روز اخیر"
          value={money(trend.currentRevenue)}
          hint={`مجموع کل فروشگاه: ${money(stats.revenue)}`}
          tone="primary"
          delta={delta(trend.currentRevenue, trend.previousRevenue)}
        />
        <Kpi
          label="سفارش ۳۰ روز اخیر"
          value={toPersianDigits(trend.currentOrders)}
          hint={`میانگین سبد: ${currentAvg > 0 ? formatPrice(currentAvg) : '—'}`}
          delta={delta(trend.currentOrders, trend.previousOrders)}
        />
        <Kpi
          label="میانگین سبد (۳۰ روز)"
          value={currentAvg > 0 ? formatPrice(currentAvg) : '—'}
          hint="میانگین مبلغ هر سفارش در همین بازه"
          delta={delta(currentAvg, previousAvg)}
        />
        <Kpi
          label="مشتریان"
          value={toPersianDigits(stats.customers)}
          hint={`${toPersianDigits(trend.currentCustomers)} نفر در ۳۰ روز اخیر`}
          delta={delta(trend.currentCustomers, trend.previousCustomers)}
        />
      </div>

      {/* روند فروش */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">روند فروش ۳۰ روز گذشته</h2>
          <span className="text-[11px] text-ink-subtle">
            ستون‌های خالی یعنی آن روز سفارشی ثبت نشده است — روزهای بی‌سفارش حذف نمی‌شوند تا فاصله‌ها
            واقعی بمانند.
          </span>
        </div>
        <div className="mt-4">
          <TrendChart days={trend.days} maxRevenue={trend.maxRevenue} />
        </div>
      </section>

      {/* کارهای در انتظار */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <h2 className="text-sm font-bold text-ink">در انتظار رسیدگی</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PendingCard
            label="نظرات در انتظار تأیید"
            count={navCounts.pendingReviews}
            href="/admin/reviews"
          />
          <PendingCard
            label="پیام‌های خوانده‌نشده"
            count={navCounts.newMessages}
            href="/admin/messages"
          />
          <PendingCard
            label="هشدار موجودی فعال"
            count={navCounts.activeStockAlerts}
            href="/admin/stock-alerts"
          />
          <PendingCard
            label="سفارش آنلاین پرداخت‌نشده"
            count={navCounts.unpaidOnlineOrders}
            href="/admin/orders?status=pending"
          />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* تازه‌ترین سفارش‌ها */}
        <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-surface-border px-5 py-3.5">
            <h2 className="text-sm font-bold text-ink">تازه‌ترین سفارش‌ها</h2>
            <Link href="/admin/orders" className="text-xs text-primary hover:underline">
              همهٔ سفارش‌ها ←
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-ink-muted">
              هنوز سفارشی ثبت نشده است.
            </p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="ltr-inline text-xs font-bold text-ink hover:text-primary"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="mt-0.5 truncate text-[10px] text-ink-subtle">
                      {order.customerName} — {toPersianDigits(order.itemCount)} قلم —{' '}
                      {formatRelativeTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[10px]', statusPillTone(order.status))}>
                      {orderStatusLabels[order.status as OrderStatus] ?? order.status}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-ink">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* کالاهای کم‌موجود */}
        <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-surface-border px-5 py-3.5">
            <h2 className="text-sm font-bold text-ink">کالاهای کم‌موجود</h2>
            <Link href="/admin/settings" className="text-xs text-primary hover:underline">
              تغییر آستانه ←
            </Link>
          </div>
          {lowStock.items.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-ink-muted">
              همهٔ کالاها بیش از آستانهٔ {toPersianDigits(lowStock.threshold)} عدد موجودی دارند.
            </p>
          ) : (
            <>
              <p className="px-5 pt-3 text-[11px] text-ink-subtle">
                آستانه «{toPersianDigits(lowStock.threshold)} عدد» است
                {lowStock.outOfStock > 0
                  ? ` و ${toPersianDigits(lowStock.outOfStock)} کالا کاملاً ناموجود است.`
                  : ' و هیچ کالایی کاملاً ناموجود نیست.'}
              </p>
              <ul className="mt-2 divide-y divide-surface-border">
                {lowStock.items.map((item) => (
                  <li key={item.slug} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/product/${item.slug}`}
                        className="block truncate text-xs font-medium text-ink hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-[10px] text-ink-subtle">{money(item.price)}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums',
                        item.stock <= 0
                          ? 'bg-danger/[0.08] text-danger'
                          : 'bg-accent/[0.12] text-accent-dark',
                      )}
                    >
                      {item.stock <= 0 ? 'ناموجود' : `${toPersianDigits(item.stock)} عدد`}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* وضعیت سفارش‌ها */}
        <section className="rounded-2xl border border-surface-border bg-white p-5">
          <h2 className="text-sm font-bold text-ink">وضعیت سفارش‌ها</h2>
          {stats.statusCounts.length === 0 ? (
            <p className="mt-4 rounded-xl bg-surface-muted p-4 text-xs text-ink-muted">
              هنوز سفارشی ثبت نشده است.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {stats.statusCounts.map((entry) => {
                const total = stats.statusCounts.reduce((sum, item) => sum + item.count, 0)
                const percent = total > 0 ? Math.round((entry.count / total) * 100) : 0
                return (
                  <li key={entry.status}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-muted">
                        {orderStatusLabels[entry.status as OrderStatus] ?? entry.status}
                      </span>
                      <span className="font-bold tabular-nums text-ink">
                        {toPersianDigits(entry.count)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <span
                        className={cn('block h-full rounded-full', statusBarTone(entry.status))}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <Link href="/admin/orders" className="mt-4 inline-block text-xs text-primary hover:underline">
            مدیریت سفارش‌ها ←
          </Link>
        </section>

        {/* پرفروش‌ها */}
        <section className="rounded-2xl border border-surface-border bg-white p-5">
          <h2 className="text-sm font-bold text-ink">پرفروش‌ترین کالاها</h2>
          {stats.topProducts.length === 0 ? (
            <p className="mt-4 rounded-xl bg-surface-muted p-4 text-xs text-ink-muted">
              داده‌ای برای نمایش وجود ندارد. با ثبت سفارش، این جدول پر می‌شود.
            </p>
          ) : (
            <ol className="mt-4 flex flex-col divide-y divide-surface-border">
              {stats.topProducts.map((product, index) => (
                <li key={product.productSlug} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-[11px] font-bold text-primary">
                    {toPersianDigits(index + 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink">{product.productName}</p>
                    <p className="mt-0.5 text-[11px] text-ink-subtle">
                      {toPersianDigits(product.quantity)} عدد فروش
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-ink">
                    {formatPrice(product.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* دسترسی سریع به بخش‌هایی که در نگاه اول کمتر دیده می‌شوند */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <h2 className="text-sm font-bold text-ink">دسترسی سریع</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/admin/users', label: 'کاربران و نقش‌ها', hint: 'تغییر نقش و دسترسی کارکنان' },
            { href: '/admin/reports', label: 'گزارش فروش', hint: 'بازهٔ دلخواه + خروجی CSV' },
            { href: '/admin/content', label: 'محتوای سایت', hint: 'کالاها، برندها، مقالات و صفحات' },
            {
              href: '/admin/audit',
              label: 'گزارش فعالیت',
              hint: 'چه کسی چه چیزی را عوض کرد',
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-surface-border px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
            >
              <span className="block text-xs font-bold text-ink">{item.label}</span>
              <span className="mt-1 block text-[11px] leading-5 text-ink-subtle">{item.hint}</span>
            </Link>
          ))}
        </div>
      </section>

      {staff ? (
        <p className="text-[11px] leading-5 text-ink-subtle">
          شما با نقش «{STAFF_ROLE_LABELS[staff.role] ?? staff.role}» وارد شده‌اید. تمام تغییرهای مدیریتی در لاگ
          حسابرسی ثبت می‌شود. بازهٔ گزارش‌ها: از {formatJalaliDate(trend.days[0]?.date ?? new Date())} تا امروز.
        </p>
      ) : null}
    </div>
  )
}

/**
 * قالب مالی امن.
 * `formatPrice(0)` متن «تماس بگیرید» برمی‌گرداند که در شاخص درآمد صفر، گمراه‌کننده
 * است؛ اینجا صفر صفر می‌ماند.
 */
function money(value: number): string {
  return value > 0 ? formatPrice(value) : '۰ تومان'
}

/** درصد تغییر نسبت به دورهٔ قبل — برای دورهٔ صفر «تازه» نشان می‌دهیم نه بی‌نهایت */
function delta(current: number, previous: number): { value: number | null; label: string } {
  if (previous === 0 && current === 0) return { value: 0, label: 'بی‌تغییر' }
  if (previous === 0) return { value: null, label: 'تازه' }
  const value = Math.round(((current - previous) / previous) * 100)
  return { value, label: `${value > 0 ? '+' : ''}${toPersianDigits(value)}٪` }
}

function statusPillTone(status: string): string {
  switch (status) {
    case 'delivered':
      return 'bg-success/[0.12] text-success'
    case 'shipped':
      return 'bg-secondary/[0.12] text-secondary-dark'
    case 'cancelled':
      return 'bg-danger/[0.08] text-danger'
    case 'paid':
    case 'processing':
      return 'bg-primary/[0.08] text-primary'
    default:
      return 'bg-surface-muted text-ink-muted'
  }
}

function statusBarTone(status: string): string {
  switch (status) {
    case 'delivered':
      return 'bg-success'
    case 'shipped':
      return 'bg-secondary'
    case 'processing':
      return 'bg-amber-400'
    case 'paid':
      return 'bg-primary'
    case 'cancelled':
      return 'bg-danger'
    default:
      return 'bg-ink-subtle'
  }
}

function Kpi({
  label,
  value,
  hint,
  tone = 'default',
  delta: change,
}: {
  label: string
  value: string
  hint: string
  tone?: 'default' | 'primary'
  delta?: { value: number | null; label: string }
}) {
  const positive = change && change.value !== null && change.value > 0
  const negative = change && change.value !== null && change.value < 0
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-ink-muted">{label}</p>
        {change ? (
          <span
            title="مقایسه با ۳۰ روز پیش از این بازه"
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
              positive
                ? 'bg-success/[0.12] text-success'
                : negative
                  ? 'bg-danger/[0.08] text-danger'
                  : 'bg-surface-muted text-ink-muted',
            )}
          >
            {change.label}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          'mt-2 text-lg font-extrabold tabular-nums',
          tone === 'primary' ? 'text-primary' : 'text-ink',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-ink-subtle">{hint}</p>
    </div>
  )
}

function PendingCard({
  label,
  count,
  href,
}: {
  label: string
  count: number
  href: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors',
        count > 0
          ? 'border-accent/30 bg-accent/[0.06] hover:bg-accent/10'
          : 'border-surface-border hover:bg-surface-muted',
      )}
    >
      <span className="text-xs text-ink-muted">{label}</span>
      <span
        className={cn(
          'text-sm font-extrabold tabular-nums',
          count > 0 ? 'text-accent-dark' : 'text-ink',
        )}
      >
        {toPersianDigits(count)}
      </span>
    </Link>
  )
}
