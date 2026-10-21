import { useEffect, useState, type FormEvent } from 'react'
import { del, get, patch, type AdminReview, type Paginated } from '../../lib/api'
import { formatDate, toFa } from '../../lib/format'
import { StarIcon } from '../../components/icons'
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  ErrorNote,
  Notice,
  Pagination,
  StatusPill,
  inputClass,
} from './adminUi'

const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تأییدشده',
  rejected: 'ردشده',
}

export default function AdminReviews() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paginated<AdminReview> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ page: String(page), perPage: '20' })
    if (search) params.set('q', search)
    if (status) params.set('status', status)

    get<Paginated<AdminReview>>(`/admin/reviews?${params}`)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت نظرات ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [search, status, page, reloadKey])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(query.trim())
  }

  async function moderate(review: AdminReview, next: 'approved' | 'rejected' | 'pending') {
    setBusyId(review.id)
    setError(null)
    try {
      await patch(`/admin/reviews/${review.id}`, { status: next })
      setNotice(
        next === 'approved'
          ? 'نظر تأیید شد و در صفحهٔ محصول نمایش داده می‌شود.'
          : next === 'rejected'
            ? 'نظر رد شد.'
            : 'نظر به وضعیت در انتظار برگشت.',
      )
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت نظر ناموفق بود.')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(review: AdminReview) {
    if (!window.confirm('این نظر برای همیشه حذف شود؟')) return

    setBusyId(review.id)
    setError(null)
    try {
      await del(`/admin/reviews/${review.id}`)
      setNotice('نظر حذف شد.')
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف نظر ناموفق بود.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="نظرات"
        description="تأیید یا رد نظرهای مشتریان. امتیاز و تعداد نظر هر محصول پس از هر تغییر، از روی نظرهای تأییدشده دوباره محاسبه می‌شود."
      />

      <Notice message={notice} />
      <ErrorNote message={error} />

      <AdminCard className="mt-3 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border p-3">
          <form onSubmit={submitSearch} className="flex flex-1 flex-wrap gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجوی نویسنده، عنوان یا نامک محصول..."
              className={`${inputClass} sm:max-w-sm`}
              aria-label="جستجوی نظر"
            />
            <button type="submit" className="rounded-xl bg-surface-muted px-4 text-xs font-bold hover:bg-surface-border">
              جستجو
            </button>
          </form>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className={`${inputClass} w-auto`}
            aria-label="وضعیت نظر"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار بررسی</option>
            <option value="approved">تأییدشده</option>
            <option value="rejected">ردشده</option>
          </select>
        </div>

        {loading && <EmptyState message="در حال بارگذاری..." />}
        {!loading && data && data.items.length === 0 && <EmptyState message="نظری با این فیلترها پیدا نشد." />}

        {!loading && data && data.items.length > 0 && (
          <ul className="divide-y divide-surface-border">
            {data.items.map((review) => (
              <li key={review.id} className="grid gap-3 p-4 hover:bg-surface-muted/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold">{review.title}</span>
                      <StatusPill status={review.status} label={REVIEW_STATUS_LABELS[review.status]} />
                    </div>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      {review.author}
                      {review.userPhone && <span className="ltr-inline"> — {review.userPhone}</span>}
                      <span> — {formatDate(review.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <StarIcon key={index} className={`h-3.5 w-3.5 ${index < review.rating ? '' : 'opacity-25'}`} />
                    ))}
                    <span className="mr-1 text-[11px] font-bold text-ink-muted">{toFa(review.rating)}</span>
                  </div>
                </div>

                <p className="text-xs leading-7 text-ink-muted">{review.body}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-border pt-3">
                  <p className="text-[11px] text-ink-subtle">
                    محصول: <span className="font-bold text-ink-muted">{review.productName}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                    {review.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={busyId === review.id}
                        onClick={() => moderate(review, 'approved')}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        تأیید
                      </button>
                    )}
                    {review.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={busyId === review.id}
                        onClick={() => moderate(review, 'rejected')}
                        className="rounded-lg border border-danger/30 px-3 py-1.5 text-danger hover:bg-danger/5 disabled:opacity-50"
                      >
                        رد
                      </button>
                    )}
                    {review.status !== 'pending' && (
                      <button
                        type="button"
                        disabled={busyId === review.id}
                        onClick={() => moderate(review, 'pending')}
                        className="rounded-lg border border-surface-border px-3 py-1.5 hover:bg-surface-muted disabled:opacity-50"
                      >
                        بازگشت به صف
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === review.id}
                      onClick={() => remove(review)}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-ink-muted hover:bg-surface-muted disabled:opacity-50"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {data && data.total > 0 && (
          <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onChange={setPage} />
        )}
      </AdminCard>
    </div>
  )
}
