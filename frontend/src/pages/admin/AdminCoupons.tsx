import { useEffect, useState, type FormEvent } from 'react'
import { del, get, patch, post, type AdminCoupon, type Paginated } from '../../lib/api'
import { formatDate, price, percent, toFa } from '../../lib/format'
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  ErrorNote,
  Field,
  Modal,
  Notice,
  Pagination,
  inputClass,
} from './adminUi'

export default function AdminCoupons() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paginated<AdminCoupon> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editor, setEditor] = useState<{ coupon: AdminCoupon | null } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ page: String(page), perPage: '30' })
    if (search) params.set('q', search)
    if (status) params.set('status', status)

    get<Paginated<AdminCoupon>>(`/admin/coupons?${params}`)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت کدهای تخفیف ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [search, status, page, reloadKey])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(query.trim())
  }

  async function remove(coupon: AdminCoupon) {
    if (!window.confirm(`کد تخفیف «${coupon.code}» حذف شود؟`)) return

    setError(null)
    try {
      await del(`/admin/coupons/${coupon.id}`)
      setNotice('کد تخفیف حذف شد.')
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف کد تخفیف ناموفق بود.')
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="کدهای تخفیف"
        description="ساخت و ویرایش کد تخفیف درصدی با سقف استفاده و بازهٔ اعتبار. سفارش‌های قبلی کد استفاده‌شده را در خود نگه می‌دارند."
        actions={
          <button
            type="button"
            onClick={() => {
              setNotice(null)
              setEditor({ coupon: null })
            }}
            className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-light"
          >
            کد تخفیف جدید
          </button>
        }
      />

      <Notice message={notice} />
      <ErrorNote message={error} />

      <AdminCard className="mt-3 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border p-3">
          <form onSubmit={submitSearch} className="flex flex-1 flex-wrap gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجوی کد یا عنوان..."
              className={`${inputClass} sm:max-w-xs`}
              aria-label="جستجوی کد تخفیف"
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
            aria-label="وضعیت کد تخفیف"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
            <option value="expired">منقضی‌شده</option>
          </select>
        </div>

        {loading && <EmptyState message="در حال بارگذاری..." />}
        {!loading && data && data.items.length === 0 && <EmptyState message="کد تخفیفی با این فیلترها پیدا نشد." />}

        {!loading && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-right text-xs">
              <thead className="bg-surface-muted text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-bold">کد</th>
                  <th className="px-4 py-3 font-bold">عنوان</th>
                  <th className="px-4 py-3 font-bold">تخفیف</th>
                  <th className="px-4 py-3 font-bold">حداقل خرید</th>
                  <th className="px-4 py-3 font-bold">استفاده</th>
                  <th className="px-4 py-3 font-bold">اعتبار</th>
                  <th className="px-4 py-3 font-bold">وضعیت</th>
                  <th className="px-4 py-3 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.items.map((coupon) => {
                  const expired = !!coupon.expiresAt && coupon.expiresAt < new Date().toISOString().slice(0, 10)
                  return (
                    <tr key={coupon.id} className="hover:bg-surface-muted/60">
                      <td className="ltr-inline px-4 py-3 font-extrabold text-primary">{coupon.code}</td>
                      <td className="px-4 py-3">{coupon.label}</td>
                      <td className="px-4 py-3 font-bold">{percent(coupon.percent)}</td>
                      <td className="px-4 py-3 text-ink-muted">
                        {coupon.minSubtotal ? `${price(coupon.minSubtotal)} تومان` : '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {toFa(coupon.usedCount)}
                        {coupon.maxUses !== null ? ` / ${toFa(coupon.maxUses)}` : ' / نامحدود'}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {coupon.startsAt ? formatDate(coupon.startsAt) : '—'}
                        {' تا '}
                        {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'نامحدود'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                            !coupon.isActive
                              ? 'bg-surface-muted text-ink-muted'
                              : expired
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {!coupon.isActive ? 'غیرفعال' : expired ? 'منقضی' : 'فعال'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNotice(null)
                              setEditor({ coupon })
                            }}
                            className="rounded-lg border border-surface-border px-3 py-1.5 font-bold hover:bg-surface-muted"
                          >
                            ویرایش
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(coupon)}
                            className="rounded-lg border border-danger/30 px-3 py-1.5 font-bold text-danger hover:bg-danger/5"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onChange={setPage} />
        )}
      </AdminCard>

      {editor && (
        <CouponEditor
          coupon={editor.coupon}
          onClose={() => setEditor(null)}
          onSaved={(message) => {
            setEditor(null)
            setNotice(message)
            setReloadKey((key) => key + 1)
          }}
        />
      )}
    </div>
  )
}

