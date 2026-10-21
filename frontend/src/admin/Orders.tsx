import { useCallback, useEffect, useState } from 'react'
import { get, patch } from '../lib/api'
import { formatDate, price, toFa } from '../lib/format'
import type { AdminOrderDetail, AdminOrderList } from './types'
import {
  AdminCard,
  EmptyState,
  ErrorNote,
  PageHeader,
  Pagination,
  StatusBadge,
  SuccessNote,
  orderStatusLabels,
} from './ui'

/** انتقال‌های مجاز — سرور هم همین‌ها را اجبار می‌کند؛ این فقط برای UX است. */
const nextStatuses: Record<string, string[]> = {
  pending: ['pending', 'paid', 'processing', 'cancelled'],
  paid: ['paid', 'processing', 'cancelled'],
  processing: ['processing', 'shipped', 'cancelled'],
  shipped: ['shipped', 'delivered'],
  delivered: ['delivered'],
  cancelled: ['cancelled'],
}

const statusOptions = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']

export default function Orders() {
  const [data, setData] = useState<AdminOrderList | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [detail, setDetail] = useState<AdminOrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [form, setForm] = useState({ status: '', trackingCode: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ page: String(page), perPage: '15' })
    if (status) params.set('status', status)
    if (query.trim()) params.set('q', query.trim())

    get<AdminOrderList>(`/admin/orders?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'دریافت سفارش‌ها ناموفق بود.'))
      .finally(() => setLoading(false))
  }, [page, query, status])

  useEffect(() => {
    load()
  }, [load])

  async function open(orderNumber: string) {
    setDetailLoading(true)
    setDetailError(null)
    setMessage(null)

    try {
      const result = await get<{ order: AdminOrderDetail }>(`/admin/orders/${orderNumber}`)
      setDetail(result.order)
      setForm({
        status: result.order.status,
        trackingCode: result.order.trackingCode ?? '',
        note: result.order.note ?? '',
      })
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'دریافت سفارش ناموفق بود.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function save() {
    if (!detail) return

    setSaving(true)
    setDetailError(null)
    setMessage(null)

    try {
      const result = await patch<{ order: AdminOrderDetail }>(`/admin/orders/${detail.orderNumber}`, {
        status: form.status,
        trackingCode: form.trackingCode.trim(),
        note: form.note.trim(),
      })
      setDetail(result.order)
      setForm({
        status: result.order.status,
        trackingCode: result.order.trackingCode ?? '',
        note: result.order.note ?? '',
      })
      setMessage('سفارش به‌روزرسانی شد.')
      load()
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'ذخیرهٔ سفارش ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  const allowed = detail ? nextStatuses[detail.status] ?? [detail.status] : []

  return (
    <div>
      <PageHeader title="سفارش‌ها" description="بررسی سفارش‌ها، تغییر وضعیت و ثبت کد رهگیری." />

      <ErrorNote message={error} />
      <SuccessNote message={message} />

      {detail && (
        <AdminCard className="mb-4 p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-ink-subtle">شماره سفارش</div>
              <div className="ltr-inline text-base font-extrabold text-primary">{detail.orderNumber}</div>
              <div className="mt-1 text-[11px] text-ink-muted">
                ثبت: {formatDate(detail.createdAt)} — {detail.customer.firstName} {detail.customer.lastName}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={detail.status} />
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg border border-surface-border px-3 py-1.5 text-xs"
              >
                بستن
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-3">
              <div className="overflow-x-auto rounded-xl border border-surface-border">
                <table className="w-full min-w-[420px] text-right text-xs">
                  <thead className="bg-surface-muted text-ink-muted">
                    <tr>
                      <th className="p-2 font-bold">کالا</th>
                      <th className="p-2 font-bold">تعداد</th>
                      <th className="p-2 font-bold">قیمت واحد</th>
                      <th className="p-2 font-bold">جمع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {detail.items.map((item) => (
                      <tr key={item.slug}>
                        <td className="p-2">{item.name}</td>
                        <td className="p-2">{toFa(item.quantity)}</td>
                        <td className="p-2">{price(item.unitPrice)}</td>
                        <td className="p-2 font-bold">{price(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="grid gap-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">کالاها</dt>
                  <dd>{price(detail.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">تخفیف {detail.couponCode ? `(${detail.couponCode})` : ''}</dt>
                  <dd>{price(detail.discount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">ارسال</dt>
                  <dd>{price(detail.shipping)}</dd>
                </div>
                <div className="flex justify-between border-t border-surface-border pt-1 text-sm">
                  <dt className="font-bold">مبلغ کل</dt>
                  <dd className="font-extrabold text-primary">{price(detail.total)} تومان</dd>
                </div>
              </dl>

              <div className="rounded-xl bg-surface-muted p-3 text-xs leading-6 text-ink-muted">
                <div>
                  <span className="text-ink-subtle">گیرنده: </span>
                  {detail.customer.firstName} {detail.customer.lastName} —{' '}
                  <span dir="ltr">{detail.customer.phone}</span>
                </div>
                <div>
                  <span className="text-ink-subtle">نشانی: </span>
                  {detail.address.province}، {detail.address.city}، {detail.address.line}
                  {detail.address.postalCode ? ` — کد پستی ${detail.address.postalCode}` : ''}
                </div>
                <div>
                  <span className="text-ink-subtle">پرداخت: </span>
                  {detail.paymentMethod} — {detail.shippingMethod}
                </div>
              </div>
            </div>

            <div className="grid content-start gap-3 rounded-xl border border-surface-border p-3">
              <label className="block text-xs">
                <span className="mb-1 block text-ink-muted">وضعیت سفارش</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                  className="h-10 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-sm"
                >
                  {statusOptions
                    .filter((option) => allowed.includes(option))
                    .map((option) => (
                      <option key={option} value={option}>
                        {orderStatusLabels[option] ?? option}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block text-xs">
                <span className="mb-1 block text-ink-muted">کد رهگیری</span>
                <input
                  value={form.trackingCode}
                  onChange={(event) => setForm({ ...form, trackingCode: event.target.value })}
                  dir="ltr"
                  placeholder="TRK-12345"
                  className="h-10 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-sm ltr-inline"
                />
              </label>

              <label className="block text-xs">
                <span className="mb-1 block text-ink-muted">یادداشت داخلی</span>
                <textarea
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-surface-border bg-surface-muted p-3 text-sm"
                />
              </label>

              <ErrorNote message={detailError} />

              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-60"
              >
                {saving ? 'در حال ذخیره...' : 'ذخیرهٔ تغییرات'}
              </button>

              {detail.status === 'cancelled' && (
                <p className="text-[11px] leading-5 text-ink-subtle">
                  سفارش لغو شده است و موجودی اقلام به انبار برگشته است.
                </p>
              )}
            </div>
          </div>
        </AdminCard>
      )}

      {detailLoading && <p className="mb-3 text-sm text-ink-muted">در حال دریافت سفارش...</p>}

      <AdminCard className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border p-3">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="شماره سفارش، نام یا شماره همراه..."
            className="h-10 flex-1 rounded-xl border border-surface-border bg-surface-muted px-3 text-sm outline-none focus:border-secondary focus:bg-white"
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className="h-10 rounded-xl border border-surface-border bg-white px-3 text-xs"
          >
            <option value="">همهٔ وضعیت‌ها</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {orderStatusLabels[option] ?? option}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="p-6 text-center text-sm text-ink-muted">در حال بارگذاری...</p>}

        {!loading && data && data.items.length === 0 && (
          <div className="p-4">
            <EmptyState text="سفارشی با این فیلتر پیدا نشد." />
          </div>
        )}

        {!loading && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-xs">
              <thead className="bg-surface-muted text-ink-muted">
                <tr>
                  <th className="p-3 font-bold">شماره سفارش</th>
                  <th className="p-3 font-bold">مشتری</th>
                  <th className="p-3 font-bold">اقلام</th>
                  <th className="p-3 font-bold">مبلغ</th>
                  <th className="p-3 font-bold">وضعیت</th>
                  <th className="p-3 font-bold">تاریخ</th>
                  <th className="p-3 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.items.map((order) => (
                  <tr key={order.orderNumber} className="hover:bg-surface-muted/50">
                    <td className="p-3 ltr-inline font-bold text-primary">{order.orderNumber}</td>
                    <td className="p-3">
                      {order.customerName}
                      <div className="mt-1 text-[11px] text-ink-subtle" dir="ltr">
                        {order.customerPhone}
                      </div>
                    </td>
                    <td className="p-3">{toFa(order.itemCount)}</td>
                    <td className="p-3 font-bold">{price(order.total)}</td>
                    <td className="p-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="p-3 text-[11px] text-ink-muted">{formatDate(order.createdAt)}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => open(order.orderNumber)}
                        className="rounded-lg border border-surface-border px-2.5 py-1.5 font-bold hover:border-secondary"
                      >
                        جزئیات
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="border-t border-surface-border p-3">
            <div className="mb-2 text-center text-[11px] text-ink-subtle">{toFa(data.total)} سفارش</div>
            <Pagination page={data.page} pageCount={data.pageCount} onChange={setPage} />
          </div>
        )}
      </AdminCard>
    </div>
  )
}
