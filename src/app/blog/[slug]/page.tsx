import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArticleCard } from '@/components/content/article-card'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { ButtonLink } from '@/components/ui/button'
import { articleBySlug, articleCategoryLabels, articles } from '@/lib/data/articles'
import { getCatalog, getCategories } from '@/lib/server/catalog'
import { articleSchema, breadcrumbSchema, buildMetadata } from '@/lib/seo'
import { formatJalaliDate, toPersianDigits } from '@/lib/utils/format'

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = articleBySlug[params.slug]
  if (!article) {
    return buildMetadata({
      title: 'مقاله یافت نشد',
      description: 'این مقاله در سایت نودهی موجود نیست.',
      path: `/blog/${params.slug}`,
      noIndex: true,
    })
  }

  return buildMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/blog/${article.slug}`,
    type: 'article',
    keywords: article.keywords,
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
  })
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = articleBySlug[params.slug]
  if (!article) notFound()

  // دسته‌ها و کالاها از دیتابیس (لینک‌سازی داخلی مقاله به محصولات موجود)
  const [categories, catalog] = await Promise.all([getCategories(), getCatalog()])
  const products = catalog.products

  const related = articles.filter((item) => item.slug !== article.slug).slice(0, 3)
  const breadcrumbItems = [
    { name: 'مقالات', path: '/blog' },
    { name: articleCategoryLabels[article.category], path: `/blog?category=${article.category}` },
    { name: article.title, path: `/blog/${article.slug}` },
  ]

  // محصولات مرتبط با کلمات کلیدی مقاله — لینک‌سازی داخلی هدفمند
  const linkedProducts = products
    .filter((product) =>
      article.keywords.some(
        (keyword) =>
          product.name.includes(keyword.split(' ')[0] ?? '') ||
          product.tags.some((tag) => keyword.includes(tag)),
      ),
    )
    .slice(0, 4)

  return (
    <>
      <JsonLd
        id="schema-article"
        data={[
          articleSchema(article),
          breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems]),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <div className="grid gap-8 pb-10 lg:grid-cols-[1fr_300px]">
          <article className="min-w-0">
            <header className="pb-6">
              <span className="inline-flex rounded-full bg-primary/[0.08] px-3 py-1 text-xs font-medium text-primary">
                {articleCategoryLabels[article.category]}
              </span>
              <h1 className="mt-3 text-xl font-extrabold leading-9 text-ink sm:text-2xl sm:leading-[1.5]">
                {article.title}
              </h1>
              <p className="mt-3 text-sm leading-7 text-ink-muted">{article.excerpt}</p>

              <div className="mt-4 flex flex-wrap items-center gap-4 border-y border-surface-border py-3 text-xs text-ink-subtle">
                <span>نویسنده: {article.author}</span>
                <span>انتشار: {formatJalaliDate(article.publishedAt)}</span>
                <span>آخرین به‌روزرسانی: {formatJalaliDate(article.updatedAt)}</span>
                <span>{toPersianDigits(article.readingMinutes)} دقیقه مطالعه</span>
              </div>
            </header>

            {/* متن مقاله */}
            <div className="flex flex-col gap-5">
              {article.body.map((paragraph, index) => (
                <p key={index} className="text-sm leading-8 text-ink-muted sm:text-[15px] sm:leading-[2.1]">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* محصولات مرتبط */}
            {linkedProducts.length > 0 ? (
              <aside className="mt-8 rounded-2xl border border-surface-border bg-white p-6">
                <h2 className="text-base font-bold text-ink">محصولات مرتبط با این مقاله</h2>
                <p className="mt-2 text-xs leading-6 text-ink-muted">
                  کالاهایی که در این دسته معرفی شده‌اند و در حال حاضر موجود هستند.
                </p>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {linkedProducts.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/product/${product.slug}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink transition-colors hover:bg-primary/[0.06] hover:text-primary"
                      >
                        <span className="line-clamp-1">{product.name}</span>
                        <span className="shrink-0 text-xs text-ink-subtle">مشاهده ←</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}

            {/* مقالات مرتبط */}
            <section className="mt-8" aria-labelledby="related-articles">
              <h2 id="related-articles" className="mb-4 text-base font-bold text-ink">
                مقالات مرتبط
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {related.map((item) => (
                  <ArticleCard key={item.slug} article={item} />
                ))}
              </div>
            </section>
          </article>

          {/* ستون کناری */}
          <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-32">
            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold text-ink">کلمات کلیدی این مقاله</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {article.keywords.map((keyword) => (
                  <li key={keyword}>
                    <Link
                      href={`/shop?q=${encodeURIComponent(keyword)}`}
                      className="inline-block rounded-lg border border-surface-border px-2.5 py-1.5 text-[11px] text-ink-muted transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {keyword}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold text-ink">مشاهده محصولات</h2>
              <ul className="mt-3 flex flex-col gap-2 text-xs">
                {categories.slice(0, 5).map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/shop?category=${category.slug}`}
                      className="text-ink-muted transition-colors hover:text-primary"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <ButtonLink href="/guides" variant="outline" size="sm" className="mt-4 w-full">
                همه راهنماهای خرید
              </ButtonLink>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
