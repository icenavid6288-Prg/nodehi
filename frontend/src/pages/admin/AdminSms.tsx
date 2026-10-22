import { useEffect, useState, type FormEvent } from 'react'
import { get, patch, post } from '../../lib/api'
import { AdminCard, AdminPageHeader, ErrorNote, Field, Notice, inputClass } from './adminUi'

type SmsSettings = {
  apiKey: string | null
  hasApiKey: boolean
  source: 'panel' | 'env' | 'none'
  sender: string
  otpTemplate: string
}

/** اتصال کاوه‌نگار: کلید رمزنگاری‌شده، شمارهٔ فرستنده، قالب کد ورود و ارسال آزمایشی. */
export default function AdminSms() {
  const [settings, setSettings] = useState<SmsSettings | null>(null)
  const [configured, setConfigured] = useState(false)
  const [form, setForm] = useState({ apiKey: '', sender: '', otpTemplate: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('پیام آزمایشی نودهی')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    let active = true

    get<{ settings: SmsSettings; configured: boolean }>('/admin/sms')
      .then((data) => {
        if (!active) return
        setSettings(data.settings)
        setConfigured(data.configured)
        setForm({ apiKey: '', sender: data.settings.sender, otpTemplate: data.settings.otpTemplate })
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت تنظیمات پیامک ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const payload: Record<string, string> = {
        sender: form.sender,
        otpTemplate: form.otpTemplate,
      }
      // فیلد خالی یعنی «کلید فعلی را دست نزن».
      if (form.apiKey) payload.apiKey = form.apiKey

      await patch('/admin/sms', payload)
      setNotice('تنظیمات پیامک ذخیره شد.')

      const fresh = await get<{ settings: SmsSettings; configured: boolean }>('/admin/sms')
      setSettings(fresh.settings)
      setConfigured(fresh.configured)
      setForm((current) => ({ ...current, apiKey: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیرهٔ تنظیمات پیامک ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  async function sendTest(event: FormEvent) {
    event.preventDefault()
    setTesting(true)
    setError(null)
    setNotice(null)

    try {
      await post('/admin/sms/test', { phone: testPhone.trim(), message: testMessage.trim() })
      setNotice('پیام آزمایشی ارسال شد؛ وضعیت تحویل را در پنل کاوه‌نگار ببینید.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال پیام آزمایشی ناموفق بود.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="سرویس پیامک"
        description="کد ورود پنل و مشتریان با کاوه‌نگار ارسال می‌شود. کلید API رمزنگاری ذخیره می‌شود و در پاسخ‌ها فقط ماسک آن برمی‌گردد."
      />

      <Notice message={notice} />
      <ErrorNote message={error} />

      {loading && <p className="py-10 text-center text-sm text-ink-muted">در حال بارگذاری...</p>}

      {settings && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <AdminCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold">اتصال کاوه‌نگار</h2>
              <span
                className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                  configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {configured ? 'آمادهٔ ارسال' : 'نیازمند تنظیم'}
              </span>
            </div>

            <form onSubmit={save} className="grid gap-4">
              <Field
                label="کلید API"
                hint={
                  settings.hasApiKey
                    ? `ذخیره‌شده (${settings.source === 'env' ? 'از فایل .env' : 'از پنل'}): ${settings.apiKey ?? ''}`
                    : 'کلید را از پنل کاوه‌نگار بگیرید.'
                }
              >
                <input
                  value={form.apiKey}
                  onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
                  className={`${inputClass} ltr-inline`}
                  dir="ltr"
                  placeholder={settings.hasApiKey ? 'برای تغییر، کلید تازه را وارد کنید' : 'api key'}
                  autoComplete="off"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="شمارهٔ فرستنده" hint="مثل 10008663">
                  <input
                    value={form.sender}
                    onChange={(event) => setForm((current) => ({ ...current, sender: event.target.value }))}
                    className={`${inputClass} ltr-inline`}
                    dir="ltr"
                    maxLength={40}
                  />
                </Field>
                <Field label="نام قالب کد ورود" hint="همان نامی که در کاوه‌نگار ساختید.">
                  <input
                    value={form.otpTemplate}
                    onChange={(event) => setForm((current) => ({ ...current, otpTemplate: event.target.value }))}
                    className={`${inputClass} ltr-inline`}
                    dir="ltr"
                    maxLength={60}
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-light disabled:opacity-60"
                >
                  {saving ? 'در حال ذخیره...' : 'ذخیرهٔ تنظیمات'}
                </button>
              </div>
            </form>
          </AdminCard>

          <AdminCard className="p-5">
            <h2 className="mb-4 text-sm font-extrabold">ارسال پیام آزمایشی</h2>

            <form onSubmit={sendTest} className="grid gap-4">
              <Field label="شمارهٔ همراه" hint="با ۰۹ شروع شود؛ ۱۱ رقم.">
                <input
                  value={testPhone}
                  onChange={(event) => setTestPhone(event.target.value)}
                  className={`${inputClass} ltr-inline`}
                  dir="ltr"
                  placeholder="09120000000"
                  required
                />
              </Field>
              <Field label="متن پیام">
                <input
                  value={testMessage}
                  onChange={(event) => setTestMessage(event.target.value)}
                  className={inputClass}
                  maxLength={200}
                />
              </Field>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={testing || !configured}
                  className="rounded-xl border border-surface-border px-5 py-2.5 text-xs font-bold hover:bg-surface-muted disabled:opacity-50"
                >
                  {testing ? 'در حال ارسال...' : 'ارسال آزمایشی'}
                </button>
              </div>

              {!configured && (
                <p className="rounded-xl bg-amber-50 p-3 text-[11px] leading-6 text-amber-700">
                  تا وقتی کلید API و نام قالب ثبت نشود، کد ورود ارسال نمی‌شود و ورود به پنل با پیامک ممکن نیست.
                </p>
              )}
            </form>
          </AdminCard>
        </div>
      )}
    </div>
  )
}
