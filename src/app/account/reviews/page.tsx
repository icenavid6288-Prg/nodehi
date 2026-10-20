import Link from 'next/link'
import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/button'
import { Rating } from '@/components/ui/rating'
import { prisma } from '@/lib/db'
import { productIndex } from '@/lib/server/catalog'
import { buildMetadata } from '@/lib/seo'
import { getCurrentUser } from '@/lib/server/auth/session'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'نظرات من',
  description: 'نظرات ثبت‌شده شما روی کالاهای نودهی و وضعیت انتشار آن‌ها.',
  path: '/account/reviews',
  noIndex: true,
})

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  approved: { label: 'منتشرشده', className: 'bg-success/10 text-success' },
  pending: { label: 'در انتظار تأیید', className: 'bg-amber-50 text-amber-700' },
  rejected: { label: 'منتشرنشده', className: 'bg-danger/[0.08] text-danger' },
}

export default async function AccountReviewsPage() {
  const user = await getCurrentUser()
  const reviews = user
    ? await prisma.review.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    : []

  const productBySlug = await productIndex(
    reviews.map((review) => review.productSlug),
    { includeInactive: true },
  )

  const approvedCount = reviews.filter((review) => review.status === 'approved').length

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">نظرات من</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          نظرات شما پس از بررسی کارشناسان منتشر می‌شوند. تجربه واقعی شما به خریداران دیگر در انتخاب بهتر کمک
          می‌کند.
          {reviews.length > 0
            ? ` از ${reviews.length} نظر ثبت‌شده، ${approvedCount} مورد منتشر شده است.`
            : ''}
        </p>
      </header>

      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-14 text-center">
          <p className="text-sm font-bold text-ink">هنوز نظری ثبت نکرده‌اید</p>
          <p className="mt-1.5 text-xs leading-6 text-ink-muted">
            پس از دریافت سفارش می‌توانید از صفحه هر کالا نظر و امتیاز خود را ثبت کنید.
          </p>
          <ButtonLink href="/account/orders" variant="primary" size="sm" className="mt-4">
            مشاهده سفارش‌ها
          </ButtonLink>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => {
            const product = productBySlug[review.productSlug]
            const badge = STATUS_STYLES[review.status] ?? {
              label: review.status,
              className: 'bg-surface-muted text-ink-muted',
            }

            return (
              <li key={review.id} className="rounded-2xl border border-surface-border bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {product ? (
                    <Link
                      href={`/product/${review.productSlug}#reviews`}
                      className="text-sm font-bold text-ink transition-colors hover:text-primary"
                    >
                      {product.name}
                    </Link>
                  ) : (
                    // کالا ممکن است از کاتالوگ حذف شده باشد ولی نظر باقی بماند
                    <span className="ltr-inline text-sm font-bold text-ink">{review.productSlug}</span>
                  )}
                  <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-medium', badge.className)}>
                    {badge.label}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <Rating value={review.rating} showValue={false} size="sm" />
                  <span className="text-xs text-ink-subtle">{formatJalaliDate(review.createdAt)}</span>
                </div>

                <h2 className="mt-3 text-sm font-bold text-ink">{review.title}</h2>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-7 text-ink-muted">{review.body}</p>

                {review.status === 'pending' ? (
                  <p className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-[11px] leading-5 text-ink-muted">
                    نظر شما در صف بازبینی است و پس از تأیید روی صفحه کالا نمایش داده می‌شود.
                  </p>
                ) : review.status === 'rejected' ? (
                  <p className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-[11px] leading-5 text-ink-muted">
                    این نظر منتشر نشد. اگر فکر می‌کنید اشتباهی رخ داده است، با پشتیبانی تماس بگیرید.
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
