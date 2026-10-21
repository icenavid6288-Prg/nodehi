import { useEffect, useState, type FormEvent } from 'react'
import { get, patch, type AdminOrderDetail, type AdminOrderSummary, type Paginated } from '../../lib/api'
import { formatDate, price, toFa } from '../../lib/format'
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  ErrorNote,
  Field,
  Modal,
  Notice,
  ORDER_NEXT_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  Pagination,
  StatusPill,
  inputClass,
  textareaClass,
} from './adminUi'

export default function AdminOrders() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paginated<AdminOrderSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selected, setSelected] = useState<AdminOrderSummary | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ page: String(page), perPage: '20' })
    if (search) params.set('q', search)
    if (status) params.set('status', status)
    if (paymentMethod) params.set('paymentMethod', paymentMethod)

    get<Paginated<AdminOrderSummary>>(`/admin/orders?${params}`)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت سفارش‌ها ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [search, status, paymentMethod, page, reloadKey])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(query.trim())
  }

  return (
    <div>
      <AdminPageHeader
        title="سفارش‌ها"
        description="پیگیری سفارش‌ها، ثبت کد رهگیری و جابه‌جایی وضعیت در مسیر مجاز. لغو سفارش پرداخت در محل، موجودی را به انبار برمی‌گرداند."
      />

      <Notice message={notice} />
      <ErrorNote message={error} />

      <AdminCard className="mt-3 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border p-3">
          <form onSubmit={submitSearch} className="flex flex-1 flex-wrap gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="شماره سفارش، تلفن، نام یا کد رهگیری..."
              className={`${inputClass} sm:max-w-sm`}
              aria-label="جستجوی سفارش"
            />
            <button type="submit" className="rounded-xl bg-surface-muted px-4 text-xs font-bold hover:bg-surface-border">
              جستجو
            </button>
          </form>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className={`${inputClass} w-auto`}
            aria-label="وضعیت سفارش"
          >
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={paymentMethod}
            onChange={(event) => {
              setPaymentMethod(event.target.value)
              setPage(1)
            }}
            className={`${inputClass} w-auto`}
            aria-label="روش پرداخت"
          >
            <option value="">همه روش‌های پرداخت</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {loading && <EmptyState message="در حال بارگذاری..." />}
        {!loading && data && data.items.length === 0 && <EmptyState message="سفارشی با این فیلترها پیدا نشد." />}

        {!loading && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-right text-xs">
              <thead className="bg-surface-muted text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-bold">شماره سفارش</th>
                  <th className="px-4 py-3 font-bold">مشتری</th>
                  <th className="px-4 py-3 font-bold">مبلغ</th>
                  <th className="px-4 py-3 font-bold">پرداخت</th>
                  <th className="px-4 py-3 font-bold">وضعیت</th>
                  <th className="px-4 py-3 font-bold">تاریخ</th>
                  <th className="px-4 py-3 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.items.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <p className="ltr-inline font-bold text-primary">{order.orderNumber}</p>
                      <p className="mt-1 text-[10px] text-ink-subtle">{toFa(order.itemCount ?? 0)} قلم</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{order.customerName}</p>
                      <p className="ltr-inline mt-1 text-[10px] text-ink-subtle">{order.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 font-bold">{price(order.total)} تومان</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={order.status} /></td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(order)}
                        className="rounded-lg border border-surface-border px-3 py-1.5 font-bold hover:bg-surface-muted"
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

        {data && data.total > 0 && (
          <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onChange={setPage} />
        )}
      </AdminCard>

      {selected && (
        <OrderDetailModal
          orderId={selected.id}
          onClose={() => setSelected(null)}
          onUpdated={(message) => {
            setNotice(message)
            setReloadKey((key) => key + 1)
          }}
        />
      )}
    </div>
  )
}

function OrderDetailModal({
  orderId,
  onClose,
  onUpdated,
}: {
  orderId: number
  onClose: () => void
  onUpdated: (message: string) => void
}) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [trackingCode, setTrackingCode] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    let active = true
    get<{ order: AdminOrderDetail }>(`/admin/orders/${orderId}`)
      .then((result) => {
        if (!active) return
        setOrder(result.order)
        setStatus(result.order.status)
        setTrackingCode(result.order.trackingCode ?? '')
        setNote(result.order.note ?? '')
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت سفارش ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [orderId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const result = await patch<{ order: AdminOrderDetail }>(`/admin/orders/${orderId}`, {
        status,
        trackingCode: trackingCode.trim() === '' ? null : trackingCode.trim(),
        note: note.trim() === '' ? null : note.trim(),
      })
      setOrder(result.order)
      setStatus(result.order.status)
      onUpdated('سفارش به‌روزرسانی شد.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیرهٔ سفارش ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  const nextStatuses = order ? ORDER_NEXT_STATUSES[order.status] ?? [] : []
  const statusOptions = order ? [order.status, ...nextStatuses] : []

  return (
    <Modal title="جزئیات سفارش" onClose={onClose} wide>
      {loading && <p className="text-sm text-ink-muted">در حال بارگذاری...</p>}
      <ErrorNote message={error} />

      {!loading && order && (
        <div className="grid gap-5">
          <div className="grid gap-3 rounded-xl bg-surface-muted p-4 text-xs sm:grid-cols-2">
            <div>
              <p className="font-extrabold">{order.customerName}</p>
              <p className="ltr-inline mt-1 text-ink-muted">{order.customerPhone}</p>
              {order.customerEmail && <p className="ltr-inline mt-1 text-ink-muted">{order.customerEmail}</p>}
            </div>
            <div className="text-ink-muted">
              <p>{order.shippingAddress.province}، {order.shippingAddress.city}</p>
              <p className="mt-1">{order.shippingAddress.line}</p>
              {order.shippingAddress.postalCode && (
                <p className="ltr-inline mt-1">کد پستی: {order.shippingAddress.postalCode}</p>
              )}
            </div>
            <p>
              <span className="text-ink-muted">شماره سفارش: </span>
              <span className="ltr-inline font-bold">{order.orderNumber}</span>
            </p>
            <p>
              <span className="text-ink-muted">تاریخ ثبت: </span>
              {formatDate(order.createdAt)}
            </p>
            <p>
              <span className="text-ink-muted">روش پرداخت: </span>
              {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
            </p>
            <p>
              <span className="text-ink-muted">وضعیت فعلی: </span>
              <StatusPill status={order.status} />
            </p>
            {order.couponCode && (
              <p>
                <span className="text-ink-muted">کد تخفیف: </span>
                <span className="ltr-inline font-bold">{order.couponCode}</span>
              </p>
            )}
            {order.payment.refId && (
              <p>
                <span className="text-ink-muted">شماره پیگیری پرداخت: </span>
                <span className="ltr-inline">{order.payment.refId}</span>
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full min-w-[420px] text-right text-xs">
              <thead className="bg-surface-muted text-ink-muted">
                <tr>
                  <th className="px-3 py-2 font-bold">کالا</th>
                  <th className="px-3 py-2 font-bold">تعداد</th>
                  <th className="px-3 py-2 font-bold">قیمت واحد</th>
                  <th className="px-3 py-2 font-bold">جمع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {order.items.map((item) => (
                  <tr key={item.slug}>
                    <td className="px-3 py-2 font-bold">{item.name}</td>
                    <td className="px-3 py-2">{toFa(item.quantity)}</td>
                    <td className="px-3 py-2">{price(item.unitPrice)}</td>
                    <td className="px-3 py-2 font-bold">{price(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-muted text-xs">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-ink-muted">جمع کالاها / تخفیف / ارسال</td>
                  <td className="px-3 py-2">{price(order.subtotal)} / {price(order.discount)} / {price(order.shipping)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-3 py-2 font-extrabold">مبلغ نهایی</td>
                  <td className="px-3 py-2 font-extrabold text-primary">{price(order.total)} تومان</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <form onSubmit={submit} className="grid gap-3 border-t border-surface-border pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="وضعیت سفارش"
                hint={nextStatuses.length === 0 ? 'این سفارش در وضعیت نهایی است.' : undefined}
              >
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  disabled={nextStatuses.length === 0}
                  className={`${inputClass} disabled:bg-surface-muted disabled:text-ink-muted`}
                >
                  {statusOptions.map((value) => (
                    <option key={value} value={value}>{ORDER_STATUS_LABELS[value] ?? value}</option>
                  ))}
                </select>
              </Field>
              <Field label="کد رهگیری پست">
                <input
                  value={trackingCode}
                  onChange={(event) => setTrackingCode(event.target.value)}
                  className={`${inputClass} ltr-inline`}
                  maxLength={60}
                  placeholder="TRK-..."
                />
              </Field>
            </div>

            <Field label="یادداشت داخلی">
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className={textareaClass}
                maxLength={1000}
                placeholder="این یادداشت فقط در پنل مدیریت دیده می‌شود."
              />
            </Field>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-surface-border px-4 py-2.5 text-xs font-bold">
                بستن
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-light disabled:opacity-60"
              >
                {saving ? 'در حال ذخیره...' : 'ذخیرهٔ تغییرات'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  )
}
