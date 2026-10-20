'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

const OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'در انتظار پرداخت' },
  { value: 'paid', label: 'پرداخت‌شده' },
  { value: 'processing', label: 'در حال پردازش' },
  { value: 'shipped', label: 'ارسال‌شده' },
  { value: 'delivered', label: 'تحویل‌شده' },
  { value: 'cancelled', label: 'لغو‌شده' },
]

/**
 * تغییر وضعیت سفارش از پنل مدیریت.
 * `readOnly` برای نقش حسابدار که فقط اجازه مشاهده دارد.
 */
export function OrderStatusControl({
  orderId,
  status,
  readOnly = false,
}: {
  orderId: string
  status: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [value, setValue] = useState(status)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  if (readOnly) {
    return (
      <span className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-[11px] text-ink-muted">
        {OPTIONS.find((option) => option.value === status)?.label ?? status}
      </span>
    )
  }

  async function update(nextStatus: string) {
    setPending(true)
    setError('')
    setSaved(false)
    const previous = value
    setValue(nextStatus)

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        // بازگردانی مقدار قبلی در صورت شکست
        setValue(previous)
        setError(data?.error?.message ?? 'تغییر وضعیت ناموفق بود.')
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setValue(previous)
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="sr-only" htmlFor={`status-${orderId}`}>
        وضعیت سفارش
      </label>
      <select
        id={`status-${orderId}`}
        value={value}
        disabled={pending}
        onChange={(event) => void update(event.target.value)}
        className={cn(
          'h-9 cursor-pointer rounded-lg border border-surface-border bg-white px-2 text-xs text-ink transition-colors',
          'focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 disabled:opacity-60',
        )}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span role="alert" className="text-[10px] text-danger">
          {error}
        </span>
      ) : null}
      {saved && !error ? <span className="text-[10px] text-success">ذخیره شد</span> : null}
    </div>
  )
}
