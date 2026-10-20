'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { toPersianDigits } from '@/lib/utils/format'

export interface AddressView {
  id: string
  title: string
  receiver: string
  phone: string
  province: string
  city: string
  line: string
  postalCode: string | null
  isDefault: boolean
}

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; address: AddressView }

/**
 * مدیریت آدرس‌ها.
 *
 * داده از سرور می‌آید (نه از حالت محلی) و پس از هر عملیات موفق،
 * `router.refresh()` صفحه را تازه می‌کند تا کاربر همیشه تصویر واقعی
 * دیتابیس را ببیند — نه یک خوش‌بینی محلی که ممکن است با سرور نخواند.
 */
export function AddressManager({
  addresses,
  max,
}: {
  addresses: AddressView[]
  max: number
}) {
  const router = useRouter()
  const [mode, setMode] = useState<FormMode>({ kind: 'closed' })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const atLimit = addresses.length >= max

  async function runAction(id: string, init: RequestInit) {
    setBusyId(id)
    setError('')
    try {
      const response = await fetch(`/api/account/addresses/${id}`, init)
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) {
        setError(data?.error?.message ?? 'عملیات ناموفق بود.')
        return
      }
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setBusyId(null)
    }
  }

  const setDefault = (id: string) =>
    runAction(id, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })

  async function remove(id: string, title: string) {
    if (!window.confirm(`آدرس «${title}» حذف شود؟`)) return
    await runAction(id, { method: 'DELETE' })
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-ink">آدرس‌های من</h1>
          <p className="mt-2 text-sm leading-7 text-ink-muted">
            آدرس‌های ذخیره‌شده هنگام تسویه حساب به‌صورت خودکار پیشنهاد می‌شوند. می‌توانید حداکثر{' '}
            {toPersianDigits(max)} آدرس نگه دارید و یکی را پیش‌فرض کنید.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError('')
            setMode(mode.kind === 'create' ? { kind: 'closed' } : { kind: 'create' })
          }}
          disabled={atLimit && mode.kind !== 'create'}
        >
          {mode.kind === 'create' ? 'بستن فرم' : 'افزودن آدرس جدید'}
        </Button>
      </header>

      {atLimit ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-700">
          به سقف {toPersianDigits(max)} آدرس رسیده‌اید. برای افزودن آدرس تازه، یکی از آدرس‌ها را حذف کنید.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl bg-danger/[0.08] px-4 py-3 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {mode.kind !== 'closed' ? (
        <AddressForm
          key={mode.kind === 'edit' ? mode.address.id : 'new'}
          address={mode.kind === 'edit' ? mode.address : null}
          onDone={() => {
            setMode({ kind: 'closed' })
            router.refresh()
          }}
          onCancel={() => setMode({ kind: 'closed' })}
        />
      ) : null}

      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-14 text-center">
          <p className="text-sm font-bold text-ink">هیچ آدرسی ثبت نشده است</p>
          <p className="mt-1.5 text-xs text-ink-muted">
            با ذخیره آدرس، تسویه حساب در خریدهای بعدی چند ثانیه‌ای می‌شود.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className={cn(
                'flex flex-col gap-3 rounded-2xl border bg-white p-5',
                address.isDefault ? 'border-primary/40' : 'border-surface-border',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  {address.title}
                  {address.isDefault ? (
                    <span className="rounded-full bg-primary/[0.08] px-2 py-0.5 text-[10px] font-medium text-primary">
                      پیش‌فرض
                    </span>
                  ) : null}
                </p>
              </div>

              <div className="flex flex-col gap-1 text-xs leading-6 text-ink-muted">
                <span>{address.receiver}</span>
                <span className="ltr-inline text-right">{toPersianDigits(address.phone)}</span>
                <span>
                  {address.province}، {address.city}، {address.line}
                </span>
                {address.postalCode ? (
                  <span>کد پستی: {toPersianDigits(address.postalCode)}</span>
                ) : null}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-surface-border pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setMode({ kind: 'edit', address })
                  }}
                  disabled={busyId === address.id}
                  className="text-xs text-primary transition-colors hover:text-accent disabled:opacity-60"
                >
                  ویرایش
                </button>

                {!address.isDefault ? (
                  <button
                    type="button"
                    onClick={() => void setDefault(address.id)}
                    disabled={busyId === address.id}
                    className="text-xs text-ink-muted transition-colors hover:text-primary disabled:opacity-60"
                  >
                    {busyId === address.id ? 'در حال ثبت…' : 'تعیین پیش‌فرض'}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => void remove(address.id, address.title)}
                  disabled={busyId === address.id}
                  className="mr-auto text-xs text-ink-muted transition-colors hover:text-danger disabled:opacity-60"
                >
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** فرم ساخت/ویرایش آدرس — یک کامپوننت برای هر دو حالت تا رفتار یکسان بماند */
function AddressForm({
  address,
  onDone,
  onCancel,
}: {
  address: AddressView | null
  onDone: () => void
  onCancel: () => void
}) {
  const isEdit = Boolean(address)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFields({})
    setMessage('')

    const form = new FormData(event.currentTarget)
    const payload = {
      title: String(form.get('title') ?? ''),
      receiver: String(form.get('receiver') ?? ''),
      phone: String(form.get('phone') ?? ''),
      province: String(form.get('province') ?? ''),
      city: String(form.get('city') ?? ''),
      line: String(form.get('line') ?? ''),
      postalCode: String(form.get('postalCode') ?? ''),
    }

    try {
      const response = await fetch(
        isEdit ? `/api/account/addresses/${address!.id}` : '/api/account/addresses',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.ok) {
        setFields(data?.error?.fields ?? {})
        setMessage(data?.error?.message ?? 'ذخیره آدرس ناموفق بود.')
        return
      }

      onDone()
    } catch {
      setMessage('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-white p-5"
    >
      <h2 className="text-sm font-bold text-ink">{isEdit ? 'ویرایش آدرس' : 'آدرس جدید'}</h2>

      {message ? (
        <p role="alert" className="rounded-xl bg-danger/[0.08] px-4 py-3 text-xs text-danger">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="عنوان آدرس" htmlFor="addr-title" error={fields.title} hint="برای تشخیص سریع، مثل «خانه» یا «محل کار»">
          <Input id="addr-title" name="title" defaultValue={address?.title ?? ''} placeholder="خانه" />
        </Field>

        <Field label="نام گیرنده" htmlFor="addr-receiver" error={fields.receiver}>
          <Input
            id="addr-receiver"
            name="receiver"
            defaultValue={address?.receiver ?? ''}
            placeholder="نام و نام خانوادگی"
          />
        </Field>

        <Field label="شماره همراه گیرنده" htmlFor="addr-phone" error={fields.phone}>
          <Input
            id="addr-phone"
            name="phone"
            dir="ltr"
            className="text-left"
            inputMode="numeric"
            defaultValue={address?.phone ?? ''}
            placeholder="09120000000"
          />
        </Field>

        <Field label="کد پستی" htmlFor="addr-postal" error={fields.postalCode} hint="اختیاری — ۱۰ رقم">
          <Input
            id="addr-postal"
            name="postalCode"
            dir="ltr"
            className="text-left"
            inputMode="numeric"
            defaultValue={address?.postalCode ?? ''}
            placeholder="1234567890"
          />
        </Field>

        <Field label="استان" htmlFor="addr-province" error={fields.province}>
          <Input id="addr-province" name="province" defaultValue={address?.province ?? ''} placeholder="تهران" />
        </Field>

        <Field label="شهر" htmlFor="addr-city" error={fields.city}>
          <Input id="addr-city" name="city" defaultValue={address?.city ?? ''} placeholder="تهران" />
        </Field>
      </div>

      <Field label="نشانی کامل" htmlFor="addr-line" error={fields.line}>
        <Input
          id="addr-line"
          name="line"
          defaultValue={address?.line ?? ''}
          placeholder="خیابان، کوچه، پلاک، واحد"
        />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? 'در حال ذخیره…' : isEdit ? 'ذخیره تغییرات' : 'ذخیره آدرس'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          انصراف
        </Button>
      </div>
    </form>
  )
}
