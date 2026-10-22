import { useEffect, useState, type FormEvent } from 'react'
import { get, patch, type AdminGateway } from '../../lib/api'
import { AdminCard, AdminPageHeader, ErrorNote, Field, Notice, inputClass } from './adminUi'

/**
 * اتصال درگاه‌های پرداخت.
 *
 * کلیدها فقط ماسک‌شده برمی‌گردند؛ اگر فیلد دست‌نخورده بماند، مقدار قبلی حفظ
 * می‌شود و برای پاک‌کردن باید فیلد خالی شود.
 */
export default function AdminPayments() {
  const [gateways, setGateways] = useState<AdminGateway[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    get<{ items: AdminGateway[] }>('/admin/payment-gateways')
      .then((data) => {
        if (active) setGateways(data.items)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت درگاه‌ها ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  function update(gateway: AdminGateway) {
    setGateways((current) => current.map((item) => (item.id === gateway.id ? gateway : item)))
  }

  return (
    <div>
      <AdminPageHeader
        title="درگاه‌های پرداخت"
        description="فعال‌سازی روش‌های پرداخت و ثبت شناسهٔ پذیرنده. مقدارهای حساس رمزنگاری می‌شوند و فقط چهار کاراکتر آخرشان نمایش داده می‌شود."
      />

      <Notice message={notice} />
      <ErrorNote message={error} />

      {loading && <p className="py-10 text-center text-sm text-ink-muted">در حال بارگذاری...</p>}

      <div className="mt-3 grid gap-4">
        {gateways.map((gateway) => (
          <GatewayCard
            key={gateway.id}
            gateway={gateway}
            onSaved={(saved, message) => {
              update(saved)
              setError(null)
              setNotice(message)
            }}
            onError={(message) => {
              setNotice(null)
              setError(message)
            }}
          />
        ))}
      </div>

      {!loading && gateways.length === 0 && !error && (
        <p className="py-10 text-center text-sm text-ink-muted">درگاهی ثبت نشده است.</p>
      )}
    </div>
  )
}

function GatewayCard({
  gateway,
  onSaved,
  onError,
}: {
  gateway: AdminGateway
  onSaved: (gateway: AdminGateway, message: string) => void
  onError: (message: string) => void
}) {
  const [form, setForm] = useState({
    label: gateway.label,
    description: gateway.description ?? '',
    isActive: gateway.isActive,
    isSandbox: gateway.isSandbox,
    merchantId: '',
    apiKey: '',
  })
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)

    const payload: Record<string, unknown> = {
      label: form.label,
      description: form.description,
      isActive: form.isActive,
      isSandbox: form.isSandbox,
    }

    // فیلد خالی یعنی «دست نزن»؛ برای پاک‌کردن مقدار، دکمهٔ پاک‌کردن استفاده می‌شود.
    if (form.merchantId) payload.merchantId = form.merchantId
    if (form.apiKey) payload.apiKey = form.apiKey

    try {
      const result = await patch<{ gateway: AdminGateway; message: string }>(
        `/admin/payment-gateways/${gateway.id}`,
        payload,
      )
      setForm((current) => ({ ...current, merchantId: '', apiKey: '' }))
      onSaved(result.gateway, result.message)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'ذخیرهٔ درگاه ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  async function clearSecret(field: 'merchantId' | 'apiKey') {
    if (!window.confirm('این مقدار از درگاه پاک شود؟')) return
    setSaving(true)

    try {
      const result = await patch<{ gateway: AdminGateway; message: string }>(
        `/admin/payment-gateways/${gateway.id}`,
        { [field]: '' },
      )
      onSaved(result.gateway, 'مقدار پاک شد.')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'پاک‌کردن مقدار ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminCard className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold">{gateway.label}</h2>
          <p className="mt-1 text-[11px] text-ink-muted">{gateway.description || gateway.key}</p>
        </div>
        <span
          className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
            gateway.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-muted text-ink-muted'
          }`}
        >
          {gateway.isActive ? 'فعال در فروشگاه' : 'غیرفعال'}
        </span>
      </div>

      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="عنوان نمایشی">
            <input
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              className={inputClass}
              maxLength={80}
            />
          </Field>
          <Field label="توضیح کوتاه">
            <input
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className={inputClass}
              maxLength={300}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="شناسهٔ پذیرنده / مرچنت"
            hint={gateway.hasMerchantId ? `ذخیره‌شده: ${gateway.merchantId ?? ''}` : 'هنوز ثبت نشده است.'}
          >
            <div className="flex gap-2">
              <input
                value={form.merchantId}
                onChange={(event) => setForm((current) => ({ ...current, merchantId: event.target.value }))}
                className={`${inputClass} ltr-inline`}
                dir="ltr"
                placeholder={gateway.hasMerchantId ? 'برای تغییر، مقدار تازه را وارد کنید' : 'merchant id'}
              />
              {gateway.hasMerchantId && (
                <button
                  type="button"
                  onClick={() => clearSecret('merchantId')}
                  className="whitespace-nowrap rounded-xl border border-danger/30 px-3 text-[11px] font-bold text-danger"
                >
                  پاک‌کردن
                </button>
              )}
            </div>
          </Field>

          <Field
            label="کلید API"
            hint={gateway.hasApiKey ? `ذخیره‌شده: ${gateway.apiKey ?? ''}` : 'برای این درگاه لازم نیست.'}
          >
            <div className="flex gap-2">
              <input
                value={form.apiKey}
                onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
                className={`${inputClass} ltr-inline`}
                dir="ltr"
                placeholder={gateway.hasApiKey ? 'برای تغییر، کلید تازه را وارد کنید' : 'api key'}
              />
              {gateway.hasApiKey && (
                <button
                  type="button"
                  onClick={() => clearSecret('apiKey')}
                  className="whitespace-nowrap rounded-xl border border-danger/30 px-3 text-[11px] font-bold text-danger"
                >
                  پاک‌کردن
                </button>
              )}
            </div>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-xs font-bold">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              className="h-4 w-4 accent-secondary"
            />
            نمایش در فروشگاه
          </label>
          <label className="flex items-center gap-2 text-xs font-bold">
            <input
              type="checkbox"
              checked={form.isSandbox}
              onChange={(event) => setForm((current) => ({ ...current, isSandbox: event.target.checked }))}
              className="h-4 w-4 accent-secondary"
            />
            حالت آزمایشی (sandbox)
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mr-auto rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-light disabled:opacity-60"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
        </div>
      </form>
    </AdminCard>
  )
}
