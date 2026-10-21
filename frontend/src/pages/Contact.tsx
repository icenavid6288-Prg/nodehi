import { useState, type FormEvent } from 'react'
import { post } from '../lib/api'
import { contactMeta, usePageMeta } from '../lib/seo'

export default function Contact() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  usePageMeta(contactMeta())

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setLoading(true)
    setMessage(null)

    try {
      await post('/contact', {
        name: String(data.get('name') ?? ''),
        phone: String(data.get('phone') ?? ''),
        email: String(data.get('email') ?? '') || null,
        subject: String(data.get('subject') ?? ''),
        message: String(data.get('message') ?? ''),
      })
      form.reset()
      setMessage({ type: 'ok', text: 'پیام شما ثبت شد؛ به‌زودی با شما تماس می‌گیریم.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'ارسال پیام ناموفق بود.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-2xl font-extrabold">تماس با نودهی</h1>
          <p className="mt-1 text-sm text-ink-muted">
            سؤال، پیشنهاد یا پیگیری سفارش دارید؟ فرم را پر کنید یا با ما تماس بگیرید.
          </p>

          <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl border border-surface-border bg-white p-5 shadow-card sm:grid-cols-2">
            <Field name="name" label="نام و نام خانوادگی" required />
            <Field name="phone" label="شماره همراه" required inputMode="tel" />
            <Field name="email" label="ایمیل (اختیاری)" type="email" />
            <Field name="subject" label="موضوع" required />
            <label className="block text-xs sm:col-span-2">
              <span className="mb-1 block text-ink-muted">متن پیام</span>
              <textarea
                name="message"
                required
                rows={5}
                className="w-full rounded-xl border border-surface-border bg-surface-muted p-3 text-sm outline-none focus:border-secondary focus:bg-white"
              />
            </label>

            {message && (
              <p
                className={`rounded-xl p-3 text-xs sm:col-span-2 ${
                  message.type === 'ok' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}
              >
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary py-3 text-sm font-extrabold text-white hover:bg-primary-light disabled:opacity-60 sm:col-span-2"
            >
              {loading ? 'در حال ارسال...' : 'ارسال پیام'}
            </button>
          </form>
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="mb-3 text-sm font-extrabold">راه‌های ارتباطی</h2>
            <ul className="grid gap-3 text-sm text-ink-muted">
              <li>
                تلفن: <span className="ltr-inline font-bold text-ink">۰۲۱-۹۱۰۰۰۰۰۰</span>
              </li>
              <li>
                ایمیل: <span className="ltr-inline text-ink">info@nodehi.ir</span>
              </li>
              <li>نشانی: تهران، خیابان ولیعصر، پلاک ۱۲۳، طبقه سوم</li>
              <li>ساعات پاسخ‌گویی: شنبه تا پنجشنبه، ۹ صبح تا ۹ شب</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Field({
  name,
  label,
  required,
  type = 'text',
  inputMode,
}: {
  name: string
  label: string
  required?: boolean
  type?: string
  inputMode?: 'tel' | 'email'
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-ink-muted">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        inputMode={inputMode}
        required={required}
        className="h-10 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-sm outline-none focus:border-secondary focus:bg-white"
      />
    </label>
  )
}
