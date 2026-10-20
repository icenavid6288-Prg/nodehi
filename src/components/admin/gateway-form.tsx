'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

/**
 * پیکربندی یک درگاه پرداخت.
 *
 * کلید API هرگز از سرور به مرورگر نمی‌آید؛ فیلد خالی می‌ماند و «خالی گذاشتن»
 * به معنای «مقدار فعلی را نگه دار» است، نه پاک‌کردن. برای پاک‌کردن، باید
 * صریحاً مقدار تازه نوشته شود.
 */
export function GatewayForm({
  gatewayId,
  label,
  isActive,
  isSandbox,
  merchantId,
  hasApiKey,
}: {
  gatewayId: string
  label: string
  isActive: boolean
  isSandbox: boolean
  merchantId: string | null
  hasApiKey: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    label,
    isActive,
    isSandbox,
    merchantId: merchantId ?? '',
    apiKey: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const initial = { label, isActive, isSandbox, merchantId: merchantId ?? '' }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // فقط فیلدهای تغییرکرده فرستاده می‌شوند تا مقدار ذخیره‌شده بی‌دلیل بازنویسی نشود
    const payload: Record<string, unknown> = {}
    if (form.label !== initial.label) payload.label = form.label
    if (form.isActive !== initial.isActive) payload.isActive = form.isActive
    if (form.isSandbox !== initial.isSandbox) payload.isSandbox = form.isSandbox
    if (form.merchantId !== initial.merchantId) payload.merchantId = form.merchantId
    if (form.apiKey.trim() !== '') payload.apiKey = form.apiKey.trim()

    if (Object.keys(payload).length === 0) {
      setError('')
      setErrors({})
      setMessage('تغییری برای ذخیره وجود ندارد.')
      return
    }

    setPending(true)
    setErrors({})
    setMessage('')
    setError('')

    try {
      const response = await fetch(`/api/admin/payments/${encodeURIComponent(gatewayId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setErrors(data?.error?.fields ?? {})
        setError(data?.error?.message ?? 'ذخیره درگاه ناموفق بود.')
        return
      }

      setMessage('پیکربندی درگاه ذخیره شد.')
      setForm((previous) => ({ ...previous, apiKey: '' }))
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 border-t border-surface-border pt-4" noValidate>
      {message ? (
        <p role="status" className="mb-3 rounded-lg bg-secondary/10 px-3 py-2 text-[11px] text-secondary-dark">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-3 rounded-lg bg-danger/[0.08] px-3 py-2 text-[11px] text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام نمایشی" htmlFor={`gw-label-${gatewayId}`} error={errors.label}>
          <Input
            id={`gw-label-${gatewayId}`}
            value={form.label}
            onChange={(event) => setForm((p) => ({ ...p, label: event.target.value }))}
          />
        </Field>

        <Field
          label="شناسه پذیرنده / مرچنت"
          htmlFor={`gw-merchant-${gatewayId}`}
          error={errors.merchantId}
          hint="برای فعال‌کردن پرداخت آنلاین الزامی است"
        >
          <Input
            id={`gw-merchant-${gatewayId}`}
            dir="ltr"
            className="text-left"
            value={form.merchantId}
            onChange={(event) => setForm((p) => ({ ...p, merchantId: event.target.value }))}
            placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          />
        </Field>

        <Field
          label="کلید API"
          htmlFor={`gw-key-${gatewayId}`}
          error={errors.apiKey}
          hint={hasApiKey ? 'کلید ذخیره شده است؛ برای تغییر مقدار تازه بنویسید' : 'کلیدی ثبت نشده است'}
        >
          <Input
            id={`gw-key-${gatewayId}`}
            type="password"
            dir="ltr"
            className="text-left"
            autoComplete="new-password"
            value={form.apiKey}
            onChange={(event) => setForm((p) => ({ ...p, apiKey: event.target.value }))}
            placeholder={hasApiKey ? '••••••••' : ''}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-surface-border px-4 py-2.5 text-xs">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((p) => ({ ...p, isActive: event.target.checked }))}
              className="h-4 w-4 cursor-pointer rounded border-surface-border accent-secondary"
            />
            این روش پرداخت در تسویه فعال باشد
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-surface-border px-4 py-2.5 text-xs">
            <input
              type="checkbox"
              checked={form.isSandbox}
              onChange={(event) => setForm((p) => ({ ...p, isSandbox: event.target.checked }))}
              className="h-4 w-4 cursor-pointer rounded border-surface-border accent-secondary"
            />
            حالت آزمایشی (بدون تراکنش واقعی)
          </label>
        </div>
      </div>

      <Button type="submit" variant="primary" size="sm" className="mt-4" disabled={pending}>
        {pending ? 'در حال ذخیره…' : 'ذخیره درگاه'}
      </Button>
    </form>
  )
}
