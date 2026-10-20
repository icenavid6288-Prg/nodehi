'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { SHIPPING_METHODS } from '@/lib/commerce'
import { toPersianDigits } from '@/lib/utils/format'

/**
 * ویرایش اطلاعات اجرایی سفارش: روش ارسال، کد رهگیری و یادداشت داخلی.
 *
 * چرا یک فرم و نه سه دکمه؟ این سه فیلد در یک نشست کاری با هم پر می‌شوند
 * (سفارش ارسال شد → روش ارسال + کد رهگیری + یادداشت). یک درخواست PATCH با
 * چند فیلد، هم ساده‌تر است و هم در لاگ حسابرسی رد یکپارچه‌تری می‌گذارد.
 */
export function OrderAdminForm({
  orderId,
  shippingMethod,
  trackingCode,
  note,
}: {
  orderId: string
  shippingMethod: string
  trackingCode: string | null
  note: string | null
}) {
  const router = useRouter()
  const [shipping, setShipping] = useState(shippingMethod)
  const [tracking, setTracking] = useState(trackingCode ?? '')
  const [internalNote, setInternalNote] = useState(note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setErrors({})
    setMessage('')
    setError('')

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          shippingMethod: shipping,
          trackingCode: tracking.trim(),
          note: internalNote.trim(),
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setErrors(data?.error?.fields ?? {})
        setError(data?.error?.message ?? 'ذخیره تغییرها ناموفق بود.')
        return
      }

      const changed: string[] = Array.isArray(data.changed) ? data.changed : []
      setMessage(
        changed.length === 0
          ? 'تغییری نسبت به مقدار قبلی وجود نداشت.'
          : 'تغییرها ذخیره و در لاگ حسابرسی ثبت شد.',
      )
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-surface-border bg-white p-5" noValidate>
      <h2 className="text-sm font-bold text-ink">اطلاعات ارسال و پیگیری</h2>
      <p className="mt-1.5 text-xs leading-6 text-ink-muted">
        کد رهگیری که اینجا ثبت شود، برای مشتری در صفحه «پیگیری سفارش» نمایش داده می‌شود. یادداشت داخلی فقط
        در پنل مدیریت دیده می‌شود.
      </p>

      {message ? (
        <p role="status" className="mt-4 rounded-xl bg-secondary/10 px-4 py-3 text-xs text-secondary-dark">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger/[0.08] px-4 py-3 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4">
        <Field label="روش ارسال" htmlFor="order-shipping">
          <Select
            id="order-shipping"
            value={shipping}
            onChange={(event) => setShipping(event.target.value)}
          >
            {/* اگر مقدار ذخیره‌شده در فهرست نباشد، همان مقدار حفظ می‌شود تا گم نشود */}
            {!SHIPPING_METHODS.some((method) => method.label === shipping) && shipping ? (
              <option value={shipping}>{shipping}</option>
            ) : null}
            {SHIPPING_METHODS.map((method) => (
              <option key={method.id} value={method.label}>
                {method.label} — {toPersianDigits(method.cost.toLocaleString('en-US').replace(/,/g, '٬'))} تومان
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="کد رهگیری"
          htmlFor="order-tracking"
          error={errors.trackingCode}
          hint="خالی بگذارید تا کد فعلی حذف شود"
        >
          <Input
            id="order-tracking"
            dir="ltr"
            className="text-left"
            value={tracking}
            onChange={(event) => setTracking(event.target.value)}
            placeholder="مثلاً 1234567890"
          />
        </Field>

        <Field
          label="یادداشت داخلی"
          htmlFor="order-note"
          error={errors.note}
          hint="فقط برای کارکنان؛ برای مشتری نمایش داده نمی‌شود"
        >
          <Textarea
            id="order-note"
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
            placeholder="مثلاً: با مشتری هماهنگ شد، ارسال به روز شنبه موکول شد."
            maxLength={500}
          />
        </Field>
      </div>

      <Button type="submit" variant="primary" size="md" className="mt-5" disabled={pending}>
        {pending ? 'در حال ذخیره…' : 'ذخیره تغییرها'}
      </Button>
    </form>
  )
}
