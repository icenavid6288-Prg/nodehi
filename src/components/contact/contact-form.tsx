'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/input'
import { toLatinDigits } from '@/lib/utils/format'

const subjects = [
  'پیگیری سفارش',
  'مشاوره خرید کالا',
  'درخواست گارانتی یا سرویس',
  'مرجوعی و بازگشت کالا',
  'همکاری و نمایندگی',
  'سایر موارد',
]

/**
 * فرم تماس با ما.
 *
 * شامل فیلد تله (honeypot) برای شناسایی ربات‌ها؛ در سرور نیز نرخ درخواست‌ها
 * محدود می‌شود تا از سوءاستفاده جلوگیری گردد.
 *
 * نکته: اعتبارسنجی سمت کلاینت فقط برای بازخورد سریع است و جای بررسی سرور را
 * نمی‌گیرد؛ حکم نهایی از `POST /api/contact` می‌آید و پیام فقط وقتی «ثبت‌شده»
 * اعلام می‌شود که سرور شماره تیکت برگردانده باشد.
 */
export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle')
  const [formError, setFormError] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // جلوگیری از ارسال دوباره با دو بار کلیک یا کلید Enter
    if (status === 'sending') return

    const form = event.currentTarget
    const data = new FormData(form)

    const nextErrors: Record<string, string> = {}
    const name = String(data.get('name') ?? '').trim()
    const phone = toLatinDigits(String(data.get('phone') ?? '')).replace(/[^\d]/g, '')
    const message = String(data.get('message') ?? '').trim()

    if (name.length < 3) nextErrors.name = 'نام خود را کامل وارد کنید.'
    if (!/^09\d{9}$/.test(phone)) nextErrors.phone = 'شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.'
    if (message.length < 10) nextErrors.message = 'متن پیام باید دست‌کم ۱۰ نویسه باشد.'

    setErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) return

    setStatus('sending')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email: String(data.get('email') ?? '').trim(),
          subject: String(data.get('subject') ?? '').trim(),
          message,
          // تله ربات هم فرستاده می‌شود تا سرور بتواند تصمیم بگیرد
          website: String(data.get('website') ?? ''),
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { ok: true; ticketId: string | null }
        | { ok: false; error: { message: string; fields?: Record<string, string> } }
        | null

      if (!response.ok || !payload || payload.ok === false) {
        const error = payload && payload.ok === false ? payload.error : null
        if (error?.fields) setErrors(error.fields)
        setFormError(error?.message ?? 'ارسال پیام ناموفق بود. لطفاً دوباره تلاش کنید.')
        setStatus('idle')
        return
      }

      setTicketId(payload.ticketId)
      setStatus('success')
      form.reset()
    } catch {
      // قطع شبکه یا پاسخ غیرقابل‌خواندن — کاربر باید بداند پیام نرفته است
      setFormError('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.')
      setStatus('idle')
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-2xl border border-surface-border bg-white p-5 sm:p-6"
      noValidate
    >
      <h2 className="text-sm font-bold text-ink">ارسال پیام به پشتیبانی</h2>

      {status === 'success' ? (
        <p role="status" className="rounded-xl bg-secondary/10 px-4 py-3 text-sm text-secondary-dark">
          پیام شما ثبت شد. کارشناسان نودهی در اولین فرصت کاری با شما تماس می‌گیرند.
          {ticketId ? (
            <>
              {' '}
              شماره پیگیری: <span dir="ltr">{ticketId}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {formError ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی" htmlFor="contact-name" error={errors.name}>
          <Input id="contact-name" name="name" autoComplete="name" placeholder="مثلاً علی محمدی" />
        </Field>
        <Field label="شماره همراه" htmlFor="contact-phone" error={errors.phone}>
          <Input id="contact-phone" name="phone" inputMode="tel" dir="ltr" className="text-left" autoComplete="tel" placeholder="09120000000" />
        </Field>
        <Field label="ایمیل (اختیاری)" htmlFor="contact-email" error={errors.email}>
          <Input id="contact-email" name="email" type="email" dir="ltr" className="text-left" autoComplete="email" placeholder="email@example.com" />
        </Field>
        <Field label="موضوع پیام" htmlFor="contact-subject">
          <Select id="contact-subject" name="subject" defaultValue={subjects[0]}>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="متن پیام" htmlFor="contact-message" error={errors.message} hint="اگر پیگیر سفارش هستید، شماره سفارش را نیز بنویسید.">
        <Textarea id="contact-message" name="message" placeholder="توضیح درخواست خود را بنویسید..." />
      </Field>

      {/* تله ربات — برای کاربران نامرئی است */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">وب‌سایت</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-surface-border pt-4">
        <Button type="submit" variant="primary" size="md" disabled={status === 'sending'}>
          {status === 'sending' ? 'در حال ارسال…' : 'ارسال پیام'}
        </Button>
        <p className="text-xs text-ink-subtle">
          پاسخ‌دهی در ساعات کاری انجام می‌شود؛ در روزهای تعطیل ممکن است کمی طول بکشد.
        </p>
      </div>
    </form>
  )
}
