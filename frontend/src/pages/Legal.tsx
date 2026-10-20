import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import { ApiError, get, type LegalPageResponse } from '../lib/api'
import { formatDate } from '../lib/format'

export default function Legal({ slug }: { slug: 'terms' | 'privacy' }) {
  const { hash } = useLocation()
  const [page, setPage] = useState<LegalPageResponse['page'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    setPage(null)

    get<LegalPageResponse>(`/legal/${slug}`)
      .then((response) => alive && setPage(response.page))
      .catch((err) => {
        if (!alive) return
        setError(err instanceof ApiError && err.status === 404 ? 'این صفحه منتشر نشده است.' : 'خطا در دریافت صفحه')
      })
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [slug])

  // لینک‌های عمیق (#warranty) پیش از بارگذاری محتوا به لنگر نمی‌رسند؛ بعد از
  // رندر شدن بخش‌ها دوباره به مقصد می‌رویم.
  useEffect(() => {
    if (!page || !hash) return
    const target = document.getElementById(hash.slice(1))
    if (target) target.scrollIntoView({ block: 'start' })
  }, [page, hash])

  const otherPage = slug === 'terms' ? { to: '/privacy', label: 'سیاست حریم خصوصی' } : { to: '/terms', label: 'قوانین و مقررات' }

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: page?.title ?? (slug === 'terms' ? 'قوانین و مقررات' : 'حریم خصوصی') }]} />

      {loading && <p className="py-10 text-sm text-ink-muted">در حال بارگذاری…</p>}

      {error && !loading && (
        <div className="rounded-2xl border border-surface-border bg-white p-6">
          <p className="text-sm text-danger">{error}</p>
          <Link to="/" className="mt-3 inline-block text-xs font-bold text-primary">
            بازگشت به صفحه اصلی
          </Link>
        </div>
      )}

      {!loading && !error && page && (
        <div className="grid gap-8 pb-10 lg:grid-cols-[260px_1fr]">
          <aside className="order-2 lg:order-1 lg:sticky lg:top-28 lg:h-fit">
            <nav aria-label="فهرست بخش‌ها" className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="mb-3 text-sm font-extrabold">فهرست مطالب</h2>
              <ol className="flex flex-col gap-2 text-xs">
                {page.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="text-ink-muted transition-colors hover:text-primary">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
              <Link
                to={otherPage.to}
                className="mt-4 block border-t border-surface-border pt-3 text-xs font-bold text-primary"
              >
                {otherPage.label}
              </Link>
            </nav>
          </aside>

          <article className="order-1 min-w-0 lg:order-2">
            <header className="pb-6">
              <h1 className="text-2xl font-extrabold">{page.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-muted">{page.intro}</p>
              <p className="mt-3 text-xs text-ink-subtle">آخرین به‌روزرسانی: {formatDate(page.updatedAt)}</p>
            </header>

            <div className="flex flex-col gap-8">
              {page.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-28">
                  <h2 className="text-base font-bold">{section.title}</h2>

                  <div className="mt-2 flex flex-col gap-2.5">
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={index} className="text-sm leading-8 text-ink-muted">
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  {section.bullets.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-2 rounded-2xl border border-surface-border bg-white p-5">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2 text-sm leading-7 text-ink-muted">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </article>
        </div>
      )}
    </div>
  )
}
