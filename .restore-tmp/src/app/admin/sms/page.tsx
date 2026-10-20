import type { Metadata } from 'next'
import { SmsTestForm } from '@/components/admin/sms-test-form'
import { SettingsForm } from '@/components/admin/settings-form'
import { prisma } from '@/lib/db'
import { buildMetadata } from '@/lib/seo'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { getSettingFields, isEncryptionEnabled, SETTING_GROUP_LABELS } from '@/lib/server/settings'
import { SMS_PURPOSE_LABELS } from '@/lib/server/sms'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDateTime, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'سرویس پیامک',
  description: 'پیکربندی سرویس پیامک، ارسال پیام آزمایشی و لاگ ارسال‌ها.',
  path: '/admin/sms',
  noIndex: true,
})

/**
 * پنل پیامک: پیکربندی، آزمایش اتصال و تاریخچه ارسال.
 *
 * تا پیش از این، تنها نشانه درست‌کار‌کردن پیامک، «رسیدن یا نرسیدن کد ورود»
 * بود. حالا هر ارسال با وضعیت، کانال و متن خطا ثبت می‌شود و می‌توان پیش از
 * تحویل دادن سایت، اتصال را با یک پیام آزمایشی سنجید.
 */
export default async function AdminSmsPage() {
  const staff = await getStaffUser()
  const canManage = Boolean(staff && isAdminRole(staff.role))

  const [fields, encryptionEnabled, messages, stats] = await Promise.all([
    getSettingFields('sms'),
    isEncryptionEnabled(),
    prisma.smsMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
    prisma.smsMessage.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const countByStatus = new Map(stats.map((entry) => [entry.status, entry._count._all]))
  const sent = countByStatus.get('sent') ?? 0
  const failed = countByStatus.get('failed') ?? 0

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">سرویس پیامک</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          کد ورود و اطلاع‌رسانی سفارش از همین سرویس ارسال می‌شود. تا وقتی «ارسال پیامک فعال باشد» روشن نشود،
          کد ورود فقط در لاگ سرور چاپ می‌شود و در پاسخ API برمی‌گردد (حالت توسعه).
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="پیامک ارسال‌شده" value={toPersianDigits(sent)} />
        <Stat label="ارسال ناموفق" value={toPersianDigits(failed)} tone={failed > 0 ? 'danger' : 'default'} />
        <Stat label="آخرین ارسال" value={messages[0] ? formatJalaliDateTime(messages[0].createdAt) : '—'} />
      </div>

      {canManage ? (
        <>
          <SettingsForm
            group="sms"
            title={SETTING_GROUP_LABELS.sms}
            description="کلید API و نام قالب‌ها از پنل کاوه‌نگار گرفته می‌شود. کلید ذخیره‌شده هرگز به مرورگر فرستاده نمی‌شود."
            fields={fields}
            encryptionEnabled={encryptionEnabled}
          />
          <SmsTestForm />
        </>
      ) : (
        <p className="rounded-2xl border border-surface-border bg-white p-5 text-xs text-ink-muted">
          تغییر پیکربندی پیامک تنها برای مدیر کل مجاز است.
        </p>
      )}

      {/* لاگ ارسال‌ها */}
      <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
        <h2 className="border-b border-surface-border px-5 py-3.5 text-sm font-bold text-ink">
          تاریخچه ارسال‌ها
        </h2>

        {messages.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-ink-muted">
            هنوز پیامکی ارسال نشده است. با فرم «ارسال پیام آزمایشی» شروع کنید.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-xs">
              <thead>
                <tr className="bg-surface-muted text-ink-muted">
                  <th className="px-5 py-3 font-medium">زمان</th>
                  <th className="px-5 py-3 font-medium">شماره</th>
                  <th className="px-5 py-3 font-medium">نوع</th>
                  <th className="px-5 py-3 font-medium">کانال</th>
                  <th className="px-5 py-3 font-medium">وضعیت</th>
                  <th className="px-5 py-3 font-medium">جزئیات خطا</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {messages.map((message) => (
                  <tr key={message.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-ink-subtle">
                      {formatJalaliDateTime(message.createdAt)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-ink ltr-inline">
                      {toPersianDigits(message.phone)}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {SMS_PURPOSE_LABELS[message.purpose] ?? message.purpose}
                      {message.template ? (
                        <span className="mt-0.5 block text-[10px] text-ink-subtle ltr-inline">
                          {message.template}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {message.channel === 'log' ? 'لاگ سرور (بدون سرویس)' : message.provider}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                          message.status === 'sent'
                            ? 'bg-success/[0.12] text-success'
                            : 'bg-danger/[0.08] text-danger',
                        )}
                      >
                        {message.status === 'sent' ? 'ارسال شد' : 'ناموفق'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[10px] text-ink-subtle">
                      {message.error ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[11px] leading-5 text-ink-subtle">
        نکته امنیتی: متن پیامک کد ورود هرگز در این جدول ذخیره نمی‌شود؛ فقط قالب و وضعیت ارسال ثبت می‌گردد تا
        خودِ کد در دیتابیس و نسخه پشتیبان باقی نماند.
      </p>
    </div>
  )
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'danger' }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={cn(
          'mt-2 text-lg font-extrabold tabular-nums',
          tone === 'danger' ? 'text-danger' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  )
}
