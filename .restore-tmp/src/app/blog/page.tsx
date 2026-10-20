import type { Metadata } from 'next'
import Link from 'next/link'
import { ArticleCard } from '@/components/content/article-card'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { articleCategoryLabels, articles } from '@/lib/data/articles'
import { breadcrumbSchema, buildMetadata } from '@/lib/seo'
import { toPersianDigits } from '@/lib/utils/format'
import type { Article } from '@/types'

export const metadata: Metadata = buildMetadata({
  title: 'مقالات و راهنمای خرید لوازم خانگی',
  description:
    'مقالات آموزشی نودهی درباره انتخاب، مقایسه و نگهداری لوازم خانگی؛ از راهنمای خرید یخچال و ماشین لباسشویی تا روش‌های افزایش عمر مفید دستگاه‌ها.',
  path: '/blog',
  keywords: ['راهنمای خرید لوازم خانگی', 'مقایسه لوازم خانگی', 'نگهداری لوازم خانگی', 'مقالات آموزشی'],
})

export default function BlogPage() {
  const featured = articles[0]!
  const rest = articles.slice(1)
  const categories = Object.entries(articleCategoryLabels) as [Article['category'], string][]
  const breadcrumbItems = [{ name: 'مقالات', path: '/blog' }]

  return (
    <>
      <JsonLd
        id="schema-blog"
        data={breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems])}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="pb-6">
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">مقالات و راهنمای خرید</h1>
          <p className="mt-2.5 max-w-3xl text-sm leading-7 text-ink-muted">
            پیش از خرید، تفاوت فناوری‌ها و مشخصات فنی را بشناسید. کارشناسان نودهی در{' '}
            {toPersianDigits(articles.length)} مقاله تخصصی، معیارهای انتخاب هر دسته از لوازم خانگی را بدون
            بزرگ‌نمایی توضیح داده‌اند.
          </p>

          <nav aria-label="دسته‌بندی مقالات" className="mt-5 flex flex-wrap gap-1.5">
            {categories.map(([slug, label]) => (
              <Link
                key={slug}
                href={`/blog?category=${slug}`}
                className="rounded-full border border-surface-border bg-white px-3.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-primary"
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>

        {/* مقاله شاخص */}
        <div className="grid gap-4 pb-6 lg:grid-cols-2">
          <ArticleCard article={featured} featured />
          <div className="flex flex-col gap-3">
            {rest.slice(0, 3).map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </div>

        {/* بقیه مقالات */}
        <section className="pb-10" aria-labelledby="all-articles">
          <h2 id="all-articles" className="mb-5 text-lg font-extrabold text-ink">
            همه مقالات
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.slice(3).map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
