import Link from 'next/link'
import type { Metadata } from 'next'
import { ActionButton } from '@/components/admin/action-button'
import { prisma } from '@/lib/db'
import { buildMetadata } from '@/lib/seo'
import { canMutate, getStaffUser } from '@/lib/server/admin'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDateTime, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'پیام‌های تماس',
  description: 'پیام‌های فرم تماس با ما در فروشگاه نودهی.',
  path: '/admin/messages',
  noIndex: true,
})

const TABS = [
  { label: 'جدید', value: 'new' },
  { label: 'در حال پیگیری', value: 'in_progress' },
  { label: 'رسیدگی‌شده', value: 'resolved' },
  { label: 'همه', value: '' },
]

const STATUS_LABELS: Record<string, string> = {
  new: 'جدید',
  in_progress: 'در حال پیگیری',
  resolved: 'رسیدگی‌شده',
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const staff = await getStaffUser()
  const readOnly = !staff || !canMutate(staff.role)

  const requested = searchParams.status ?? 'new'
  const statusFilter = ['new', 'in_progress', 'resolved', ''].includes(requested) ? requested : 'new'

  const [messages, counts] = await Promise.all([
    prisma.contactMessage.findMany({
      where: statusFilter ? { status: statusFilter } : {},
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.contactMessage.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const countByStatus = new Map(counts.map((entry) => [entry.status, entry._count._all]))
  const total = counts.reduce((sum, entry) => sum + entry._count._all, 0)

  function countFor(value: string): number {
    return value ? (countByStatus.get(value) ?? 0) : total
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">پیام‌های تماس</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          پیام‌های دریافتی از فرم «تماس با ما». پس از رسیدگی، وضعیت را به «رسیدگی‌شده» تغییر دهید تا در صف
          نماند.
          {readOnly ? ' نقش شما فقط اجازه مشاهده دارد.' : ''}
        </p>
      </header>

      <nav aria-label="فیلتر وضعیت" className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = statusFilter === tab.value
          return (
            <Link
              key={tab.value || 'all'}
              href={tab.value ? `/admin/messages?status=${tab.value}` : '/admin/messages?status='}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/[0.06] text-primary'
                  : 'border-surface-border text-ink-muted hover:bg-surface-muted',
              )}
            >
              {tab.label}
              <span className="rounded-full bg-surface-muted px-1.5 py-px text-[10px] tabular-nums text-ink-subtle">
                {toPersianDigits(countFor(tab.value))}
              </span>
            </Link>
          )
        })}
      </nav>

      {messages.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-14 text-center text-sm text-ink-muted">
          پیامی در این وضعیت وجود ندارد.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((message) => (
            <li key={message.id} className="rounded-2xl border border-surface-border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-ink">{message.subject}</h2>
                  <p className="mt-1.5 text-[11px] text-ink-subtle">
                    {message.name} —{' '}
                    <span className="ltr-inline tabular-nums">{toPersianDigits(message.phone)}</span>
                    {message.email ? (
                      <>
                        {' — '}
                        <span dir="ltr" className="ltr-inline">
                          {message.email}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-[11px] font-bold',
                    message.status === 'new'
                      ? 'bg-accent/[0.12] text-accent-dark'
                      : message.status === 'resolved'
                        ? 'bg-success/[0.12] text-success'
                        : 'bg-amber-100 text-amber-700',
                  )}
                >
                  {STATUS_LABELS[message.status] ?? message.status}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-line rounded-xl bg-surface-muted p-4 text-xs leading-6 text-ink-muted">
                {message.message}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-ink-subtle">
                  {formatJalaliDateTime(message.createdAt)}
                </span>

                {readOnly ? null : (
                  <div className="mr-auto flex flex-wrap items-center gap-2">
                    {message.status !== 'in_progress' ? (
                      <ActionButton
                        url={`/api/admin/messages/${message.id}`}
                        body={{ status: 'in_progress' }}
                        label="در حال پیگیری"
                        pendingLabel="در حال ثبت…"
                      />
                    ) : null}
                    {message.status !== 'resolved' ? (
                      <ActionButton
                        url={`/api/admin/messages/${message.id}`}
                        body={{ status: 'resolved' }}
                        label="رسیدگی شد"
                        pendingLabel="در حال ثبت…"
                        tone="success"
                      />
                    ) : null}
                    {message.status !== 'new' ? (
                      <ActionButton
                        url={`/api/admin/messages/${message.id}`}
                        body={{ status: 'new' }}
                        label="بازگشت به صف"
                        pendingLabel="در حال بازگردانی…"
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
