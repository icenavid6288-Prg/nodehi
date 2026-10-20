import type { Metadata } from 'next'
import { ActionButton } from '@/components/admin/action-button'
import { CouponEditForm } from '@/components/admin/coupon-edit-form'
import { CouponForm } from '@/components/admin/coupon-form'
import { prisma } from '@/lib/db'
import { buildMetadata } from '@/lib/seo'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate, formatPrice, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'کدهای تخفیف',
  description: 'ساخت و مدیریت کمپین‌های تخفیف فروشگاه نودهی.',
  path: '/admin/coupons',
  noIndex: true,
})

export default async function AdminCouponsPage() {
  const staff = await getStaffUser()
  // ساخت و فعال/غیرفعال‌سازی کد تخفیف اثر مستقیم مالی دارد؛ فقط مدیر کل
  const canManage = Boolean(staff && isAdminRole(staff.role))

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, take: 60 })

  const now = Date.now()

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">کدهای تخفیف</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          کدها حذف نمی‌شوند؛ فقط غیرفعال می‌مانند تا سابقه کمپین و شمار مصرف از بین نرود.
          {canManage ? '' : ' نقش شما اجازه تغییر کمپین‌ها را ندارد.'}
        </p>
      </header>

      {canManage ? <CouponForm /> : null}

      {coupons.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-14 text-center text-sm text-ink-muted">
          هنوز کد تخفیفی ساخته نشده است. برای شروع، از فرم بالا استفاده کنید.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {coupons.map((coupon) => {
            const expired = coupon.expiresAt ? coupon.expiresAt.getTime() < now : false
            const exhausted = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses
            const usable = coupon.isActive && !expired && !exhausted

            return (
              <li key={coupon.id} className="flex flex-col rounded-2xl border border-surface-border bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p dir="ltr" className="text-left text-base font-extrabold tracking-wider text-primary">
                      {coupon.code}
                    </p>
                    <p className="mt-1 truncate text-xs text-ink-muted">{coupon.label}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1 text-[11px] font-bold',
                      usable
                        ? 'bg-secondary/[0.12] text-secondary-dark'
                        : coupon.isActive
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-surface-muted text-ink-muted',
                    )}
                  >
                    {usable ? 'فعال' : coupon.isActive ? (expired ? 'منقضی' : 'سقف پر') : 'غیرفعال'}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-4 text-[11px]">
                  <div>
                    <dt className="text-ink-subtle">درصد تخفیف</dt>
                    <dd className="mt-0.5 font-bold text-ink">
                      {toPersianDigits(coupon.percent)}٪
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">مصرف</dt>
                    <dd className="mt-0.5 font-bold tabular-nums text-ink">
                      {toPersianDigits(coupon.usedCount)}
                      {coupon.maxUses !== null ? ` از ${toPersianDigits(coupon.maxUses)}` : ' (نامحدود)'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">حداقل سبد</dt>
                    <dd className="mt-0.5 font-medium text-ink">
                      {coupon.minSubtotal ? formatPrice(coupon.minSubtotal) : 'ندارد'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">انقضا</dt>
                    <dd className="mt-0.5 font-medium text-ink">
                      {coupon.expiresAt ? formatJalaliDate(coupon.expiresAt) : 'ندارد'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">تاریخ ساخت</dt>
                    <dd className="mt-0.5 font-medium text-ink">{formatJalaliDate(coupon.createdAt)}</dd>
                  </div>
                </dl>

                {canManage ? (
                  <CouponEditForm
                    couponId={coupon.id}
                    label={coupon.label}
                    percent={coupon.percent}
                    minSubtotal={coupon.minSubtotal}
                    maxUses={coupon.maxUses}
                    expiresAt={coupon.expiresAt ? coupon.expiresAt.toISOString() : null}
                  />
                ) : null}

                {canManage ? (
                  <div className="mt-4">
                    {coupon.isActive ? (
                      <ActionButton
                        url={`/api/admin/coupons/${coupon.id}`}
                        body={{ isActive: false }}
                        label="غیرفعال کردن"
                        pendingLabel="در حال غیرفعال‌سازی…"
                        tone="danger"
                        confirmMessage={`کد ${coupon.code} غیرفعال شود؟ مشتریان دیگر نمی‌توانند از آن استفاده کنند.`}
                      />
                    ) : (
                      <ActionButton
                        url={`/api/admin/coupons/${coupon.id}`}
                        body={{ isActive: true }}
                        label="فعال کردن"
                        pendingLabel="در حال فعال‌سازی…"
                        tone="success"
                      />
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
