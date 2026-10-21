import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { get, type OrderResponse } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { price, toFa } from '../lib/format'
import { useNoindex } from '../lib/seo'

const statusLabels: Record<string, string> = {
  pending: 'در انتظار تأیید',
  paid: 'پرداخت‌شده',
  processing: 'در حال آماده‌سازی',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغو‌شده',
}

export default function Account() {
  useNoindex('حساب کاربری', '/account')
  const { user, ready, signOut } = useAuth()
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    get<{ items: OrderResponse[] }>('/account/orders')
      .then((data) => setOrders(data.items))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [user])

  if (ready && !user) return <Navigate to="/login" replace />

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">حساب کاربری</h1>
          <p className="mt-1 text-sm text-ink-muted">{user?.fullName} — {user?.phone}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-xl border border-surface-border bg-white px-4 py-2 text-xs font-bold text-danger"
        >
          خروج از حساب
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-3">
          <div className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="mb-3 text-sm font-extrabold">باشگاه مشتریان</h2>
            <p className="text-xs text-ink-muted">سطح: <span className="font-bold text-ink">{user?.loyaltyTier}</span></p>
            <p className="mt-1 text-xs text-ink-muted">
              امتیاز: <span className="font-bold text-ink">{toFa(user?.loyaltyPoints ?? 0)}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-surface-border bg-white p-5 text-xs text-ink-muted">
            <h2 className="mb-2 text-sm font-extrabold text-ink">دسترسی سریع</h2>
            <ul className="grid gap-2">
              <li><Link to="/shop" className="hover:text-primary">فروشگاه</Link></li>
              <li><Link to="/track" className="hover:text-primary">پیگیری سفارش</Link></li>
              <li><Link to="/cart" className="hover:text-primary">سبد خرید</Link></li>
            </ul>
          </div>
        </aside>

        <section className="rounded-2xl border border-surface-border bg-white p-5">
          <h2 className="mb-4 text-sm font-extrabold">سفارش‌های من</h2>

          {loading && <p className="text-sm text-ink-muted">در حال بارگذاری...</p>}

          {!loading && orders.length === 0 && (
            <div className="rounded-xl bg-surface-muted p-6 text-center">
              <p className="text-sm text-ink-muted">هنوز سفارشی ثبت نکرده‌اید.</p>
              <Link to="/shop" className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white">
                شروع خرید
              </Link>
            </div>
          )}

          <ul className="grid gap-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-xl border border-surface-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="ltr-inline font-bold text-primary">{order.orderNumber}</span>
                  <span className="rounded-lg bg-secondary/10 px-2 py-1 font-bold text-secondary-dark">
                    {statusLabels[order.status] ?? order.status}
                  </span>
                </div>
                <ul className="mt-3 grid gap-1 text-xs text-ink-muted">
                  {order.items.map((item) => (
                    <li key={item.slug}>
                      {item.name} × {toFa(item.quantity)}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between border-t border-surface-border pt-2 text-sm">
                  <span className="text-ink-muted">مبلغ</span>
                  <span className="font-extrabold text-primary">{price(order.total)} تومان</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
