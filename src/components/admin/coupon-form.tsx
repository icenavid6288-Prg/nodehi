'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { toLatinDigits, toPersianDigits } from '@/lib/utils/format'

/**
 * فرم ساخت کد تخفیف تازه.
 * فقط برای نقش «مدیر کل» رندر می‌شود؛ سرور هم مستقل همین را بررسی می‌کند.
 */
export function CouponForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [percent, setPercent] = useState('10')
  const [maxUses, setMaxUses] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setErrors({})
    setMessage('')

    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code,
          label,
          percent: toLatinDigits(percent).replace(/\D/g, ''),
          maxUses: maxUses ? toLatinDigits(maxUses).replace(/\D/g, '') : undefined,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setErrors(data?.error?.fields ?? {})
        setMessage(data?.error?.message ?? 'ساخت کد تخفیف ناموفق بود.')
        return
      }

      setMessage(`کد ${data.coupon.code} ساخته شد.`)
      setCode('')
      setLabel('')
      setMaxUses('')
      router.refresh()
    } catch {
      setMessage('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-surface-border bg-white p-5" noValidate>
      <h2 className="text-sm font-bold text-ink">ساخت کد تخفیف جدید</h2>
      <p className="mt-1.5 text-xs leading-6 text-ink-muted">
        کد ساخته‌شده بلافاصله فعال می‌شود و در سبد خرید قابل استفاده است.
      </p>

      {message ? (
        <p role="status" className="mt-4 rounded-xl bg-secondary/10 px-4 py-3 text-xs text-secondary-dark">
          {message}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="کد" htmlFor="coupon-code" error={errors.code} hint="فقط حروف لاتین و رقم، مثال: YALDA25">
          <Input
            id="coupon-code"
            dir="ltr"
            className="text-left uppercase"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="YALDA25"
          />
        </Field>

        <Field label="درصد تخفیف" htmlFor="coupon-percent" error={errors.percent}>
          <Input
            id="coupon-percent"
            inputMode="numeric"
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
            placeholder="10"
          />
        </Field>

        <Field label="توضیح" htmlFor="coupon-label" error={errors.label} hint="در سبد خرید به کاربر نشان داده می‌شود">
          <Input
            id="coupon-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="مثلاً ۲۵٪ تخفیف شب یلدا"
          />
        </Field>

        <Field label="سقف استفاده (اختیاری)" htmlFor="coupon-max" error={errors.maxUses} hint="خالی بگذارید تا نامحدود باشد">
          <Input
            id="coupon-max"
            inputMode="numeric"
            value={maxUses}
            onChange={(event) => setMaxUses(event.target.value)}
            placeholder="100"
          />
        </Field>
      </div>

      <Button type="submit" variant="primary" size="md" className="mt-5" disabled={pending}>
        {pending ? 'در حال ساخت…' : 'ساخت کد تخفیف'}
      </Button>

      <p className="mt-3 text-[11px] text-ink-subtle">
        نکته: برای کدهای محدود، سقف استفاده را تعیین کنید. شمارنده مصرف به‌صورت خودکار در تراکنش ثبت سفارش
        افزایش می‌یابد.
        {percent ? ` نمونه: ${toPersianDigits(percent)}٪` : ''}
      </p>
    </form>
  )
}
