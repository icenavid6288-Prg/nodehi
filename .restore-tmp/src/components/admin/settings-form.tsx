'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

/**
 * شکل فیلد تنظیمات که از سرور می‌آید.
 * عمداً اینجا محلی تعریف شده تا این کامپوننت مرورگری هیچ وابستگی‌ای به ماژول
 * سرور (و در نتیجه Prisma) پیدا نکند.
 */
export interface SettingsFormField {
  key: string
  label: string
  hint?: string
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'secret'
  /** برای مقدارهای حساس همیشه null است */
  value: string | null
  /** آیا مقدار حساسی ذخیره شده است؟ (بدون افشای خودِ مقدار) */
  hasValue: boolean
  source: 'database' | 'env' | 'default' | 'none'
}

const SOURCE_LABELS: Record<SettingsFormField['source'], string> = {
  database: 'ذخیره‌شده در پنل',
  env: 'از متغیر محیطی',
  default: 'مقدار پیش‌فرض',
  none: 'تنظیم نشده',
}

/**
 * فرم تنظیمات گروهی.
 *
 * ── چرا یک فرم مشترک؟ ──
 * فهرست کلیدها در سرور تعریف می‌شود (`SETTING_DEFS`). اگر برای هر گروه فرم
 * جداگانه می‌نوشتیم، افزودن یک کلید تازه نیازمند تغییر دو جا بود و دیر یا زود
 * از هم جدا می‌افتادند. اینجا سرور فیلدها را می‌دهد و این کامپوننت فقط رندر
 * می‌کند.
 *
 * ── قاعده «فقط تغییرها را بفرست» ──
 * مقدار کلید API و کلید امضا هرگز به مرورگر نمی‌آید. پس اگر کاربر فیلد را دست
 * نزند، هیچ مقداری برای آن فرستاده نمی‌شود تا مقدار ذخیره‌شده از بین نرود.
 */
export function SettingsForm({
  group,
  title,
  description,
  fields,
  encryptionEnabled,
  statusLabel,
  statusTone = 'muted',
}: {
  group: string
  title: string
  description: string
  fields: SettingsFormField[]
  encryptionEnabled: boolean
  /** برچسب وضعیت کنار عنوان — برای کارت‌های یکپارچه‌سازی («غیرفعال — به‌زودی» و…) */
  statusLabel?: string
  statusTone?: 'active' | 'muted'
}) {
  const router = useRouter()

  const initial = Object.fromEntries(
    fields.map((field) => [field.key, field.type === 'boolean' ? field.value === 'true' : (field.value ?? '')]),
  ) as Record<string, string | boolean>

  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function setValue(key: string, value: string | boolean) {
    setValues((previous) => ({ ...previous, [key]: value }))
    setTouched((previous) => new Set(previous).add(key))
  }

  /** فقط کلیدهای دست‌خورده فرستاده می‌شوند */
  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    for (const field of fields) {
      if (!touched.has(field.key)) continue
      payload[field.key] = values[field.key]
    }
    return payload
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload = buildPayload()
    if (Object.keys(payload).length === 0) {
      setError('')
      setMessage('تغییری برای ذخیره وجود ندارد.')
      return
    }

    setPending(true)
    setErrors({})
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ group, values: payload }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setErrors(data?.error?.fields ?? {})
        setError(data?.error?.message ?? 'ذخیره تنظیمات ناموفق بود.')
        return
      }

      const changed: string[] = Array.isArray(data.changed) ? data.changed : []
      setMessage(`${changed.length} تنظیم ذخیره شد.`)
      setTouched(new Set())
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  const secretFields = fields.filter((field) => field.type === 'secret')
  const showEncryptionWarning =
    !encryptionEnabled && secretFields.some((field) => field.hasValue || touched.has(field.key))

  return (
    <form onSubmit={submit} className="rounded-2xl border border-surface-border bg-white p-5" noValidate>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          <p className="mt-1.5 text-xs leading-6 text-ink-muted">{description}</p>
        </div>
        {statusLabel ? (
          <span
            className={
              statusTone === 'active'
                ? 'shrink-0 rounded-full bg-success/[0.12] px-3 py-1 text-[11px] font-bold text-success'
                : 'shrink-0 rounded-full bg-surface-muted px-3 py-1 text-[11px] font-bold text-ink-muted'
            }
          >
            {statusLabel}
          </span>
        ) : null}
      </div>

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

      {showEncryptionWarning ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[11px] leading-6 text-amber-700">
          ⚠️ متغیر <span className="ltr-inline font-bold">SETTINGS_ENCRYPTION_KEY</span> تنظیم نشده است، پس
          مقدارهای حساس به شکل متن ساده در فایل دیتابیس ذخیره می‌شوند. برای رمزنگاری، کلید ۳۲ بایتی (hex یا
          base64) را در فایل محیطی قرار دهید.
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className={cn(field.type === 'textarea' && 'sm:col-span-2')}>
            {field.type === 'boolean' ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-surface-border px-4 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(values[field.key])}
                  onChange={(event) => setValue(field.key, event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-surface-border accent-secondary"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-ink">{field.label}</span>
                  {field.hint ? (
                    <span className="mt-1 block text-[11px] leading-5 text-ink-subtle">{field.hint}</span>
                  ) : null}
                </span>
              </label>
            ) : field.type === 'textarea' ? (
              <Field
                label={field.label}
                htmlFor={field.key}
                error={errors[field.key]}
                hint={field.hint ?? SOURCE_LABELS[field.source]}
              >
                <Textarea
                  id={field.key}
                  value={String(values[field.key] ?? '')}
                  onChange={(event) => setValue(field.key, event.target.value)}
                />
              </Field>
            ) : field.type === 'secret' ? (
              <Field
                label={field.label}
                htmlFor={field.key}
                error={errors[field.key]}
                hint={
                  field.hasValue
                    ? 'مقداری ذخیره شده است. برای تغییر، مقدار تازه را بنویسید؛ خالی گذاشتن آن را پاک نمی‌کند.'
                    : 'هنوز مقداری ثبت نشده است.'
                }
              >
                <Input
                  id={field.key}
                  type="password"
                  dir="ltr"
                  className="text-left"
                  autoComplete="new-password"
                  value={String(values[field.key] ?? '')}
                  onChange={(event) => setValue(field.key, event.target.value)}
                  placeholder={field.hasValue ? '••••••••' : ''}
                />
              </Field>
            ) : (
              <Field
                label={field.label}
                htmlFor={field.key}
                error={errors[field.key]}
                hint={field.hint ?? SOURCE_LABELS[field.source]}
              >
                <Input
                  id={field.key}
                  inputMode={field.type === 'number' ? 'numeric' : undefined}
                  value={String(values[field.key] ?? '')}
                  onChange={(event) => setValue(field.key, event.target.value)}
                />
              </Field>
            )}
          </div>
        ))}
      </div>

      <Button type="submit" variant="primary" size="md" className="mt-5" disabled={pending}>
        {pending ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
      </Button>
    </form>
  )
}
