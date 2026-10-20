'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDateTime, formatPrice, toPersianDigits } from '@/lib/utils/format'

/**
 * شکل داده‌ای که از /api/orders/track برمی‌گردد.
 * عمداً محلی تعریف شده تا این کامپوننت مرورگری هیچ وابستگی‌ای به ماژول‌های
 * سرور (و در نتیجه Prisma) پیدا نکند.
 */
interface TrackStep {
  label: string
  date: string
  done: boolean
}

interface TrackedOrder {
  orderNumber: string
  status: string
  createdAt: string
  trackingCode: string | null
  timeline: TrackStep[]
  total: number
  itemCount: number
  shippingProvince: string
  shippingCity: string
  shippingMethod: string
  paymentMethod: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  processing: 'در حال پردازش',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
}

const STATUS_TONES: Record<string, string> = {
  delivered: 'bg-success/10 text-success',
  shipped: 'bg-secondary/[0.12] text-secondary-dark',
  processing: 'bg-amber-50 text-amber-700',
  paid: 'bg-primary/[0.08] text-primary',
  pending: 'bg-surface-muted text-ink-muted',
  cancelled: 'bg-danger/10 text-danger',
}

export function TrackForm({ initialOrderNumber = '' }: { initialOrderNumber?: string }) {
  const [fields, setFields] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFields({})
    setMessage('')
    setOrder(null)

    const form = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderNumber: String(form.get('orderNumber') ?? '').trim(),
          phone: String(form.get('phone') ?? '').trim(),
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.ok) {
        setFields(data?.error?.fields ?? {})
        setMessage(data?.error?.message ?? 'پیگیری سفارش ناموفق بود.')
        return
      }

      setOrder(data.order as TrackedOrder)
    } catch {
      setMessage('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-white p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="شماره سفارش"
            htmlFor="track-number"
            error={fields.orderNumber}
            hint="در پیامک تأیید سفارش و صفحه سفارش‌ها دیده می‌شود"
          >
            <Input
              id="track-number"
              name="orderNumber"
              dir="ltr"
              className="text-left uppercase"
              defaultValue={initialOrderNumber}
              placeholder="ND-123456"
            />
          </Field>

          <Field
            label="شماره همراه سفارش"
            htmlFor="track-phone"
            error={fields.phone}
            hint="همان شماره‌ای که هنگام خرید وارد کرده‌اید"
          >
            <Input
              id="track-phone"
              name="phone"
              dir="ltr"
              className="text-left"
              inputMode="numeric"
              placeholder="09120000000"
            />
          </Field>
        </div>

        {message ? (
          <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-700">
            {message}
          </p>
        ) : null}

        <Button type="submit" variant="primary" size="md" className="self-start" disabled={pending}>
          {pending ? 'در حال بررسی…' : 'پیگیری سفارش'}
        </Button>

        <p className="text-[11px] leading-5 text-ink-subtle">
          برای امنیت شما، هم شماره سفارش و هم شماره همراه لازم است تا کسی نتواند سفارش دیگران را ببیند. اگر شماره
          سفارش را ندارید،{' '}
          <Link href="/account/orders" className="text-primary hover:underline">
            وارد حساب خود شوید
          </Link>
          .
        </p>
      </form>

      {order ? (
        <section aria-live="polite" className="rounded-2xl border border-surface-border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-4">
            <div>
              <p className="text-xs text-ink-subtle">وضعیت سفارش</p>
              <p className="mt-1 flex items-center gap-3">
                <span className="ltr-inline text-sm font-bold text-ink">{order.orderNumber}</span>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] font-bold',
                    STATUS_TONES[order.status] ?? 'bg-surface-muted text-ink-muted',
                  )}
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </p>
            </div>
            <p className="text-[11px] text-ink-subtle">ثبت: {formatJalaliDateTime(order.createdAt)}</p>
          </div>

          <ol className="mt-5 flex flex-col gap-0">
            {order.timeline.map((step, index) => (
              <li key={step.label} className="flex gap-3.5">
                <span className="flex flex-col items-center">
                  <span
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                      step.done ? 'bg-secondary text-white' : 'bg-surface-muted text-ink-subtle',
                    )}
                  >
                    {step.done ? '✓' : toPersianDigits(index + 1)}
                  </span>
                  {index < order.timeline.length - 1 ? (
                    <span
                      className={cn(
                        'my-1 w-px flex-1',
                        step.done ? 'bg-secondary/40' : 'bg-surface-border',
                      )}
                    />
                  ) : null}
                </span>

                <span className="pb-4">
                  <span className={cn('block text-xs font-medium', step.done ? 'text-ink' : 'text-ink-subtle')}>
                    {step.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-subtle">
                    {step.date === '—' ? 'در انتظار انجام' : formatJalaliDateTime(step.date)}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <dl className="mt-3 grid gap-2 rounded-xl bg-surface-muted p-4 text-[11px] sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">تعداد کالا</dt>
              <dd className="font-medium text-ink">{toPersianDigits(order.itemCount)} قلم</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">مبلغ کل</dt>
              <dd className="font-bold tabular-nums text-ink">{formatPrice(order.total)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">روش پرداخت</dt>
              <dd className="font-medium text-ink">{order.paymentMethod}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">روش ارسال</dt>
              <dd className="font-medium text-ink">{order.shippingMethod}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">مقصد</dt>
              <dd className="font-medium text-ink">
                {order.shippingProvince}، {order.shippingCity}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">کد رهگیری مرسوله</dt>
              <dd className="ltr-inline font-medium text-primary">
                {order.trackingCode ?? 'هنوز صادر نشده'}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  )
}
