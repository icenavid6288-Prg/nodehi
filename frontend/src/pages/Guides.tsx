import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ArticleCard from '../components/ArticleCard'
import Breadcrumbs from '../components/Breadcrumbs'
import { useCatalog } from '../context/CatalogContext'
import { get, type ArticleListResponse } from '../lib/api'
import { toFa } from '../lib/format'
import { guidesMeta, usePageMeta } from '../lib/seo'

const decisionRows = [
  { name: 'یخچال فریزر', small: '۳۰۰ تا ۴۵۰ لیتر', medium: '۴۵۰ تا ۶۰۰ لیتر', large: 'بالای ۶۰۰ لیتر' },
  { name: 'ماشین لباسشویی', small: '۶ تا ۷ کیلوگرم', medium: '۸ تا ۹ کیلوگرم', large: 'بالای ۹ کیلوگرم' },
  { name: 'ماشین ظرفشویی', small: '۸ تا ۱۰ نفره', medium: '۱۲ تا ۱۳ نفره', large: '۱۴ نفره و بالاتر' },
  { name: 'کولر گازی', small: '۹۰۰۰ تا ۱۲۰۰۰ BTU', medium: '۱۲۰۰۰ تا ۱۸۰۰۰ BTU', large: '۲۴۰۰۰ BTU و بالاتر' },
  { name: 'تلویزیون', small: '۴۳ تا ۵۰ اینچ', medium: '۵۵ اینچ', large: '۶۵ اینچ و بالاتر' },
]

const guideCategories = ['buying-guide', 'comparison']

export default function Guides() {
  const { categories } = useCatalog()
  const [articles, setArticles] = useState<ArticleListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  usePageMeta(guidesMeta())

  useEffect(() => {
    let alive = true
    get<ArticleListResponse>('/articles')
      .then((response) => alive && setArticles(response))
      .catch(() => alive && setError('دریافت مقالات راهنما ناموفق بود.'))
    return () => {
      alive = false
    }
  }, [])

  const guides = (articles?.items ?? []).filter((article) => guideCategories.includes(article.category))

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: 'راهنمای خرید' }]} />

      <header className="pb-6">
        <h1 className="text-2xl font-extrabold">راهنمای خرید لوازم خانگی</h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-7 text-ink-muted">
          خرید لوازم خانگی یک تصمیم چندساله است. در این راهنماها معیارهای واقعی انتخاب را بررسی می‌کنیم: ابعاد فضای
          نصب، ظرفیت مناسب تعداد اعضای خانواده، رده مصرف انرژی، هزینه نگهداری و گستردگی خدمات پس از فروش برند.
        </p>
      </header>

      <section className="pb-8" aria-labelledby="by-category">
        <h2 id="by-category" className="mb-4 text-base font-bold">
          راهنمای خرید به تفکیک دسته‌بندی
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className="group rounded-2xl border border-surface-border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-float"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{category.name}</span>
                <span className="text-[11px] text-ink-subtle">{toFa(category.count)} کالا</span>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-ink-subtle">{category.description}</p>
              <span className="mt-3 block text-[11px] font-bold text-primary opacity-0 transition group-hover:opacity-100">
                مشاهده کالاها ←
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="pb-10" aria-labelledby="guide-articles">
        <h2 id="guide-articles" className="mb-4 text-lg font-extrabold">
          مقالات راهنمای خرید و مقایسه
        </h2>

        {error && <div className="rounded-2xl border border-surface-border bg-white p-6 text-sm text-danger">{error}</div>}

        {!error && guides.length === 0 && (
          <p className="text-sm text-ink-muted">در حال بارگذاری راهنماها…</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>

      <section className="pb-10" aria-labelledby="quick-decide">
        <h2 id="quick-decide" className="mb-4 text-lg font-extrabold">
          جدول تصمیم‌گیری سریع
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-surface-border bg-white">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <caption className="sr-only">جدول تصمیم‌گیری سریع برای انتخاب ظرفیت لوازم خانگی</caption>
            <thead className="bg-surface-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-right text-xs font-bold">
                  دسته‌بندی
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-bold">
                  خانواده ۱ تا ۲ نفره
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-bold">
                  خانواده ۳ تا ۴ نفره
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-bold">
                  خانواده ۵ نفر و بیشتر
                </th>
              </tr>
            </thead>
            <tbody>
              {decisionRows.map((row) => (
                <tr key={row.name} className="border-t border-surface-border">
                  <th scope="row" className="px-4 py-3 text-right text-xs font-bold">
                    {row.name}
                  </th>
                  <td className="px-4 py-3 text-xs text-ink-muted">{row.small}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{row.medium}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{row.large}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-6 text-ink-subtle">
          این اعداد نقطه شروع انتخاب هستند. عادت شست‌وشو، متراژ فضا و شرایط اقلیمی می‌تواند انتخاب نهایی را یک پله
          جابه‌جا کند.
        </p>
      </section>
    </div>
  )
}
