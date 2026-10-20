import { useState, type FormEvent } from 'react'
import { post, type OrderResponse } from '../lib/api'
import { price, toFa } from '../lib/format'

const statusLabels: Record<string, string> = {
  pending: 'در انتظار پرداخت / تأیید',
  paid: 'پرداخت‌شده',
  processing: 'در حال آماده‌سازی',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغو‌شده',
}

export default function Track() {
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setLoading(true)
    setError(null)
    setOrder(null)

    try {
      const result = await post<{ ok: boolean; order: OrderResponse }>('/orders/track', {
        orderNumber: String(form.get('orderNumber') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim(),
      })
      setOrder(result.order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'سفارش پیدا نشد.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-extrabold">پیگیری سفارش</h1>
        <p className="mt-1 text-sm text-ink-muted">شماره سفارش و شماره همراه ثبت‌شده را وارد کنید.</p>

        <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl border border-surface-border bg-white p-5 shadow-card sm:grid-cols-2">
          <label className="block text-xs">
            <span className="mb-1 block text-ink-muted">شماره سفارش</span>
            <input
              name="orderNumber"
              required
              placeholder="ND-261019-XXXXXX"
              className="h-11 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-sm ltr-inline"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-ink-muted">شماره همراه</span>
            <input
              name="phone"
              required
              inputMode="tel"
              placeholder="09120000000"
              className="h-11 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-sm ltr-inline"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-primary py-3 text-sm font-extrabold text-white hover:bg-primary-light disabled:opacity-60 sm:col-span-2"
          >
            {loading ? 'در حال جستجو...' : 'پیگیری'}
          </button>
        </form>

        {error && <p className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

        {order && (
          <div className="mt-6 rounded-2xl border border-surface-border bg-white p-5 shadow-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs text-ink-subtle">شماره سفارش</div>
                <div className="ltr-inline text-sm font-extrabold text-primary">{order.orderNumber}</div>
              </div>
              <span className="rounded-lg bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary-dark">
                {statusLabels[order.status] ?? order.status}
              </span>
            </div>

            <ul className="mb-4 grid gap-2 border-y border-surface-border py-3 text-sm">
              {order.items.map((item) => (
                <li key={item.slug} className="flex justify-between gap-3">
                  <span className="text-ink-muted">
                    {item.name} × {toFa(item.quantity)}
                  </span>
                  <span className="font-bold">{price(item.lineTotal)}</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-between text-sm">
              <span className="text-ink-muted">مبلغ کل</span>
              <span className="font-extrabold text-primary">{price(order.total)} تومان</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
