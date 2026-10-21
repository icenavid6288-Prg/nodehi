import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get } from '../lib/api'
import { formatDate, price, toFa } from '../lib/format'
import type { AdminStats } from './types'
import { AdminCard, EmptyState, ErrorNote, PageHeader, StatCard, StatusBadge } from './ui'

export default function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    get<AdminStats>('/admin/stats')
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'دریافت آمار ناموفق بود.'))
  }, [])

  return (
    <div>
      <PageHeader
        title="داشبورد"
        description="خلاصهٔ کاتالوگ، سفارش‌ها و کارهای در انتظار."
        action={
          <div className="flex gap-2">
            <Link
              to="/admin/products"
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-light"
            >
              مدیریت محصولات
            </Link>
            <Link
              to="/admin/orders"
              className="rounded-xl border border-surface-border bg-white px-4 py-2 text-xs font-bold hover:border-secondary"
            >
              سفارش‌ها
            </Link>
          </div>
        }
      />

      <ErrorNote message={error} />

      {!stats && !error && <p className="text-sm text-ink-muted">در حال بارگذاری...</p>}

      {stats && (
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="محصولات" value={stats.products.total} hint={`${toFa(stats.products.active)} فعال`} />
            <StatCard
              label="ناموجود"
              value={stats.products.outOfStock}
              tone={stats.products.outOfStock > 0 ? 'danger' : 'success'}
              hint="کالا با موجودی صفر"
            />
            <StatCard label="سفارش‌ها" value={stats.orders.total} hint="کل سفارش‌های ثبت‌شده" />
            <StatCard
              label="درآمد تأییدشده"
              value={`${price(stats.orders.revenue)} تومان`}
              tone="success"
              hint="سفارش‌های پرداخت‌شده و پس از آن"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="نظرات در انتظار"
              value={stats.reviews.pending}
              tone={stats.reviews.pending > 0 ? 'accent' : 'default'}
              hint="نیازمند تأیید"
            />
            <StatCard label="مشتریان" value={stats.customers} />
            <StatCard
              label="در حال آماده‌سازی"
              value={stats.orders.byStatus.processing ?? 0}
              hint="سفارش‌های باز"
            />
            <StatCard
              label="ارسال‌شده"
              value={stats.orders.byStatus.shipped ?? 0}
              hint="در مسیر مشتری"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AdminCard className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-extrabold">آخرین سفارش‌ها</h2>
                <Link to="/admin/orders" className="text-xs font-bold text-secondary hover:text-secondary-dark">
                  همه ←
                </Link>
              </div>

              {stats.recentOrders.length === 0 ? (
                <EmptyState text="هنوز سفارشی ثبت نشده است." />
              ) : (
                <ul className="grid gap-2">
                  {stats.recentOrders.map((order) => (
                    <li
                      key={order.orderNumber}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-border p-3 text-xs"
                    >
                      <div>
                        <div className="ltr-inline font-bold text-primary">{order.orderNumber}</div>
                        <div className="mt-1 text-[11px] text-ink-muted">{order.customerName}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} />
                        <span className="font-bold">{price(order.total)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>

            <AdminCard className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-extrabold">کم‌موجود</h2>
                <Link to="/admin/products" className="text-xs font-bold text-secondary hover:text-secondary-dark">
                  محصولات ←
                </Link>
              </div>

              {stats.lowStock.length === 0 ? (
                <EmptyState text="همهٔ کالاها موجودی دارند." />
              ) : (
                <ul className="grid gap-2">
                  {stats.lowStock.map((product) => (
                    <li
                      key={product.slug}
                      className="flex items-center justify-between gap-2 rounded-xl border border-surface-border p-3 text-xs"
                    >
                      <Link to={`/product/${product.slug}`} className="line-clamp-1 hover:text-primary">
                        {product.name}
                      </Link>
                      <span className={product.stock <= 0 ? 'font-bold text-danger' : 'font-bold text-accent'}>
                        {toFa(product.stock)} عدد
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>
          </div>

          <AdminCard className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-extrabold">آخرین فعالیت‌ها</h2>
              <Link to="/admin/audit" className="text-xs font-bold text-secondary hover:text-secondary-dark">
                گزارش کامل ←
              </Link>
            </div>

            {stats.recentAudit.length === 0 ? (
              <EmptyState text="هنوز فعالیتی ثبت نشده است." />
            ) : (
              <ul className="divide-y divide-surface-border text-xs">
                {stats.recentAudit.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <span className="font-bold">{entry.actor}</span> — {entry.action}
                      <span className="text-ink-subtle"> ({entry.entity})</span>
                    </span>
                    <span className="text-[11px] text-ink-subtle">{formatDate(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      )}
    </div>
  )
}
