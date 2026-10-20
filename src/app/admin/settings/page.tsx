import type { Metadata } from 'next'
import Link from 'next/link'
import { SettingsForm } from '@/components/admin/settings-form'
import { buildMetadata } from '@/lib/seo'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { getSettingFields, isEncryptionEnabled, SETTING_GROUP_LABELS } from '@/lib/server/settings'

export const metadata: Metadata = buildMetadata({
  title: 'تنظیمات سایت و صفحات',
  description: 'اطلاعات عمومی سایت، نوار اعلان، حالت تعمیرات و محتوای هیرو صفحه اصلی.',
  path: '/admin/settings',
  noIndex: true,
})

/**
 * تنظیمات عمومی سایت و تنظیمات صفحات.
 *
 * مقدارها در جدول `Setting` می‌نشینند و کلیدهای مجاز در `lib/server/settings.ts`
 * تعریف شده‌اند؛ این صفحه فقط فرم را با همان فهرست می‌سازد. افزودن کلید تازه
 * نیازی به تغییر این فایل ندارد.
 */
export default async function AdminSettingsPage() {
  const [staff, generalFields, pageFields, encryptionEnabled] = await Promise.all([
    getStaffUser(),
    getSettingFields('general'),
    getSettingFields('pages'),
    isEncryptionEnabled(),
  ])

  const canEdit = Boolean(staff)

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">تنظیمات سایت و صفحات</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          این تنظیمات روی سایتِ منتشرشده اثر می‌گذارد و بدون انتشار دوباره اعمال می‌شود. پس از ذخیره، صفحه‌های
          سایت تازه‌سازی می‌شوند تا متن اعلان و محتوای صفحه اصلی بلافاصله عوض شود.
        </p>
      </header>

      {/* دسترسی سریع به تنظیمات حساس — کلیدهای اعتبارنامه اینجا نیستند */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <h2 className="text-sm font-bold text-ink">تنظیمات حساس در صفحه‌های جداگانه</h2>
        <p className="mt-1.5 text-xs leading-6 text-ink-muted">
          کلیدهای API و اعتبارنامه‌ها عمداً از این صفحه جدا شده‌اند و تنها مدیر کل به آن‌ها دسترسی دارد.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/sms"
            className="rounded-xl border border-surface-border px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
          >
            <span className="block text-xs font-bold text-ink">سرویس پیامک</span>
            <span className="mt-1 block text-[11px] text-ink-subtle">کلید API، قالب‌ها و لاگ ارسال</span>
          </Link>
          <Link
            href="/admin/payments"
            className="rounded-xl border border-surface-border px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
          >
            <span className="block text-xs font-bold text-ink">درگاه‌های پرداخت</span>
            <span className="mt-1 block text-[11px] text-ink-subtle">فعال‌سازی، حالت آزمایشی و شناسه پذیرنده</span>
          </Link>
          <Link
            href="/admin/automation"
            className="rounded-xl border border-surface-border px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
          >
            <span className="block text-xs font-bold text-ink">اتوماسیون</span>
            <span className="mt-1 block text-[11px] text-ink-subtle">وبهوک، رویدادها و لاگ ارسال</span>
          </Link>
          <Link
            href="/admin/integrations"
            className="rounded-xl border border-surface-border px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
          >
            <span className="block text-xs font-bold text-ink">یکپارچه‌سازی‌ها</span>
            <span className="mt-1 block text-[11px] text-ink-subtle">اسنپ‌پی، دیجی‌کالا و ترب — پیش‌فرض خاموش</span>
          </Link>
        </div>
      </section>

      {canEdit ? (
        <>
          <SettingsForm
            group="general"
            title={SETTING_GROUP_LABELS.general}
            description="اطلاعات تماس و آستانه‌های عملیاتی. تلفن و ایمیل پشتیبانی در پیامک‌ها و ایمیل‌های اطلاع‌رسانی استفاده می‌شوند."
            fields={generalFields}
            encryptionEnabled={encryptionEnabled}
          />

          <SettingsForm
            group="pages"
            title={SETTING_GROUP_LABELS.pages}
            description="متن نوار اعلان بالای سایت، حالت تعمیرات و محتوای بخش هیرو صفحه اصلی. حالت تعمیرات سایت را نمی‌بندد؛ فقط نوار هشدار نشان می‌دهد."
            fields={pageFields}
            encryptionEnabled={encryptionEnabled}
          />
        </>
      ) : (
        <p className="rounded-2xl border border-surface-border bg-white p-5 text-xs text-ink-muted">
          شما اجازه ویرایش تنظیمات را ندارید. نقش حسابدار فقط گزارش‌ها را می‌بیند.
        </p>
      )}

      {!isAdminRole(staff?.role ?? '') ? (
        <p className="text-[11px] leading-5 text-ink-subtle">
          نکته: تنظیمات پیامک، اتوماسیون و یکپارچه‌سازی‌ها تنها برای مدیر کل قابل تغییر است.
        </p>
      ) : null}
    </div>
  )
}
