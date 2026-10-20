import type { Metadata } from 'next'
import { GatewayForm } from '@/components/admin/gateway-form'
import { buildMetadata } from '@/lib/seo'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { listGateways } from '@/lib/server/gateways'
import { isEncryptionEnabled } from '@/lib/server/settings'
import { formatJalaliDateTime } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'درگاه‌های پرداخت',
  description: 'فعال‌سازی و پیکربندی روش‌های پرداخت فروشگاه نودهی.',
  path: '/admin/payments',
  noIndex: true,
})

/**
 * درگاه‌های بانکی و روش‌های پرداخت.
 *
 * فعال/غیرفعال‌کردن هر روش، مستقیم روی صفحه تسویه اثر می‌گذارد: سرور روش
 * پرداخت را با همین رکوردها اعتبارسنجی می‌کند، پس حتی درخواست دستی هم از
 * روشی که در پنل خاموش است عبور نمی‌کند.
 */
export default async function AdminPaymentsPage() {
  const [staff, gateways, encryptionEnabled] = await Promise.all([
    getStaffUser(),
    listGateways(),
    isEncryptionEnabled(),
  ])
  const canManage = Boolean(staff && isAdminRole(staff.role))

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">درگاه‌های پرداخت</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          روش‌های پرداخت قابل انتخاب در تسویه حساب. اگر روشی خاموش باشد، در صفحه تسویه هم حذف می‌شود و درخواست
          دستی آن با خطا برگردانده می‌شود. تغییر این بخش اثر مستقیم مالی دارد و در لاگ حسابرسی ثبت می‌گردد.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {gateways.map((gateway) => (
          <section key={gateway.key} className="flex flex-col rounded-2xl border border-surface-border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-ink">{gateway.label}</h2>
                <p className="mt-1 text-[11px] leading-5 text-ink-subtle">{gateway.description}</p>
              </div>
              <span
                className={
                  gateway.isActive
                    ? 'shrink-0 rounded-full bg-success/[0.12] px-3 py-1 text-[11px] font-bold text-success'
                    : 'shrink-0 rounded-full bg-surface-muted px-3 py-1 text-[11px] font-bold text-ink-muted'
                }
              >
                {gateway.isActive ? 'فعال' : 'غیرفعال'}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-4 text-[11px]">
              <div>
                <dt className="text-ink-subtle">حالت آزمایشی</dt>
                <dd className="mt-0.5 font-medium text-ink">{gateway.isSandbox ? 'روشن' : 'خاموش'}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">شناسه پذیرنده</dt>
                <dd className="mt-0.5 font-medium text-ink ltr-inline">{gateway.merchantId ?? 'ثبت نشده'}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">کلید API</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {gateway.apiKey ? 'ذخیره شده' : 'ثبت نشده'}
                </dd>
              </div>
              <div>
                <dt className="text-ink-subtle">آخرین تغییر</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {gateway.updatedAt.getTime() > 0 ? formatJalaliDateTime(gateway.updatedAt) : '—'}
                </dd>
              </div>
            </dl>

            {canManage ? (
              <GatewayForm
                gatewayId={gateway.id}
                label={gateway.label}
                isActive={gateway.isActive}
                isSandbox={gateway.isSandbox}
                merchantId={gateway.merchantId}
                hasApiKey={Boolean(gateway.apiKey)}
              />
            ) : (
              <p className="mt-4 text-[11px] text-ink-subtle">تغییر درگاه تنها برای مدیر کل مجاز است.</p>
            )}
          </section>
        ))}
      </div>

      {canManage && !encryptionEnabled ? (
        <p className="rounded-2xl bg-amber-50 px-5 py-4 text-[11px] leading-6 text-amber-700">
          ⚠️ متغیر <span className="ltr-inline font-bold">SETTINGS_ENCRYPTION_KEY</span> تنظیم نشده است، پس کلید
          API درگاه‌ها به شکل متن ساده در فایل دیتابیس ذخیره می‌شود. توصیه می‌شود این متغیر را تنظیم کنید.
        </p>
      ) : null}
    </div>
  )
}
