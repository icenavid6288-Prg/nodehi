'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

interface InstallStep {
  name: string
  ok: boolean
  log: string
}

const STEP_LABELS: Record<string, string> = {
  migrate: 'ساخت جداول دیتابیس',
  seed: 'کاشت داده اولیه (کاتالوگ و حساب مدیر)',
}

/**
 * فرم نصب خودکار — فقط شماره همراه مدیر (و توکن نصب در صورت تنظیم) را
 * می‌گیرد و همه‌کار را سرور انجام می‌دهد: مهاجرت جداول و کاشت داده اولیه.
 * پس از موفقیت، صفحه خودش را تازه می‌کند تا پیام «نصب کامل شد» و قفل
 * مسیر نصب دیده شود.
 */
export function InstallForm({ tokenRequired }: { tokenRequired: boolean }) {
  const [adminPhone, setAdminPhone] = useState('')
  const [token, setToken] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [steps, setSteps] = useState<InstallStep[]>([])
  const [done, setDone] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setSteps([])

    try {
      const response = await fetch('/api/install', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminPhone, token }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.ok) {
        setSteps(Array.isArray(data?.steps) ? data.steps : [])
        setError(data?.error?.message ?? 'نصب ناموفق بود. دوباره تلاش کنید.')
        return
      }

      setSteps(data.steps ?? [])
      setDone(true)
      // رفرش تا وضعیت «نصب‌شده» از سرور خوانده و قفل مسیر نصب نمایش داده شود
      window.location.reload()
    } catch {
      setError('ارتباط با سرور برقرار نشد. صفحه را تازه کنید و دوباره تلاش کنید.')
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/[0.06] p-6 text-sm leading-7 text-ink">
        ✅ نصب با موفقیت کامل شد. مسیر نصب برای همیشه بسته شد.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field
        label="شماره همراه مدیر"
        hint="با همین شماره وارد پنل مدیریت می‌شوید؛ کد ورود پیامک می‌شود (یا در حالت توسعه در صفحه ورود نمایش داده می‌شود)."
        htmlFor="install-admin-phone"
      >
        <Input
          id="install-admin-phone"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="09123456789"
          value={adminPhone}
          onChange={(event) => setAdminPhone(event.target.value)}
          required
          dir="ltr"
        />
      </Field>

      {tokenRequired ? (
        <Field
          label="توکن نصب"
          hint=" INSTALL_TOKEN در تنظیمات محیطی سرور تعریف شده؛ همان مقدار را اینجا وارد کنید."
          htmlFor="install-token"
        >
          <Input
            id="install-token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
            dir="ltr"
          />
        </Field>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{error}</p>
      ) : null}

      {steps.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-muted p-4">
          {steps.map((step) => (
            <details key={step.name} className="text-xs leading-6">
              <summary className={step.ok ? 'cursor-pointer text-success' : 'cursor-pointer text-rose-700'}>
                {step.ok ? '✓' : '✗'} {STEP_LABELS[step.name] ?? step.name}
              </summary>
              <pre dir="ltr" className="mt-2 overflow-x-auto whitespace-pre-wrap text-[11px] text-ink-muted">
                {step.log || '—'}
              </pre>
            </details>
          ))}
        </div>
      ) : null}

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'در حال نصب…' : 'شروع نصب سایت'}
        </Button>
      </div>
    </form>
  )
}
