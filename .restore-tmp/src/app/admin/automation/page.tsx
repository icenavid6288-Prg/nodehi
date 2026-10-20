import type { Metadata } from 'next'
import { RetryEventButton } from '@/components/admin/retry-event-button'
import { SettingsForm } from '@/components/admin/settings-form'
import { prisma } from '@/lib/db'
import { buildMetadata } from '@/lib/seo'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import {
  AUTOMATION_EVENT_LABELS,
  AUTOMATION_STATUS_LABELS,
} from '@/lib/server/automation'
import { getSettingFields, isEncryptionEnabled, SETTING_GROUP_LABELS } from '@/lib/server/settings'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDateTime, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'اتوماسیون',
  description: 'پیکربندی وبهوک n8n/Make، انتخاب رویدادها و لاگ ارسال رویدادها.',
  path: '/admin/automation',
  noIndex: true,
})

/**
 * اتوماسیون: وبهوک خروجی، انتخاب رویدادها و لاگ ارسال.
 *
 * ── چرا لاگ رویدادها اهمیت دارد؟ ──
 * قبلاً ارسال رویداد «آتش و فراموش» بود. اگر n8n خاموش بود، هیچ‌کس نمی‌فهمید
 * که سناریوی پیامک «سفارش ارسال شد» هرگز اجرا نشده. حالا وضعیت هر ارسال،
 * کد پاسخ و متن خطا دیده می‌شود و ارسال دوباره ممکن است.
 *
 * ── نکته پیاده‌سازی ──
 * ارسال دوباره، همان بدنه ذخیره‌شده را می‌فرستد؛ پس امضای HMAC و شناسه رویداد
 * تغییر نمی‌کند و سمت n8n پردازش تکراری رخ نمی‌دهد.
 */
export default async function AdminAutomationPage() {
  const staff = await getStaffUser()
  const canManage = Boolean(staff && isAdminRole(staff.role))

  const [fields, encryptionEnabled, events, stats] = await Promise.all([
    getSettingFields('automation'),
    isEncryptionEnabled(),
    prisma.automationEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
    prisma.automationEvent.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const countByStatus = new Map(stats.map((entry) => [entry.status, entry._count._all]))
  const sent = countByStatus.get('sent') ?? 0
  const failed = countByStatus.get('failed') ?? 0
  const skipped = countByStatus.get('skipped') ?? 0

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">اتوماسیون</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          نودهی رویدادها را با امضای HMAC به n8n یا Make می‌فرستد. سمت آن‌هاست که از رویداد «ثبت سفارش»،
          پیامک تأیید، برچسب ارسال و کارهای انبار ساخته می‌شود. بدون کلید امضا هیچ رویدادی ارسال نمی‌شود، چون
          وبهوک بدون امضا برای هر فرستنده‌ای باز است.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="رویداد ارسال‌شده" value={toPersianDigits(sent)} />
        <Stat label="رویداد ناموفق" value={toPersianDigits(failed)} tone={failed > 0 ? 'danger' : 'default'} />
        <Stat label="ارسال‌نشده (خاموش یا بدون پیکربندی)" value={toPersianDigits(skipped)} />
      </div>

      {canManage ? (
        <SettingsForm
          group="automation"
          title={SETTING_GROUP_LABELS.automation}
          description="آدرس وبهوک و کلید امضا را از تنظیمات n8n بردارید. کلید ذخیره‌شده هرگز به مرورگر فرستاده نمی‌شود."
          fields={fields}
          encryptionEnabled={encryptionEnabled}
        />
      ) : (
        <p className="rounded-2xl border border-surface-border bg-white p-5 text-xs text-ink-muted">
          تغییر پیکربندی اتوماسیون تنها برای مدیر کل مجاز است.
        </p>
      )}

      {/* لاگ رویدادها */}
      <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
        <h2 className="border-b border-surface-border px-5 py-3.5 text-sm font-bold text-ink">
          رویدادهای اخیر
        </h2>

        {events.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-ink-muted">
            هنوز رویدادی ثبت نشده است. با ثبت یک سفارش یا تغییر وضعیت آن، این جدول پر می‌شود.
          </p>
        ) : (
          <ul className="divide-y divide-surface-border">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-bold text-ink">
                      {AUTOMATION_EVENT_LABELS[event.event] ?? event.event}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                        event.status === 'sent'
                          ? 'bg-success/[0.12] text-success'
                          : event.status === 'failed'
                            ? 'bg-danger/[0.08] text-danger'
                            : 'bg-surface-muted text-ink-muted',
                      )}
                    >
                      {AUTOMATION_STATUS_LABELS[event.status] ?? event.status}
                    </span>
                    <span className="text-[10px] text-ink-subtle">
                      {formatJalaliDateTime(event.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-5 text-ink-subtle">
                    {event.attempts > 1 ? `تلاش‌ها: ${toPersianDigits(event.attempts)} — ` : ''}
                    {event.responseStatus ? `کد پاسخ: ${toPersianDigits(event.responseStatus)} — ` : ''}
                    {event.lastError ?? 'بدون خطا'}
                  </p>
                </div>

                {canManage && event.status !== 'sent' ? (
                  <RetryEventButton eventId={event.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[11px] leading-5 text-ink-subtle">
        رویدادهای «ارسال‌نشده» یعنی اتوماسیون خاموش بوده یا پیکربندی ناقص داشته است؛ خود رویداد ثبت شده تا
        بتوانید بعد از تنظیم، آن را دوباره بفرستید.
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
