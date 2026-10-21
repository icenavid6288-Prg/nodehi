import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ArticleCard from '../components/ArticleCard'
import Breadcrumbs from '../components/Breadcrumbs'
import { ApiError, get, type ArticleResponse, type ArticleSummary } from '../lib/api'
import { useCatalog } from '../context/CatalogContext'
import { formatDate, price, toFa } from '../lib/format'
import { articleMeta, usePageMeta } from '../lib/seo'

type RelatedProduct = { slug: string; name: string; price: number; image: string | null }

export default function BlogPost() {
  const { slug = '' } = useParams()
  const { categories } = useCatalog()
  const [data, setData] = useState<ArticleResponse | null>(null)
  const [products, setProducts] = useState<RelatedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const seoArticle = data?.article
  // متادیتای کامل (Article + Breadcrumb + WebPage در JSON-LD) از هستهٔ مشترک
  // سئو می‌آید تا نسخهٔ ایستای همین مقاله عنوان و دادهٔ یکسانی داشته باشد.
  usePageMeta(
    seoArticle
      ? articleMeta({
          slug: seoArticle.slug,
          title: seoArticle.title,
          excerpt: seoArticle.excerpt,
          category: seoArticle.category,
          categoryLabel: seoArticle.categoryLabel,
          author: seoArticle.author,
          publishedAt: seoArticle.publishedAt,
          updatedAt: seoArticle.updatedAt,
          readingMinutes: seoArticle.readingMinutes,
          keywords: seoArticle.keywords,
        })
      : {
          title: error ? 'مقاله یافت نشد | نودهی' : 'مقالات نودهی',
          description: 'راهنمای خرید و مقایسهٔ لوازم خانگی از کارشناسان نودهی.',
          path: `/blog/${slug}`,
          robots: error ? 'noindex' : 'index',
        },
  )

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    setData(null)
    setProducts([])

    get<ArticleResponse & { relatedProducts: RelatedProduct[] }>(`/articles/${encodeURIComponent(slug)}`)
      .then((response) => {
        if (!alive) return
        setData(response)
        setProducts(response.relatedProducts ?? [])
      })
      .catch((err) => {
        if (!alive) return
        setError(err instanceof ApiError && err.status === 404 ? 'این مقاله در سایت موجود نیست.' : 'خطا در دریافت مقاله')
      })
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [slug])

  if (loading) {
    return <div className="container-page py-12 text-sm text-ink-muted">در حال بارگذاری مقاله…</div>
  }

  if (error || !data) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-extrabold">مقاله پیدا نشد</h1>
        <p className="mt-2 text-sm text-ink-muted">{error ?? 'این مقاله در سایت موجود نیست.'}</p>
        <Link to="/blog" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
          بازگشت به فهرست مقالات
        </Link>
      </div>
    )
  }

  const article = data.article
  const related: ArticleSummary[] = data.related

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { label: 'مقالات', to: '/blog' },
          { label: article.categoryLabel, to: `/blog?category=${article.category}` },
          { label: article.title },
        ]}
      />

      <div className="grid gap-8 pb-10 lg:grid-cols-[1fr_300px]">
        <article className="min-w-0">
          <header className="pb-6">
            <span className="inline-flex rounded-full bg-primary/[0.08] px-3 py-1 text-xs font-medium text-primary">
              {article.categoryLabel}
            </span>
            <h1 className="mt-3 text-2xl font-extrabold leading-9">{article.title}</h1>
            <p className="mt-3 text-sm leading-7 text-ink-muted">{article.excerpt}</p>

            <div className="mt-4 flex flex-wrap items-center gap-4 border-y border-surface-border py-3 text-xs text-ink-subtle">
              <span>نویسنده: {article.author}</span>
              <span>انتشار: {formatDate(article.publishedAt)}</span>
              <span>آخرین به‌روزرسانی: {formatDate(article.updatedAt)}</span>
              <span>{toFa(article.readingMinutes)} دقیقه مطالعه</span>
            </div>
          </header>

          <div className="flex flex-col gap-5">
            {article.body.map((paragraph, index) => (
              <p key={index} className="text-sm leading-8 text-ink-muted sm:text-[15px] sm:leading-[2.1]">
                {paragraph}
              </p>
            ))}
          </div>

          {products.length > 0 && (
            <aside className="mt-8 rounded-2xl border border-surface-border bg-white p-6">
              <h2 className="text-base font-bold">محصولات مرتبط با این مقاله</h2>
              <p className="mt-2 text-xs leading-6 text-ink-muted">
                کالاهای معرفی‌شده در این دسته که در حال حاضر موجود هستند.
              </p>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {products.map((product) => (
                  <li key={product.slug}>
                    <Link
                      to={`/product/${product.slug}`}
                      className="flex flex-col gap-1 rounded-xl bg-surface-muted px-4 py-3 text-sm transition-colors hover:bg-primary/[0.06]"
                    >
                      <span className="line-clamp-2 font-medium">{product.name}</span>
                      <span className="text-xs text-ink-subtle">
                        {product.price > 0 ? `${price(product.price)} تومان` : 'تماس بگیرید'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          {related.length > 0 && (
            <section className="mt-8" aria-labelledby="related-articles">
              <h2 id="related-articles" className="mb-4 text-base font-bold">
                مقالات مرتبط
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {related.map((item) => (
                  <ArticleCard key={item.slug} article={item} />
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-28">
          <div className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="text-sm font-bold">کلمات کلیدی این مقاله</h2>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {article.keywords.map((keyword) => (
                <li key={keyword}>
                  <Link
                    to={`/shop?q=${encodeURIComponent(keyword)}`}
                    className="inline-block rounded-lg border border-surface-border px-2.5 py-1.5 text-[11px] text-ink-muted transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {keyword}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="text-sm font-bold">مشاهده محصولات</h2>
            <ul className="mt-3 flex flex-col gap-2 text-xs">
              {categories.slice(0, 5).map((category) => (
                <li key={category.slug}>
                  <Link to={`/category/${category.slug}`} className="text-ink-muted transition-colors hover:text-primary">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/guides"
              className="mt-4 block rounded-xl border border-surface-border px-4 py-2 text-center text-xs font-bold text-primary transition-colors hover:border-primary/40"
            >
              همه راهنماهای خرید
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
