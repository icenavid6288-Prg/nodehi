'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { toLatinDigits, toPersianDigits } from '@/lib/utils/format'

/** تبدیل تاریخ ذخیره‌شده به قالب ورودی تاریخ مرورگر (YYYY-MM-DD) */
function toDateInput(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

/**
 * ویرایش کمپین تخفیف.
 *
 * در یک بخش تاشو قرار دارد چون بیشتر وقت‌ها کد تخفیف تنظیم‌شده است و فقط
 * برای تغییر لازم است باز شود. کد (`code`) قابل ویرایش نیست: مشتری آن را
 * دیده و تغییر کد، کمپین فعلی را بی‌اثر می‌کند.
 */
export function CouponEditForm({
  couponId,
  label,
  percent,
  minSubtotal,
  maxUses,
  expiresAt,
}: {
  couponId: string
  label: string
  percent: number
  minSubtotal: number | null
  maxUses: number | null
  expiresAt: string | null
}) {
  const router = useRouter()
  const initial = {
    label,
    percent: String(percent),
    minSubtotal: minSubtotal ? String(minSubtotal) : '',
    maxUses: maxUses ? String(maxUses) : '',
    expiresAt: toDateInput(expiresAt),
  }
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function update(key: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  /** فقط نویسه‌های رقمی — برای مقایسه و ارسال اعداد بدون جداکننده */
  function digits(value: string): string {
    return toLatinDigits(value).replace(/\D/g, '')
  }

  /**
   * فقط فیلدهایی که کاربر واقعاً عوض کرده است فرستاده می‌شود.
   *
   * چرا اهمیت دارد؟ ورودی تاریخ مرورگر فقط «روز» را می‌شناسد، پس مقدار
   * ذخیره‌شده (مثل ۱۶:۱۹) به «۲۷ شهریور» گرد می‌شود. اگر همین مقدار
   * گردشده را همیشه بفرستیم، ویرایش «توضیح» باعث بازنویسی بی‌قصد تاریخ
   * انقضا (و صفر شدن ساعت آن) می‌شد — یک تغییر ناخواسته در داده.
   */
  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    if (form.label.trim() !== initial.label) payload.label = form.label
    if (digits(form.percent) !== digits(initial.percent)) payload.percent = digits(form.percent)
    if (digits(form.minSubtotal) !== digits(initial.minSubtotal)) {
      payload.minSubtotal = digits(form.minSubtotal)
    }
    if (digits(form.maxUses) !== digits(initial.maxUses)) payload.maxUses = digits(form.maxUses)
    // مقایسه رشته‌به‌رشته: هر دو بدون بخش ساعت‌اند، پس دقت از دست نمی‌رود
    if (form.expiresAt !== initial.expiresAt) payload.expiresAt = form.expiresAt
    return payload
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload = buildPayload()
    if (Object.keys(payload).length === 0) {
      setErrors({})
      setError('')
      setMessage('چیزی برای ذخیره تغییر نکرده است.')
      return
    }

    setPending(true)
    setErrors({})
    setMessage('')
    setError('')

    try {
      const response = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setErrors(data?.error?.fields ?? {})
        setError(data?.error?.message ?? 'ذخیره تغییرها ناموفق بود.')
        return
      }

      setMessage('تغییرهای کمپین ذخیره شد.')
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <details className="mt-4 rounded-xl border border-surface-border">
      <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-ink-muted transition-colors hover:text-primary">
        ویرایش کمپین
      </summary>

      <form onSubmit={submit} className="border-t border-surface-border p-4" noValidate>
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
          <Field label="توضیح" htmlFor={`coupon-label-${couponId}`} error={errors.label}>
            <Input
              id={`coupon-label-${couponId}`}
              value={form.label}
              onChange={(event) => update('label', event.target.value)}
            />
          </Field>

          <Field
            label="درصد تخفیف"
            htmlFor={`coupon-percent-${couponId}`}
            error={errors.percent}
            hint={form.percent ? `${toPersianDigits(form.percent)}٪` : undefined}
          >
            <Input
              id={`coupon-percent-${couponId}`}
              inputMode="numeric"
              value={form.percent}
              onChange={(event) => update('percent', event.target.value)}
            />
          </Field>

          <Field
            label="حداقل سبد (تومان)"
            htmlFor={`coupon-min-${couponId}`}
            error={errors.minSubtotal}
            hint="خالی یا صفر یعنی بدون شرط"
          >
            <Input
              id={`coupon-min-${couponId}`}
              inputMode="numeric"
              value={form.minSubtotal}
              onChange={(event) => update('minSubtotal', event.target.value)}
              placeholder="مثلاً 20000000"
            />
          </Field>

          <Field
            label="سقف استفاده"
            htmlFor={`coupon-max-${couponId}`}
            error={errors.maxUses}
            hint="خالی یعنی نامحدود"
          >
            <Input
              id={`coupon-max-${couponId}`}
              inputMode="numeric"
              value={form.maxUses}
              onChange={(event) => update('maxUses', event.target.value)}
              placeholder="100"
            />
          </Field>

          <Field
            label="تاریخ انقضا"
            htmlFor={`coupon-exp-${couponId}`}
            error={errors.expiresAt}
            hint="خالی بگذارید تا کد انقضا نداشته باشد"
          >
            <Input
              id={`coupon-exp-${couponId}`}
              type="date"
              dir="ltr"
              className="text-left"
              value={form.expiresAt}
              onChange={(event) => update('expiresAt', event.target.value)}
            />
          </Field>
        </div>

        <Button type="submit" variant="primary" size="sm" className="mt-4" disabled={pending}>
          {pending ? 'در حال ذخیره…' : 'ذخیره تغییرها'}
        </Button>
      </form>
    </details>
  )
}
