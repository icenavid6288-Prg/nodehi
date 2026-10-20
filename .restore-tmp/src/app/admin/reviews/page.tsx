import Link from 'next/link'
import type { Metadata } from 'next'
import { ActionButton } from '@/components/admin/action-button'
import { prisma } from '@/lib/db'
import { productIndex } from '@/lib/server/catalog'
import { buildMetadata } from '@/lib/seo'
import { canMutate, getStaffUser } from '@/lib/server/admin'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDateTime, ratingToStars, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'بازبینی نظرات',
  description: 'تأیید یا رد نظرات کاربران فروشگاه نودهی.',
  path: '/admin/reviews',
  noIndex: true,
})

const TABS = [
  { label: 'در انتظار تأیید', value: 'pending' },
  { label: 'تأییدشده', value: 'approved' },
  { label: 'ردشده', value: 'rejected' },
  { label: 'همه', value: '' },
]

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const staff = await getStaffUser()
  const readOnly = !staff || !canMutate(staff.role)

  const requested = searchParams.status ?? 'pending'
  const statusFilter = ['pending', 'approved', 'rejected', ''].includes(requested) ? requested : 'pending'

  const [reviews, counts] = await Promise.all([
    prisma.review.findMany({
      where: statusFilter ? { status: statusFilter } : {},
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  // نام و تصویر کالا از دیتابیس؛ غیرفعال‌ها هم می‌آیند تا نظر کالای حذف‌شده
  // در صف بازبینی بی‌نام نماند
  const productBySlug = await productIndex(
    reviews.map((review) => review.productSlug),
    { includeInactive: true },
  )

  const countByStatus = new Map(counts.map((entry) => [entry.status, entry._count._all]))
  const total = counts.reduce((sum, entry) => sum + entry._count._all, 0)

  function countFor(value: string): number {
    return value ? (countByStatus.get(value) ?? 0) : total
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">بازبینی نظرات</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          نظرها پیش از تأیید روی صفحه محصول دیده نمی‌شوند، پس این صف تنها راه ورود محتوای کاربر به سایت است.
          {readOnly ? ' نقش شما فقط اجازه مشاهده دارد.' : ''}
        </p>
      </header>

      <nav aria-label="فیلتر وضعیت" className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = statusFilter === tab.value
          return (
            <Link
              key={tab.value || 'all'}
              href={tab.value ? `/admin/reviews?status=${tab.value}` : '/admin/reviews?status='}
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

      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-14 text-center text-sm text-ink-muted">
          نظری در این وضعیت وجود ندارد.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => {
            const product = productBySlug[review.productSlug]
            const stars = ratingToStars(review.rating)
            return (
              <li key={review.id} className="rounded-2xl border border-surface-border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-sm font-bold text-ink">{review.author}</span>
                      <span className="text-[10px] text-ink-subtle">
                        {formatJalaliDateTime(review.createdAt)}
                      </span>
                      {review.userId ? (
                        <span className="rounded-full bg-secondary/[0.12] px-2.5 py-0.5 text-[10px] font-medium text-secondary-dark">
                          کاربر ثبت‌شده
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-subtle">
                      برای{' '}
                      {product ? (
                        <Link href={`/product/${review.productSlug}`} className="text-primary hover:underline">
                          {product.name}
                        </Link>
                      ) : (
                        // محصول ممکن است از کاتالوگ حذف شده باشد ولی نظر باقی بماند
                        <span className="ltr-inline">{review.productSlug}</span>
                      )}
                    </p>
                  </div>

                  <span
                    className="text-[11px] tracking-tight text-accent"
                    aria-label={`امتیاز ${toPersianDigits(review.rating)} از ۵`}
                  >
                    {'★'.repeat(stars.full)}
                    {stars.half ? '⯪' : ''}
                    {'☆'.repeat(stars.empty)}
                  </span>
                </div>

                <h2 className="mt-3 text-xs font-bold text-ink">{review.title}</h2>
                <p className="mt-1.5 whitespace-pre-line text-xs leading-6 text-ink-muted">{review.body}</p>

                {readOnly ? null : (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-surface-border pt-4">
                    {review.status !== 'approved' ? (
                      <ActionButton
                        url={`/api/admin/reviews/${review.id}`}
                        body={{ status: 'approved' }}
                        label="تأیید و نمایش در سایت"
                        pendingLabel="در حال تأیید…"
                        tone="success"
                      />
                    ) : null}
                    {review.status !== 'rejected' ? (
                      <ActionButton
                        url={`/api/admin/reviews/${review.id}`}
                        body={{ status: 'rejected' }}
                        label="رد کردن"
                        pendingLabel="در حال رد کردن…"
                        tone="danger"
                        confirmMessage="این نظر رد شود؟ متن آن حذف نمی‌شود اما روی سایت نمایش داده نخواهد شد."
                      />
                    ) : null}
                    {review.status !== 'pending' ? (
                      <ActionButton
                        url={`/api/admin/reviews/${review.id}`}
                        body={{ status: 'pending' }}
                        label="بازگشت به صف"
                        pendingLabel="در حال بازگردانی…"
                      />
                    ) : null}
                    <span className="mr-auto text-[10px] text-ink-subtle">
                      وضعیت فعلی:{' '}
                      {review.status === 'approved' ? 'تأییدشده' : review.status === 'rejected' ? 'ردشده' : 'در انتظار'}
                    </span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