function CouponEditor({
  coupon,
  onClose,
  onSaved,
}: {
  coupon: AdminCoupon | null
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [form, setForm] = useState({
    code: coupon?.code ?? '',
    label: coupon?.label ?? '',
    percent: coupon ? String(coupon.percent) : '10',
    minSubtotal: coupon?.minSubtotal ? String(coupon.minSubtotal) : '',
    maxUses: coupon?.maxUses ? String(coupon.maxUses) : '',
    startsAt: coupon?.startsAt ?? '',
    expiresAt: coupon?.expiresAt ?? '',
    isActive: coupon?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      code: form.code.trim().toUpperCase(),
      label: form.label.trim(),
      percent: Number(form.percent),
      minSubtotal: form.minSubtotal === '' ? null : Number(form.minSubtotal),
      maxUses: form.maxUses === '' ? null : Number(form.maxUses),
      startsAt: form.startsAt === '' ? null : form.startsAt,
      expiresAt: form.expiresAt === '' ? null : form.expiresAt,
      isActive: form.isActive,
    }

    try {
      if (coupon) {
        await patch(`/admin/coupons/${coupon.id}`, payload)
        onSaved('کد تخفیف به‌روزرسانی شد.')
      } else {
        await post('/admin/coupons', payload)
        onSaved('کد تخفیف ساخته شد.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیرهٔ کد تخفیف ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={coupon ? `ویرایش ${coupon.code}` : 'کد تخفیف جدید'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="کد">
            <input
              required
              value={form.code}
              onChange={(event) => set('code', event.target.value.toUpperCase())}
              className={`${inputClass} ltr-inline`}
              maxLength={40}
              placeholder="WELCOME10"
            />
          </Field>
          <Field label="درصد تخفیف">
            <input
              required
              type="number"
              min={1}
              max={100}
              value={form.percent}
              onChange={(event) => set('percent', event.target.value)}
              className={`${inputClass} ltr-inline`}
            />
          </Field>
        </div>

        <Field label="عنوان نمایشی">
          <input
            required
            value={form.label}
            onChange={(event) => set('label', event.target.value)}
            className={inputClass}
            maxLength={120}
            placeholder="۱۰٪ تخفیف خوش‌آمدگویی"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="حداقل مبلغ خرید (تومان)" hint="خالی یعنی بدون حداقل.">
            <input
              type="number"
              min={0}
              value={form.minSubtotal}
              onChange={(event) => set('minSubtotal', event.target.value)}
              className={`${inputClass} ltr-inline`}
            />
          </Field>
          <Field label="سقف دفعات استفاده" hint="خالی یعنی نامحدود.">
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(event) => set('maxUses', event.target.value)}
              className={`${inputClass} ltr-inline`}
            />
          </Field>
          <Field label="تاریخ شروع">
            <input
              type="date"
              value={form.startsAt}
              onChange={(event) => set('startsAt', event.target.value)}
              className={`${inputClass} ltr-inline`}
            />
          </Field>
          <Field label="تاریخ پایان" hint="تا پایان همین روز معتبر است.">
            <input
              type="date"
              value={form.expiresAt}
              onChange={(event) => set('expiresAt', event.target.value)}
              className={`${inputClass} ltr-inline`}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-xs font-bold">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => set('isActive', event.target.checked)}
            className="h-4 w-4 accent-secondary"
          />
          کد فعال باشد
        </label>

        <ErrorNote message={error} />

        <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-surface-border px-4 py-2.5 text-xs font-bold">
            انصراف
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-light disabled:opacity-60"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیرهٔ کد تخفیف'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
