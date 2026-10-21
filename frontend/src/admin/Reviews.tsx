import { useCallback, useEffect, useState } from 'react'
import { get, patch } from '../lib/api'
import { formatDate, toFa } from '../lib/format'
import type { AdminReviewList } from './types'
import { AdminCard, EmptyState, ErrorNote, PageHeader, Pagination, StatusBadge, SuccessNote } from './ui'

const tabs = [
  { value: 'pending', label: 'در انتظار' },
  { value: 'approved', label: 'تأییدشده' },
  { value: 'rejected', label: 'ردشده' },
]

export default function Reviews() {
  const [status, setStatus] = useState('pending')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AdminReviewList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)

    get<AdminReviewList>(`/admin/reviews?status=${status}&page=${page}&perPage=15`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'دریافت نظرات ناموفق بود.'))
      .finally(() => setLoading(false))
  }, [status, page])

  useEffect(() => {
    load()
  }, [load])

  async function moderate(id: number, next: 'approved' | 'rejected') {
    setBusyId(id)
    setError(null)
    setMessage(null)

    try {
      await patch<{ ok: boolean }>(`/admin/reviews/${id}`, { status: next })
      setMessage(next === 'approved' ? 'نظر تأیید شد و در سایت نمایش داده می‌شود.' : 'نظر رد شد.')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت نظر ناموفق بود.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader title="نظرات" description="بررسی، تأیید یا رد نظرهای مشتریان." />

      <ErrorNote message={error} />
      <SuccessNote message={message} />

      <AdminCard className="overflow-hidden">
        <div className="flex gap-1 border-b border-surface-border p-3">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatus(tab.value)
                setPage(1)
              }}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                status === tab.value ? 'bg-primary text-white' : 'text-ink-muted hover:bg-surface-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <p className="p-6 text-center text-sm text-ink-muted">در حال بارگذاری...</p>}

        {!loading && data && data.items.length === 0 && (
          <div className="p-4">
            <EmptyState text="نظری در این وضعیت وجود ندارد." />
          </div>
        )}

        {!loading && data && data.items.length > 0 && (
          <ul className="divide-y divide-surface-border">
            {data.items.map((review) => (
              <li key={review.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold">{review.title}</div>
                    <div className="mt-1 text-[11px] text-ink-muted">
                      {review.author} — {review.productName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
                      ★ {toFa(review.rating)}
                    </span>
                    <StatusBadge status={review.status} />
                  </div>
                </div>

                <p className="mt-3 text-xs leading-6 text-ink-muted">{review.body}</p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-ink-subtle">{formatDate(review.createdAt)}</span>
                  <div className="flex gap-2">
                    {review.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={busyId === review.id}
                        onClick={() => moderate(review.id, 'approved')}
                        className="rounded-lg bg-success px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                      >
                        تأیید
                      </button>
                    )}
                    {review.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={busyId === review.id}
                        onClick={() => moderate(review.id, 'rejected')}
                        className="rounded-lg border border-danger/30 px-3 py-1.5 text-[11px] font-bold text-danger disabled:opacity-60"
                      >
                        رد
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {data && (
          <div className="border-t border-surface-border p-3">
            <div className="mb-2 text-center text-[11px] text-ink-subtle">{toFa(data.total)} نظر</div>
            <Pagination page={data.page} pageCount={data.pageCount} onChange={setPage} />
          </div>
        )}
      </AdminCard>
    </div>
  )
}
