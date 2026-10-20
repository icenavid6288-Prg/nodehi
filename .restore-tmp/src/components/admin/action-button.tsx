'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

type Tone = 'primary' | 'success' | 'danger' | 'muted'

const TONES: Record<Tone, string> = {
  primary: 'border-primary/30 text-primary hover:bg-primary/[0.06]',
  success: 'border-success/30 text-success hover:bg-success/[0.08]',
  danger: 'border-danger/30 text-danger hover:bg-danger/[0.08]',
  muted: 'border-surface-border text-ink-muted hover:bg-surface-muted',
}

/**
 * دکمه اکشن مدیریتی.
 * بدنه JSON را به آدرس داده‌شده می‌فرستد و پس از موفقیت صفحه را تازه‌سازی
 * می‌کند تا مقدار تازه از سرور خوانده شود (نه از حالت محلی).
 *
 * متد پیش‌فرض PATCH است؛ DELETE برای عملیات حذف (مثل حذف قطعی کالا) لازم است.
 */
export function ActionButton({
  url,
  body,
  label,
  tone = 'muted',
  pendingLabel,
  confirmMessage,
  className,
  method = 'PATCH',
}: {
  url: string
  body: Record<string, unknown>
  label: string
  tone?: Tone
  pendingLabel?: string
  confirmMessage?: string
  className?: string
  method?: 'PATCH' | 'POST' | 'DELETE'
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    if (confirmMessage && !window.confirm(confirmMessage)) return

    setPending(true)
    setError('')
    try {
      const response = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setError(data?.error?.message ?? 'عملیات ناموفق بود.')
        return
      }
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void run()}
        disabled={pending}
        className={cn(
          'rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-60',
          TONES[tone],
          className,
        )}
      >
        {pending ? (pendingLabel ?? 'در حال انجام…') : label}
      </button>
      {error ? (
        <span role="alert" className="text-[10px] text-danger">
          {error}
        </span>
      ) : null}
    </span>
  )
}
