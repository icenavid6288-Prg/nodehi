import type { Metadata } from 'next'
import { SettingsForm } from '@/components/admin/settings-form'
import { buildMetadata } from '@/lib/seo'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { getBooleanSetting, getSettingFields, isEncryptionEnabled, SETTING_GROUP_LABELS } from '@/lib/server/settings'

export const metadata: Metadata = buildMetadata({
  title: 'یکپارچه‌سازی‌های خارجی',
  description: 'اتصال به اسنپ‌پی، دیجی‌کالا و ترب — پیش‌فرض غیرفعال.',
  path: '/admin/integrations',
  noIndex: true,
})

/**
 * یکپارچه‌سازی‌های خارجی.
 *
 * ── چرا همه به‌صورت پیش‌فرض خاموش‌اند؟ ──
 * کلید `*.enabled` هر سرویس با مقدار پیش‌فرض «false» تعریف شده و هیچ مسیری
 * از سایت به آن سرویس وصل نیست مگر مدیر کل صریحاً فعالش کند. اسنپ‌پی و
 * دیجی‌کالا هنوز اتصال واقعی ندارند (فعال‌کردنشان اثری ندارد) و ترب تنها
 * سرویسی است که با فعال‌شدن، مسیر `/api/feeds/torob` واقعاً کار می‌کند.
 *
 * اعتبارنامه‌ها به‌عنوان `secret` با AES-256-GCM ذخیره می‌شوند (اگر
 * `SETTINGS_ENCRYPTION_KEY` تنظیم شده باشد) و هرگز در پاسخ API برنمی‌گردند.
 */
export default async function AdminIntegrationsPage() {
  const [staff, encryptionEnabled, snappayFields, digikalaFields, torobFields, torobEnabled] = await Promise.all([
    getStaffUser(),
    isEncryptionEnabled(),
    getSettingFields('snappay'),
    getSettingFields('digikala'),
    getSettingFields('torob'),
    getBooleanSetting('integration.torob.enabled'),
  ])

  const canEdit = Boolean(staff && isAdminRole(staff.role))

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">یکپارچه‌سازی‌های خارجی</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          جای اتصال سرویس‌های بیرونی. همه به‌صورت پیش‌فرض خاموش‌اند؛ تا وقتی خودتان فعالشان نکنید، هیچ درخواستی
          به هیچ سرویس بیرونی فرستاده نمی‌شود و هیچ نشانی از آن‌ها در سایت مشتریان دیده نمی‌شود. کلیدهای API
          رمزنگاری‌شده ذخیره می‌شوند.
        </p>
      </header>

      {!canEdit ? (
        <p className="rounded-2xl border border-surface-border bg-white p-5 text-xs text-ink-muted">
          تغییر یکپارچه‌سازی‌ها تنها برای مدیر کل مجاز است.
        </p>
      ) : (
        <>
          <SettingsForm
            group="snappay"
            title={SETTING_GROUP_LABELS.snappay}
            description="پرداخت اعتباری (BNPL) اسنپ‌پی برای تقسیط سبد خرید مشتریان. اتصال واقعی هنوز پیاده‌سازی نشده است؛ اعتبارنامه‌ها ذخیره می‌شوند و فعال‌کردن سرویس تا آن زمان اثری روی سایت ندارد."
            fields={snappayFields}
            encryptionEnabled={encryptionEnabled}
            statusLabel="غیرفعال — به‌زودی"
          />

          <SettingsForm
            group="digikala"
            title={SETTING_GROUP_LABELS.digikala}
            description="همگام‌سازی کالاها و موجودی به‌عنوان فروشنده در دیجی‌کالا. اتصال واقعی هنوز پیاده‌سازی نشده است؛ اعتبارنامه‌ها ذخیره می‌شوند و فعال‌کردن سرویس تا آن زمان اثری روی سایت ندارد."
            fields={digikalaFields}
            encryptionEnabled={encryptionEnabled}
            statusLabel="غیرفعال — به‌زودی"
          />

          <SettingsForm
            group="torob"
            title={SETTING_GROUP_LABELS.torob}
            description="فید قیمت و موجودی کالاها برای مقایسه‌گر قیمت ترب. تنها یکپارچه‌ای که همین حالا واقعی است: با فعال‌کردن، مسیر /api/feeds/torob فهرست کالاهای فعال را با قیمت و موجودی به‌شکل JSON می‌دهد. تا وقتی خاموش است، این مسیر ۴۰۴ می‌دهد و وجودش از بیرون معلوم نیست."
            fields={torobFields}
            encryptionEnabled={encryptionEnabled}
            statusLabel={torobEnabled ? 'فعال' : 'غیرفعال'}
            statusTone={torobEnabled ? 'active' : 'muted'}
          />
        </>
      )}
    </div>
  )
}
