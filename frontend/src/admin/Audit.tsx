import { useCallback, useEffect, useState } from 'react'
import { get } from '../lib/api'
import { formatDate, toFa } from '../lib/format'
import type { AuditList } from './types'
import { AdminCard, AuditMetadata, EmptyState, ErrorNote, PageHeader, Pagination } from './ui'

export default function Audit() {
  const [data, setData] = useState<AuditList | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)

    get<AuditList>(`/admin/audit?page=${page}&perPage=30`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'دریافت گزارش فعالیت ناموفق بود.'))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <PageHeader
        title="گزارش فعالیت"
        description="هر تغییر مدیریتی با نام کاربر، زمان و جزئیات تغییر ثبت می‌شود."
      />

      <ErrorNote message={error} />

      <AdminCard className="overflow-hidden">
        {loading && <p className="p-6 text-center text-sm text-ink-muted">در حال بارگذاری...</p>}

        {!loading && data && data.items.length === 0 && (
          <div className="p-4">
            <EmptyState text="هنوز فعالیتی ثبت نشده است." />
          </div>
        )}

        {!loading && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-right text-xs">
              <thead className="bg-surface-muted text-ink-muted">
                <tr>
                  <th className="p-3 font-bold">زمان</th>
                  <th className="p-3 font-bold">کاربر</th>
                  <th className="p-3 font-bold">اقدام</th>
                  <th className="p-3 font-bold">موجودیت</th>
                  <th className="p-3 font-bold">جزئیات</th>
                  <th className="p-3 font-bold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.items.map((entry) => (
                  <tr key={entry.id} className="align-top hover:bg-surface-muted/50">
                    <td className="p-3 text-[11px] text-ink-muted">{formatDate(entry.createdAt)}</td>
                    <td className="p-3">
                      {entry.actor ? (
                        <>
                          <div className="font-bold">{entry.actor.name}</div>
                          <div className="text-[11px] text-ink-subtle" dir="ltr">
                            {entry.actor.phone}
                          </div>
                        </>
                      ) : (
                        <span className="text-ink-subtle">سیستم</span>
                      )}
                    </td>
                    <td className="p-3 font-bold" dir="ltr">
                      {entry.action}
                    </td>
                    <td className="p-3 text-ink-muted">
                      {entry.entity}
                      {entry.entityId && (
                        <div className="mt-1 text-[11px] text-ink-subtle" dir="ltr">
                          {entry.entityId}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[280px] p-3">
                      <AuditMetadata metadata={entry.metadata} />
                    </td>
                    <td className="p-3 text-[11px] text-ink-subtle" dir="ltr">
                      {entry.ip ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="border-t border-surface-border p-3">
            <div className="mb-2 text-center text-[11px] text-ink-subtle">{toFa(data.total)} رکورد</div>
            <Pagination page={data.page} pageCount={data.pageCount} onChange={setPage} />
          </div>
        )}
      </AdminCard>
    </div>
  )
}
