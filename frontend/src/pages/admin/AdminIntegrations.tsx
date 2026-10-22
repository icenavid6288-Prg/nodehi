import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { get, patch } from '../../lib/api'
import { AdminCard, AdminPageHeader, ErrorNote, Field, Notice, inputClass, textareaClass } from './adminUi'

type IntegrationItem = {
  key: string
  label: string
  type: 'text' | 'textarea'
  hint: string | null
  value: string
}

type Status = {
  sms: { configured: boolean; sender: string | null }
  zarinpal: { active: boolean; sandbox: boolean; merchant: string | null }
  site: { url: string; php: string; storeName: string }
}

/** یکپارچه‌سازی سایت: شناسه‌های سئو/آنالیتیکس و وضعیت اتصال سرویس‌ها. */
export default function AdminIntegrations() {
  const [items, setItems] = useState<IntegrationItem[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    get<{ items: IntegrationItem[]; status: Status }>('/admin/integrations')
      .then((data) => {
        if (!active) return
        setItems(data.items)
        setStatus(data.status)
        setValues(Object.fromEntries(data.items.map((item) => [item.key, item.value])))
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت تنظیمات یکپارچه‌سازی ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      await patch('/admin/integrations', { items: values })
      setNotice('تنظیمات یکپارچه‌سازی ذخیره شد. پس از بارگذاری بعدی سایت اعمال می‌شود.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیرهٔ تنظیمات ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="یکپارچه‌سازی و سئو"
        description="شناسه‌های ابزارهای تحلیلی و تأیید سرچ کنسول، به‌همراه وضعیت اتصال پیامک و درگاه پرداخت."
      />

      <Notice message={notice} />
      <ErrorNote message={error} />

      {loading && <p className="py-10 text-center text-sm text-ink-muted">در حال بارگذاری...</p>}

      {status && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <ConnectionCard
            title="سرویس پیامک"
            ok={status.sms.configured}
            to="/admin/sms"
            lines={[
              status.sms.configured ? 'کلید و قالب پیامک ثبت شده است.' : 'کلید کاوه‌نگار یا قالب OTP ثبت نشده.',
              status.sms.sender ? `فرستنده: ${status.sms.sender}` : 'شمارهٔ فرستنده تعیین نشده.',
            ]}
          />
          <ConnectionCard
            title="درگاه پرداخت آنلاین"
            ok={status.zarinpal.active && status.zarinpal.merchant !== null}
            to="/admin/payments"
            lines={[
              status.zarinpal.merchant ? `پذیرنده: ${status.zarinpal.merchant}` : 'شناسهٔ پذیرنده ثبت نشده.',
              status.zarinpal.active
                ? status.zarinpal.sandbox
                  ? 'حالت آزمایشی (sandbox) فعال است.'
                  : 'حالت عملیاتی فعال است.'
                : 'درگاه در فروشگاه غیرفعال است.',
            ]}
          />
          <ConnectionCard
            title="سایت"
            ok
            lines={[
              status.site.storeName || 'بدون نام',
              status.site.url,
              `PHP ${status.site.php}`,
            ]}
          />
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <AdminCard className="p-5">
          <h2 className="mb-4 text-sm font-extrabold">ابزارهای تحلیلی و تأیید مالکیت</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item.key} className={item.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <Field label={item.label} hint={item.hint ?? undefined}>
                  {item.type === 'textarea' ? (
                    <textarea
                      rows={5}
                      value={values[item.key] ?? ''}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [item.key]: event.target.value }))
                      }
                      className={`${textareaClass} ltr-inline font-mono text-[11px]`}
                      dir="ltr"
                    />
                  ) : (
                    <input
                      value={values[item.key] ?? ''}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [item.key]: event.target.value }))
                      }
                      className={`${inputClass} ltr-inline`}
                      dir="ltr"
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>
        </AdminCard>

        {items.length > 0 && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white hover:bg-primary-light disabled:opacity-60"
            >
              {saving ? 'در حال ذخیره...' : 'ذخیرهٔ یکپارچه‌سازی'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

function ConnectionCard({
  title,
  ok,
  lines,
  to,
}: {
  title: string
  ok: boolean
  lines: string[]
  to?: string
}) {
  return (
    <AdminCard className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold">{title}</h3>
        <span
          className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
            ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {ok ? 'متصل' : 'نیازمند تنظیم'}
        </span>
      </div>
      <ul className="space-y-1 text-[11px] leading-6 text-ink-muted">
        {lines.map((line) => (
          <li key={line} className="ltr-inline">
            {line}
          </li>
        ))}
      </ul>
      {to && (
        <Link to={to} className="mt-3 inline-block text-[11px] font-bold text-secondary-dark hover:underline">
          تنظیم اتصال
        </Link>
      )}
    </AdminCard>
  )
}
