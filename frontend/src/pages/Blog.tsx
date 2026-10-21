import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ArticleCard from '../components/ArticleCard'
import Breadcrumbs from '../components/Breadcrumbs'
import { get, type ArticleListResponse } from '../lib/api'
import { formatDate, toFa } from '../lib/format'
import { blogMeta, usePageMeta } from '../lib/seo'

export default function Blog() {
  const [params] = useSearchParams()
  const category = params.get('category') ?? ''
  const [data, setData] = useState<ArticleListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const path = useMemo(
    () => `/articles${category ? `?category=${encodeURIComponent(category)}` : ''}`,
    [category],
  )

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    get<ArticleListResponse>(path)
      .then((response) => alive && setData(response))
      .catch((err) => alive && setError(err instanceof Error ? err.message : 'خطا در دریافت مقالات'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [path])

  const items = data?.items ?? []
  const featured = category === '' ? items[0] : undefined
  const rest = featured ? items.slice(1) : items
  const activeLabel = data?.categories.find((item) => item.slug === category)?.label
  // مجموع شمار مقالات مستقل از فیلتر فعلی است تا متن معرفی ثابت بماند.
  const totalArticles = (data?.categories ?? []).reduce((sum, item) => sum + item.count, 0)

  // فقط فهرست کامل بلاگ ایندکس می‌شود؛ فیلتر دسته‌بندی با پارامتر noindex.
  usePageMeta({
    ...blogMeta(),
    title: activeLabel ? `مقالات ${activeLabel} | نودهی` : blogMeta().title,
    path: '/blog',
    robots: category ? 'noindex' : 'index',
  })

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: 'مقالات', to: '/blog' }, ...(activeLabel ? [{ label: activeLabel }] : [])]} />

      <header className="pb-6">
        <h1 className="text-2xl font-extrabold">مقالات و راهنمای خرید</h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-7 text-ink-muted">
          پیش از خرید، تفاوت فناوری‌ها و مشخصات فنی را بشناسید. کارشناسان نودهی در{' '}
          {toFa(totalArticles)} مقاله تخصصی، معیارهای انتخاب هر دسته از لوازم خانگی را بدون بزرگ‌نمایی توضیح
          داده‌اند.
        </p>

        <nav aria-label="دسته‌بندی مقالات" className="mt-5 flex flex-wrap gap-1.5">
          <Link
            to="/blog"
            className={
              category === ''
                ? 'rounded-full border border-primary bg-primary px-3.5 py-1.5 text-xs font-medium text-white'
                : 'rounded-full border border-surface-border bg-white px-3.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-primary'
            }
          >
            همه موضوع‌ها
          </Link>
          {(data?.categories ?? []).map((item) => (
            <Link
              key={item.slug}
              to={`/blog?category=${item.slug}`}
              className={
                category === item.slug
                  ? 'rounded-full border border-primary bg-primary px-3.5 py-1.5 text-xs font-medium text-white'
                  : 'rounded-full border border-surface-border bg-white px-3.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-primary'
              }
            >
              {item.label} ({toFa(item.count)})
            </Link>
          ))}
        </nav>
      </header>

      {loading && <p className="py-10 text-sm text-ink-muted">در حال بارگذاری مقالات…</p>}

      {error && !loading && (
        <div className="rounded-2xl border border-surface-border bg-white p-6 text-sm text-danger">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-surface-border bg-white p-8 text-center">
          <p className="text-sm text-ink-muted">در این موضوع هنوز مقاله‌ای منتشر نشده است.</p>
          <Link to="/blog" className="mt-3 inline-block text-xs font-bold text-primary">
            مشاهده همه مقالات
          </Link>
        </div>
      )}

      {!loading && !error && featured && (
        <article className="mb-8 overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card lg:grid lg:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-primary/[0.08] px-3 py-1 font-medium text-primary">
                {featured.categoryLabel}
              </span>
              <span className="text-ink-subtle">مقاله شاخص</span>
            </div>

            <h2 className="mt-3 text-xl font-extrabold leading-9 sm:text-2xl sm:leading-[1.5]">
              <Link to={`/blog/${featured.slug}`} className="transition-colors hover:text-primary">
                {featured.title}
              </Link>
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink-muted">{featured.excerpt}</p>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-surface-border pt-4 text-xs text-ink-subtle">
              <span className="flex items-center gap-3">
                <span>{formatDate(featured.publishedAt)}</span>
                <span>·</span>
                <span>{toFa(featured.readingMinutes)} دقیقه مطالعه</span>
              </span>
              <Link
                to={`/blog/${featured.slug}`}
                className="rounded-xl bg-primary px-4 py-2 text-[11px] font-bold text-white transition hover:bg-primary-light"
              >
                خواندن مقاله
              </Link>
            </div>
          </div>

          <div className="relative hidden bg-gradient-to-bl from-primary-light via-primary to-primary-dark p-8 lg:block">
            <span className="absolute bottom-8 left-8 text-[11px] text-white/70">
              نوشته {featured.author}
            </span>
            <ul className="flex flex-wrap gap-1.5">
              {featured.keywords.map((keyword) => (
                <li
                  key={keyword}
                  className="rounded-lg border border-white/20 px-2.5 py-1.5 text-[11px] text-white/80"
                >
                  {keyword}
                </li>
              ))}
            </ul>
          </div>
        </article>
      )}

      {!loading && !error && rest.length > 0 && (
        <section className="pb-10" aria-labelledby="all-articles">
          <h2 id="all-articles" className="mb-4 text-lg font-extrabold">
            {featured ? 'همه مقالات' : `مقالات ${activeLabel ?? ''}`}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      )}

      <aside className="mb-10 rounded-2xl border border-surface-border bg-white p-6">
        <h2 className="text-sm font-extrabold">به راهنمای خرید هم سر بزنید</h2>
        <p className="mt-2 text-xs leading-6 text-ink-muted">
          اگر پیش از خرید به جدول تصمیم‌گیری و مقایسه سریع نیاز دارید، صفحه راهنمای خرید لوازم خانگی نقطه شروع
          بهتری است.
        </p>
        <Link
          to="/guides"
          className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-light"
        >
          راهنمای خرید لوازم خانگی
        </Link>
      </aside>
    </div>
  )
}
