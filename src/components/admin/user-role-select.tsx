'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { isStaffRoleValue, ALL_ROLES, ROLE_LABELS } from '@/lib/roles'

/**
 * کنترل تغییر نقش کاربر، درون‌خطی و روی همان ردیف فهرست.
 *
 * چرا کامپوننت جدا؟ پیش‌تر تغییر نقش فقط داخل پروفایل کاربر (دو کلیک عمیق‌تر)
 * ممکن بود. همان عملیات حالا از فهرست مشتریان و صفحهٔ «کاربران و نقش‌ها» هم
 * در دسترس است، بدون تکرار منطق درخواست و پیام خطا.
 *
 * نکته امنیتی: `canManage` از سرور می‌آید و فقط برای پنهان‌کردن کنترل است.
 * تصمیم نهایی سمت سرور گرفته می‌شود (فقط مدیر کل) و اینجا امنیت ساخته نمی‌شود.
 */

interface SharedProps {
  userId: string
  isSelf?: boolean
  canManage: boolean
}

/** پیام تأیید بر اساس جهت تغییر — بالا بردن دسترسی بی‌صدا انجام نمی‌شود */
function confirmMessage(from: string, to: string): string | null {
  const gaining = !isStaffRoleValue(from) && isStaffRoleValue(to)
  const losing = isStaffRoleValue(from) && !isStaffRoleValue(to)
  if (to === 'admin') {
    return 'این کاربر «مدیر کل» می‌شود و دسترسی کامل به کاربران، نقش‌ها و تنظیمات پیدا می‌کند. ادامه؟'
  }
  if (gaining) {
    return `این کاربر به «${ROLE_LABELS[to] ?? to}» ارتقا می‌یابد و می‌تواند وارد پنل مدیریت شود. ادامه؟`
  }
  if (losing) {
    return `با این تغییر، دسترسی این کاربر به پنل مدیریت قطع می‌شود. ادامه؟`
  }
  return null
}

export function UserRoleSelect({
  userId,
  role,
  isSelf = false,
  canManage,
  className,
}: SharedProps & { role: string; className?: string }) {
  const router = useRouter()
  const [value, setValue] = useState(role)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(next: string) {
    setPending(true)
    setError('')
    setDone(false)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: next }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setError(data?.error?.message ?? 'تغییر نقش ناموفق بود.')
        setValue(role)
        return
      }
      setDone(true)
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
      setValue(role)
    } finally {
      setPending(false)
    }
  }

  // کاربر بدون دسترسی، فهرست را فقط می‌بیند — با همان ظاهر برچسب ساده
  if (!canManage) {
    return (
      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] text-ink-muted">
        {ROLE_LABELS[role] ?? role}
      </span>
    )
  }

  return (
    <span className="flex flex-col gap-1">
      <select
        aria-label="نقش کاربر"
        value={value}
        disabled={pending || isSelf}
        title={isSelf ? 'نقش حساب خودتان قابل تغییر نیست.' : undefined}
        onChange={(event) => {
          const next = event.target.value
          const confirmText = confirmMessage(role, next)
          if (next === role) return
          if (confirmText && !window.confirm(confirmText)) {
            event.target.value = role
            return
          }
          setValue(next)
          void submit(next)
        }}
        className={cn(
          'h-8 cursor-pointer rounded-lg border bg-white px-2 text-[11px] font-medium text-ink transition-colors',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-subtle',
          error ? 'border-danger' : 'border-surface-border',
          isStaffRoleValue(value) && 'text-primary',
          className,
        )}
      >
        {ALL_ROLES.map((item) => (
          <option key={item} value={item}>
            {ROLE_LABELS[item]}
          </option>
        ))}
      </select>
      {pending ? <span className="text-[10px] text-ink-subtle">در حال ثبت…</span> : null}
      {done && !pending ? <span className="text-[10px] text-success">ثبت شد</span> : null}
      {error ? (
        <span role="alert" className="text-[10px] leading-4 text-danger">
          {error}
        </span>
      ) : null}
    </span>
  )
}

/** فعال/غیرفعال کردن حساب — «حذف نرم»: داده‌ها می‌ماند، فقط ورود بسته می‌شود */
export function UserStatusToggle({
  userId,
  isActive,
  isSelf = false,
  canManage,
}: SharedProps & { isActive: boolean }) {
  const router = useRouter()
  const [active, setActive] = useState(isActive)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  if (!canManage) {
    return (
      <span className={cn('text-[10px] font-medium', isActive ? 'text-success' : 'text-danger')}>
        {isActive ? 'فعال' : 'غیرفعال'}
      </span>
    )
  }

  async function toggle() {
    const next = !active
    if (
      !next &&
      !window.confirm('این حساب غیرفعال شود؟ کاربر تا فعال‌سازی دوباره نمی‌تواند وارد شود.')
    ) {
      return
    }
    setPending(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setError(data?.error?.message ?? 'تغییر وضعیت ناموفق بود.')
        return
      }
      setActive(next)
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <span className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending || isSelf}
        title={
          isSelf
            ? 'حساب خودتان را نمی‌توانید غیرفعال کنید.'
            : active
              ? 'برای غیرفعال کردن بزنید'
              : 'برای فعال کردن بزنید'
        }
        className={cn(
          'rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          active
            ? 'border-success/30 bg-success/[0.08] text-success hover:bg-success/[0.14]'
            : 'border-danger/30 bg-danger/[0.06] text-danger hover:bg-danger/[0.12]',
        )}
      >
        {pending ? '…' : active ? 'فعال' : 'غیرفعال'}
      </button>
      {error ? (
        <span role="alert" className="text-[10px] leading-4 text-danger">
          {error}
        </span>
      ) : null}
    </span>
  )
}
