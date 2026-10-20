'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * ارسال دوباره یک رویداد اتوماسیون.
 * همان بدنه ذخیره‌شده فرستاده می‌شود، پس امضا و شناسه رویداد یکسان می‌ماند.
 */
export function RetryEventButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function retry() {
    setPending(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`/api/admin/automation/${eventId}/retry`, { method: 'POST' })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setError(data?.error?.message ?? 'ارسال دوباره ناموفق بود.')
        return
      }

      setMessage(
        data.status === 'sent'
          ? 'رویداد با موفقیت ارسال شد.'
          : data.error ?? 'رویداد ارسال نشد.',
      )
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <span className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void retry()}
        disabled={pending}
        className={cn(
          'rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-60',
          'border-primary/30 text-primary hover:bg-primary/[0.06]',
        )}
      >
        {pending ? 'در حال ارسال…' : 'ارسال دوباره'}
      </button>
      {message ? <span className="text-[10px] text-ink-subtle">{message}</span> : null}
      {error ? (
        <span role="alert" className="text-[10px] text-danger">
          {error}
        </span>
      ) : null}
    </span>
  )
}
