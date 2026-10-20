'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { toLatinDigits } from '@/lib/utils/format'

/**
 * ارسال پیام آزمایشی.
 * نتیجه با جزئیات نمایش داده می‌شود — از جمله پیام خطای سرویس پیامک — چون
 * هدف این فرم عیب‌یابی اتصال است، نه فقط «موفق/ناموفق».
 */
export function SmsTestForm() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ delivered: boolean; channel: string; error: string | null } | null>(
    null,
  )
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/admin/sms/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: toLatinDigits(phone).replace(/\D/g, '') }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setError(data?.error?.message ?? 'ارسال پیام آزمایشی ناموفق بود.')
        return
      }

      setResult({ delivered: data.delivered, channel: data.channel, error: data.error })
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-surface-border bg-white p-5" noValidate>
      <h2 className="text-sm font-bold text-ink">ارسال پیام آزمایشی</h2>
      <p className="mt-1.5 text-xs leading-6 text-ink-muted">
        یک شماره وارد کنید تا اتصال سرویس پیامک سنجیده شود. این کار روی حساب کاربر اثری ندارد و نتیجه‌اش در
        تاریخچه پایین ثبت می‌شود.
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger/[0.08] px-4 py-3 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {result ? (
        <p
          role="status"
          className={
            result.delivered
              ? 'mt-4 rounded-xl bg-success/10 px-4 py-3 text-xs text-success'
              : 'mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-700'
          }
        >
          {result.delivered
            ? 'پیامک با موفقیت به سرویس تحویل داده شد.'
            : result.channel === 'log'
              ? 'سرویس پیامک پیکربندی نشده است، پس پیام فقط در لاگ سرور ثبت شد.'
              : `ارسال ناموفق بود: ${result.error ?? 'خطای نامشخص'}`}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="شماره همراه" htmlFor="sms-test-phone">
          <Input
            id="sms-test-phone"
            dir="ltr"
            className="w-56 text-left"
            inputMode="numeric"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="09120000000"
          />
        </Field>
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? 'در حال ارسال…' : 'ارسال پیام آزمایشی'}
        </Button>
      </div>
    </form>
  )
}
