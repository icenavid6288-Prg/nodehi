'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/input'
import { LOYALTY_TIERS, tierForPoints } from '@/lib/loyalty'
import {
  ALL_ROLES,
  revokesStaffAccess,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type UserRole,
} from '@/lib/roles'
import { toLatinDigits, toPersianDigits } from '@/lib/utils/format'

/**
 * مدیریت حساب کاربر از پنل.
 *
 * سه عملیات: تغییر نقش، فعال/غیرفعال کردن حساب، و اصلاح امتیاز باشگاه مشتریان.
 * غیرفعال‌کردن، دسترسی کاربر به حساب و سفارش‌هایش را قطع می‌کند اما داده‌ها را
 * حذف نمی‌کند — همان الگوی «حذف نرم» که در سفارش‌ها و کدهای تخفیف هم داریم.
 *
 * `canManageRole` از سرور می‌آید: تغییر نقش فقط کار مدیر کل است. مخفی‌کردن
 * انتخابگر امنیت نیست، پس سرور هم مستقل همان را بررسی می‌کند.
 */
export function UserAdminPanel({
  userId,
  role,
  isActive,
  loyaltyPoints,
  isSelf,
  canManageRole,
}: {
  userId: string
  role: string
  isActive: boolean
  loyaltyPoints: number
  isSelf: boolean
  canManageRole: boolean
}) {
  const router = useRouter()
  const [active, setActive] = useState(isActive)
  const [points, setPoints] = useState(String(loyaltyPoints))
  const [selectedRole, setSelectedRole] = useState(role)
  const [pending, setPending] = useState<'status' | 'points' | 'role' | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function patch(body: Record<string, unknown>, kind: 'status' | 'points' | 'role') {
    setPending(kind)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setError(data?.error?.message ?? 'عملیات ناموفق بود.')
        return
      }
      setMessage('ثبت شد و در لاگ حسابرسی ثبت گردید.')
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(null)
    }
  }

  const parsedPoints = toLatinDigits(points).replace(/\D/g, '')
  const previewTier = parsedPoints ? tierForPoints(Number(parsedPoints)).name : null
  const roleChanged = selectedRole !== role
  const losesPanel = revokesStaffAccess(role, selectedRole)

  return (
    <section className="rounded-2xl border border-surface-border bg-white p-5">
      <h2 className="text-sm font-bold text-ink">مدیریت حساب</h2>
      <p className="mt-1.5 text-xs leading-6 text-ink-muted">
        عملیات این بخش حساس است و تنها مدیر کل می‌تواند انجام دهد. داده‌ها هرگز حذف نمی‌شوند؛ حساب فقط
        غیرفعال می‌ماند.
      </p>

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

      {/* ── نقش ── */}
      {canManageRole ? (
        <form
          className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-surface-border p-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!roleChanged) {
              setError('')
              setMessage('نقش تغییری نکرده است.')
              return
            }
            if (
              losesPanel &&
              !window.confirm(
                `با تغییر نقش به «${ROLE_LABELS[selectedRole] ?? selectedRole}»، دسترسی این کاربر به پنل مدیریت قطع می‌شود. ادامه؟`,
              )
            ) {
              return
            }
            void patch({ role: selectedRole }, 'role')
          }}
        >
          <Field
            label="نقش کاربر"
            htmlFor="user-role"
            hint={ROLE_DESCRIPTIONS[selectedRole as UserRole] ?? undefined}
          >
            <Select
              id="user-role"
              value={selectedRole}
              disabled={pending !== null || isSelf}
              onChange={(event) => setSelectedRole(event.target.value)}
              className="w-56"
            >
              {ALL_ROLES.map((item) => (
                <option key={item} value={item}>
                  {ROLE_LABELS[item]}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            type="submit"
            variant={roleChanged ? 'primary' : 'outline'}
            size="sm"
            disabled={pending !== null || isSelf || !roleChanged}
          >
            {pending === 'role' ? 'در حال ثبت…' : 'ثبت نقش'}
          </Button>
          {isSelf ? (
            <span className="text-[11px] text-ink-subtle">نقش حساب خودتان قابل تغییر نیست.</span>
          ) : null}
        </form>
      ) : null}

      {/* ── وضعیت حساب ── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted p-4">
        <div>
          <p className="text-xs font-bold text-ink">وضعیت حساب: {active ? 'فعال' : 'غیرفعال'}</p>
          <p className="mt-1 text-[11px] leading-5 text-ink-subtle">
            {active
              ? 'کاربر می‌تواند وارد شود و سفارش بدهد.'
              : 'ورود کاربر با پیام «حساب غیرفعال شده است» رد می‌شود.'}
          </p>
        </div>
        <Button
          type="button"
          variant={active ? 'outline' : 'secondary'}
          size="sm"
          disabled={pending !== null || isSelf}
          onClick={() => {
            const next = !active
            if (
              !next &&
              !window.confirm('این حساب غیرفعال شود؟ کاربر تا فعال‌سازی دوباره نمی‌تواند وارد شود.')
            ) {
              return
            }
            setActive(next)
            void patch({ isActive: next }, 'status')
          }}
        >
          {isSelf
            ? 'حساب خودتان'
            : pending === 'status'
              ? 'در حال ثبت…'
              : active
                ? 'غیرفعال کردن حساب'
                : 'فعال کردن حساب'}
        </Button>
      </div>

      {/* ── امتیاز باشگاه ── */}
      <form
        className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-surface-border p-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!parsedPoints) {
            setError('امتیاز را وارد کنید.')
            return
          }
          setPoints(parsedPoints)
          void patch({ loyaltyPoints: parsedPoints }, 'points')
        }}
      >
        <Field
          label="امتیاز باشگاه مشتریان"
          htmlFor="user-points"
          hint={
            previewTier
              ? `با این امتیاز، سطح «${previewTier}» می‌شود`
              : `سطوح: ${LOYALTY_TIERS.map((tier) => `${tier.name} از ${toPersianDigits(tier.min)}`).join(' — ')}`
          }
        >
          <Input
            id="user-points"
            inputMode="numeric"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            className="w-40"
          />
        </Field>
        <Button type="submit" variant="outline" size="sm" disabled={pending !== null}>
          {pending === 'points' ? 'در حال ثبت…' : 'ثبت امتیاز'}
        </Button>
      </form>

      <p className="mt-4 text-[11px] leading-5 text-ink-subtle">
        نکته: تنزل یا غیرفعال‌کردن <strong>آخرین مدیر کلِ فعال</strong> سامانه ممکن نیست؛ وگرنه هیچ‌کس دیگر
        به پنل دسترسی نداشت. برای تغییر نقش، نخست مدیر کل دیگری بسازید.
      </p>
    </section>
  )
}
