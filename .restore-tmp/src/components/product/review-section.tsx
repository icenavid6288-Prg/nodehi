'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Rating, RatingBreakdown } from '@/components/ui/rating'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate, toPersianDigits } from '@/lib/utils/format'
import type { Review } from '@/types'

type SortMode = 'helpful' | 'newest' | 'highest' | 'lowest'

const sortLabels: Record<SortMode, string> = {
  helpful: 'مفیدترین',
  newest: 'جدیدترین',
  highest: 'بالاترین امتیاز',
  lowest: 'پایین‌ترین امتیاز',
}

/**
 * بخش نظرات و امتیازات.
 *
 * دو جریان داده دارد:
 *  • نظرهای کاتالوگ (`reviews`) داخل HTML صفحه ثابت هستند — برای سئو.
 *  • نظرهای واقعی کاربران از `/api/reviews` خوانده می‌شوند و پس از تأیید
 *    کارشناس اینجا ظاهر می‌شوند.
 *
 * ارسال نظر نیازمند ورود با شماره همراه است؛ سرور مستقل همین را بررسی
 * می‌کند، پس مخفی‌کردن فرم از کاربر مهمان فقط یک بهبود تجربه است، نه امنیت.
 */
export function ReviewSection({
  reviews,
  rating,
  reviewCount,
  productSlug,
}: {
  reviews: Review[]
  rating: number
  reviewCount: number
  productSlug: string
}) {
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const [sort, setSort] = useState<SortMode>('helpful')
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, boolean>>({})
  const [liveReviews, setLiveReviews] = useState<Review[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  // نظرهای تأییدشده واقعی، پس از بارگذاری صفحه
  useEffect(() => {
    let cancelled = false
    fetch(`/api/reviews?slug=${encodeURIComponent(productSlug)}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok && Array.isArray(data.reviews)) {
          setLiveReviews(data.reviews as Review[])
        }
      })
      .catch(() => {
        // نبود نظرها نباید چیزی را در صفحه خراب کند
      })
    return () => {
      cancelled = true
    }
  }, [productSlug])

  const allReviews = useMemo(() => [...liveReviews, ...reviews], [liveReviews, reviews])

  const distribution = useMemo(() => {
    const map: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const review of allReviews) map[review.rating] = (map[review.rating] ?? 0) + 1
    return map
  }, [allReviews])

  const sorted = useMemo(() => {
    const list = [...allReviews]
    switch (sort) {
      case 'newest':
        return list.sort((a, b) => +new Date(b.date) - +new Date(a.date))
      case 'highest':
        return list.sort((a, b) => b.rating - a.rating)
      case 'lowest':
        return list.sort((a, b) => a.rating - b.rating)
      case 'helpful':
      default:
        return list.sort((a, b) => b.helpfulCount - a.helpfulCount)
    }
  }, [allReviews, sort])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    setPending(true)
    setFormError('')
    setFieldErrors({})

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: productSlug,
          rating: Number(data.get('rating') ?? 5),
          title: String(data.get('title') ?? ''),
          body: String(data.get('body') ?? ''),
        }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.ok) {
        setFieldErrors(result?.error?.fields ?? {})
        setFormError(result?.error?.message ?? 'ثبت نظر ناموفق بود.')
        return
      }

      // نظر با وضعیت «در انتظار تأیید» ذخیره شد؛ عمداً به فهرست اضافه نمی‌شود
      // تا کاربر خیال نکند قبل از تأیید منتشر شده است.
      setSubmitted(true)
      setFormOpen(false)
      form.reset()
    } catch {
      setFormError('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-28">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-title" className="text-lg font-extrabold text-ink">
          نظرات کاربران
        </h2>
        {isAuthenticated ? (
          <Button variant="outline" size="sm" onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? 'بستن فرم' : 'ثبت نظر شما'}
          </Button>
        ) : authLoading ? null : (
          <ButtonLink href={`/login?next=/product/${productSlug}`} variant="outline" size="sm">
            ورود برای ثبت نظر
          </ButtonLink>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* خلاصه امتیاز */}
        <div className="flex h-fit flex-col gap-4 rounded-2xl border border-surface-border bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-ink tabular-nums">{toPersianDigits(rating.toFixed(1))}</p>
              <p className="text-xs text-ink-subtle">از ۵</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Rating value={rating} showValue={false} size="lg" />
              <p className="text-xs text-ink-muted">
                بر اساس {toPersianDigits(reviewCount)} نظر ثبت‌شده
              </p>
            </div>
          </div>
          <RatingBreakdown distribution={distribution} />
        </div>

        {/* فهرست نظرات */}
        <div className="flex flex-col gap-4">
          {submitted ? (
            <p className="rounded-xl bg-secondary/10 px-4 py-3 text-sm text-secondary-dark">
              نظر شما ثبت شد و پس از تأیید کارشناسان نودهی منتشر می‌شود. سپاس از همراهی شما.
            </p>
          ) : null}

          {formOpen ? (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-white p-5">
              {formError ? (
                <p role="alert" className="rounded-xl bg-danger/[0.08] px-4 py-3 text-xs leading-6 text-danger">
                  {formError}
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="نویسنده نظر" htmlFor="review-author" hint="نام حساب کاربری شما">
                  <Input
                    id="review-author"
                    name="author"
                    defaultValue={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'کاربر نودهی'}
                    disabled
                  />
                </Field>
                <Field label="امتیاز شما" htmlFor="review-rating" error={fieldErrors.rating}>
                  <select
                    id="review-rating"
                    name="rating"
                    defaultValue="5"
                    className="h-11 w-full cursor-pointer rounded-xl border border-surface-border bg-white px-3 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25"
                  >
                    {[5, 4, 3, 2, 1].map((star) => (
                      <option key={star} value={star}>
                        {toPersianDigits(star)} ستاره
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="عنوان نظر" htmlFor="review-title" error={fieldErrors.title}>
                <Input id="review-title" name="title" required placeholder="خلاصه تجربه شما" />
              </Field>
              <Field label="متن نظر" htmlFor="review-body" error={fieldErrors.body}>
                <Textarea id="review-body" name="body" required placeholder="کیفیت ساخت، عملکرد و تجربه استفاده خود را بنویسید..." />
              </Field>
              <div className="flex items-center gap-3">
                <Button type="submit" variant="primary" disabled={pending}>
                  {pending ? 'در حال ثبت…' : 'ثبت نظر'}
                </Button>
                <p className="text-xs text-ink-subtle">نظر شما پس از بررسی کارشناسان منتشر می‌شود.</p>
              </div>
            </form>
          ) : null}

          {allReviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-10 text-center">
              <p className="text-sm font-bold text-ink">هنوز نظری ثبت نشده است</p>
              <p className="mt-1 text-xs text-ink-muted">
                اولین نفری باشید که تجربه خود را با دیگران به اشتراک می‌گذارد.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-ink-muted">مرتب‌سازی:</span>
                {(Object.keys(sortLabels) as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSort(mode)}
                    aria-pressed={sort === mode}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs transition-colors',
                      sort === mode
                        ? 'border-primary bg-primary/[0.08] font-medium text-primary'
                        : 'border-surface-border text-ink-muted hover:border-primary/40',
                    )}
                  >
                    {sortLabels[mode]}
                  </button>
                ))}
              </div>

              <ul className="flex flex-col gap-3">
                {sorted.map((review) => {
                  const voted = helpfulVotes[review.id]
                  return (
                    <li key={review.id} className="rounded-2xl border border-surface-border bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/[0.08] text-sm font-bold text-primary">
                            {review.author.slice(0, 1)}
                          </span>
                          <div>
                            <p className="flex items-center gap-2 text-sm font-bold text-ink">
                              {review.author}
                              {review.verified ? (
                                <span className="rounded-full bg-secondary/[0.12] px-2 py-0.5 text-[10px] font-medium text-secondary-dark">
                                  خرید تأییدشده
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-subtle">{formatJalaliDate(review.date)}</p>
                          </div>
                        </div>
                        <Rating value={review.rating} showValue={false} size="sm" />
                      </div>

                      <h3 className="mt-3.5 text-sm font-bold text-ink">{review.title}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-ink-muted">{review.body}</p>

                      <div className="mt-3.5 flex items-center gap-3 border-t border-surface-border pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setHelpfulVotes((votes) => ({ ...votes, [review.id]: !votes[review.id] }))
                          }
                          aria-pressed={Boolean(voted)}
                          className={cn(
                            'flex items-center gap-1.5 text-xs transition-colors',
                            voted ? 'font-medium text-secondary-dark' : 'text-ink-muted hover:text-primary',
                          )}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4">
                            <path d="M7 11l4-7a2 2 0 013 1.8V10h4.5a2 2 0 011.9 2.6l-1.8 6A2 2 0 0116.7 20H7" strokeLinejoin="round" />
                            <path d="M7 11v9H4.5A1.5 1.5 0 013 18.5v-6A1.5 1.5 0 014.5 11H7z" />
                          </svg>
                          مفید بود ({toPersianDigits(review.helpfulCount + (voted ? 1 : 0))})
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
