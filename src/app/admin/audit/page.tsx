import Link from 'next/link'
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import {
  auditActionLabel,
  auditActorName,
  AUDIT_ENTITY_LABELS,
  getAuditLogs,
  STAFF_ROLE_LABELS,
} from '@/lib/server/admin'
import { formatAuditMetadata } from '@/lib/server/audit'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDateTime, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'گزارش فعالیت',
  description: 'لاگ حسابرسی تغییرهای مدیریتی: چه کسی، چه زمانی، چه چیزی را عوض کرد.',
  path: '/admin/audit',
  noIndex: true,
})

const ENTITY_FILTERS = [
  { label: 'همه', value: '' },
  { label: 'سفارش', value: 'Order' },
  { label: 'کاربر', value: 'User' },
  { label: 'کد تخفیف', value: 'Coupon' },
  { label: 'نظر', value: 'Review' },
  { label: 'پیام تماس', value: 'ContactMessage' },
  { label: 'هشدار موجودی', value: 'StockAlert' },
]

/** پیوند به صفحه مربوط به هر موجودیت، تا از لاگ بتوان مستقیم به رکورد رسید */
function entityHref(entity: string, entityId: string | null): string | null {
  if (!entityId) return null
  switch (entity) {
    case 'Order':
      return `/admin/orders/${entityId}`
    case 'User':
      return `/admin/customers/${entityId}`
    case 'Coupon':
      return '/admin/coupons'
    case 'Review':
      return '/admin/reviews'
    case 'ContactMessage':
      return '/admin/messages'
    case 'StockAlert':
      return '/admin/stock-alerts'
    default:
      return null
  }
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { entity?: string }
}) {
  const requested = searchParams.entity ?? ''
  const entityFilter = ENTITY_FILTERS.some((item) => item.value === requested) ? requested : ''

  const logs = await getAuditLogs({ entity: entityFilter || undefined, take: 120 })

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">گزارش فعالیت</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          هر تغییر مدیریتی — وضعیت سفارش، کد تخفیف، بازبینی نظر، وضعیت کاربر و — با نام کاربر و زمان در این
          جدول ثبت می‌شود. این گزارش فقط‌خواندنی است و پاک نمی‌شود؛ برای همین پاسخ «چه کسی این را عوض کرد؟»
          همیشه در دسترس است.
        </p>
      </header>

      <nav aria-label="فیلتر نوع موجودیت" className="flex flex-wrap gap-2">
        {ENTITY_FILTERS.map((item) => {
          const active = entityFilter === item.value
          return (
            <Link
              key={item.value || 'all'}
              href={item.value ? `/admin/audit?entity=${item.value}` : '/admin/audit'}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/[0.06] text-primary'
                  : 'border-surface-border text-ink-muted hover:bg-surface-muted',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {logs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-14 text-center text-sm text-ink-muted">
          رکوردی برای نمایش وجود ندارد. با انجام اولین تغییر مدیریتی، این گزارش پر می‌شود.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-border bg-white">
          <table className="w-full min-w-[860px] text-right text-xs">
            <thead>
              <tr className="bg-surface-muted text-ink-muted">
                <th className="px-4 py-3 font-medium">زمان</th>
                <th className="px-4 py-3 font-medium">کاربر</th>
                <th className="px-4 py-3 font-medium">کنش</th>
                <th className="px-4 py-3 font-medium">موجودیت</th>
                <th className="px-4 py-3 font-medium">جزئیات</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {logs.map((entry) => {
                const metadata = formatAuditMetadata(entry.metadata)
                const href = entityHref(entry.entity, entry.entityId)
                return (
                  <tr key={entry.id} className="align-top hover:bg-surface-muted/60">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-subtle">
                      {formatJalaliDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-ink">{auditActorName(entry.actor)}</span>
                      <span className="mt-0.5 block text-[10px] text-ink-subtle">
                        {entry.actor ? STAFF_ROLE_LABELS[entry.actor.role] ?? entry.actor.role : 'سیستم'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/[0.08] px-2.5 py-0.5 text-[10px] font-medium text-primary">
                        {auditActionLabel(entry.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {href ? (
                        <Link href={href} className="text-ink-muted hover:text-primary">
                          {AUDIT_ENTITY_LABELS[entry.entity] ?? entry.entity}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">
                          {AUDIT_ENTITY_LABELS[entry.entity] ?? entry.entity}
                        </span>
                      )}
                      <span className="mt-0.5 block break-all text-[10px] text-ink-subtle ltr-inline">
                        {entry.entityId ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {metadata.length > 0 ? (
                        <span className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-subtle">
                          {metadata.map((item) => (
                            <span key={item.key}>
                              {item.key}: <span className="text-ink-muted">{item.value}</span>
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-[10px] text-ink-subtle">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[10px] text-ink-subtle ltr-inline">
                      {entry.ip ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] leading-5 text-ink-subtle">
        {toPersianDigits(logs.length)} رکورد آخر نمایش داده شده است. لاگ حسابرسی حذف یا ویرایش نمی‌شود تا
        قابلیت پیگیری حفظ شود.
      </p>
    </div>
  )
}
