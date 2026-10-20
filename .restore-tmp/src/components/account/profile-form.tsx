'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { toPersianDigits } from '@/lib/utils/format'
import type { AuthUser } from '@/types'

/**
 * فرم ویرایش اطلاعات حساب.
 * شماره تلفن فقط خواندنی است: کلید ورود است و تغییر آن نیازمند تأیید کد
 * روی شماره جدید است، وگرنه کاربر می‌توانست حساب را به شماره‌ای که
 * مالکش نیست منتقل کند.
 */
export function ProfileForm({ user }: { user: AuthUser }) {
  const router = useRouter()
  const { setUser } = useAuth()

  const [firstName, setFirstName] = useState(user.firstName ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const [email, setEmail] = useState(user.email ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('saving')
    setErrors({})

    try {
      const response = await fetch('/api/auth/session', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setErrors(data?.error?.fields ?? {})
        setStatus('idle')
        return
      }

      setUser(data.user)
      setStatus('saved')
      router.refresh()
    } catch {
      setErrors({ form: 'ارتباط با سرور برقرار نشد.' })
      setStatus('idle')
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6" noValidate>
      <h2 className="text-sm font-bold text-ink">اطلاعات شخصی</h2>
      <p className="mt-1.5 text-xs leading-6 text-ink-muted">
        نام شما در فاکتور و روی بسته ارسالی چاپ می‌شود، پس آن را کامل وارد کنید.
      </p>

      {status === 'saved' ? (
        <p role="status" className="mt-4 rounded-xl bg-secondary/10 px-4 py-3 text-xs text-secondary-dark">
          اطلاعات حساب شما ذخیره شد.
        </p>
      ) : null}

      {errors.form ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger/[0.08] px-4 py-3 text-xs text-danger">
          {errors.form}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="نام" htmlFor="profile-first" error={errors.firstName}>
          <Input
            id="profile-first"
            value={firstName}
            onChange={(event) => {
              setFirstName(event.target.value)
              setStatus('idle')
            }}
            autoComplete="given-name"
            placeholder="مثلاً مریم"
          />
        </Field>

        <Field label="نام خانوادگی" htmlFor="profile-last" error={errors.lastName}>
          <Input
            id="profile-last"
            value={lastName}
            onChange={(event) => {
              setLastName(event.target.value)
              setStatus('idle')
            }}
            autoComplete="family-name"
            placeholder="مثلاً احمدی"
          />
        </Field>

        <Field label="ایمیل (اختیاری)" htmlFor="profile-email" error={errors.email} hint="برای دریافت فاکتور و پیگیری سفارش">
          <Input
            id="profile-email"
            type="email"
            dir="ltr"
            className="text-left"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setStatus('idle')
            }}
            autoComplete="email"
            placeholder="email@example.com"
          />
        </Field>

        <Field label="شماره همراه" htmlFor="profile-phone" hint="شماره ورود شما — برای تغییر با پشتیبانی تماس بگیرید">
          <Input
            id="profile-phone"
            value={user.phone}
            dir="ltr"
            className="text-left"
            readOnly
            disabled
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-surface-border pt-4">
        <Button type="submit" variant="primary" size="md" disabled={status === 'saving'}>
          {status === 'saving' ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
        </Button>
        <p className="text-[11px] text-ink-subtle">
          عضو از {toPersianDigits(new Date(user.createdAt).toLocaleDateString('fa-IR-u-ca-persian'))}
        </p>
      </div>
    </form>
  )
}
