import Link from 'next/link'
import type { Metadata } from 'next'
import { articles, articleCategoryLabels } from '@/lib/data/articles'
import { categoryCounts, getAdminCatalog } from '@/lib/server/catalog'
import { buildMetadata } from '@/lib/seo'
import { cn } from '@/lib/utils/cn'
import { discountPercent, formatJalaliDate, formatPrice, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'محتوای سایت',
  description: 'نمای کلی همه داده‌های صفحات فروشگاه: دسته‌بندی‌ها، برندها، کالاها، مقالات و صفحات ثابت.',
  path: '/admin/content',
  noIndex: true,
})

/** صفحات ثابت فروشگاه — همان فهرستی که در نقشه سایت هم می‌آید */
const STATIC_PAGES = [
  { path: '/', label: 'صفحه اصلی' },
  { path: '/shop', label: 'فروشگاه (همه کالاها)' },
  { path: '/brands', label: 'فهرست برندها' },
  { path: '/ready-to-ship', label: 'آماده ارسال' },
  { path: '/compare', label: 'مقایسه کالاها' },
  { path: '/blog', label: 'مجله نودهی' },
  { path: '/guides', label: 'راهنمای خرید' },
  { path: '/loyalty', label: 'باشگاه مشتریان' },
  { path: '/track', label: 'پیگیری سفارش' },
  { path: '/faq', label: 'پرسش‌های متداول' },
  { path: '/about', label: 'درباره ما' },
  { path: '/contact', label: 'تماس با ما' },
  { path: '/terms', label: 'شرایط و قوانین' },
  { path: '/privacy', label: 'حریم خصوصی' },
]

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const search = (searchParams.q ?? '').trim().toLowerCase()
  // نمای محتوا کاتالوگ کامل را می‌بیند (شامل کالاهای نرم‌حذف‌شده) تا مدیر
  // بتواند وضعیت همه را بررسی کند
  const [catalog, counts] = await Promise.all([getAdminCatalog(), categoryCounts()])
  const { products, categories, brands } = catalog

  const visibleProducts = search
    ? products.filter((product) =>
        [product.name, product.slug, product.brand, product.category]
          .join(' ')
          .toLowerCase()
          .includes(search),
      )
    : products

  const outOfStock = products.filter((product) => product.stock <= 0)
  const discounted = products.filter((product) => discountPercent(product.price, product.compareAtPrice))
  const readyToShip = products.filter((product) => product.attributes.readyToShip)
  const brandCount = (slug: string) => products.filter((product) => product.brand === slug).length

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold text-ink">محتوای سایت</h1>
          <p className="mt-2 text-sm leading-7 text-ink-muted">
            کالاها، دسته‌بندی‌ها و برندها از دیتابیس خوانده می‌شوند. این صفحه یک نمای کلی است؛ برای افزودن،
            ویرایش یا حذف کالا از صفحهٔ «مدیریت کالاها» استفاده کنید. مقالات و صفحات ثابت همچنان در مخزن
            نگه‌داری می‌شوند و با انتشار دوباره به‌روز می‌شوند.
          </p>
        </div>
        <Link
          href="/admin/products"
          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-dark"
        >
          مدیریت کالاها
        </Link>
      </header>

      {/* شمارش کلی */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="کالا" value={toPersianDigits(products.length)} hint={`${toPersianDigits(categories.length)} دسته‌بندی`} />
        <Stat label="برند" value={toPersianDigits(brands.length)} hint={`${toPersianDigits(articles.length)} مقاله`} />
        <Stat
          label="ناموجود"
          value={toPersianDigits(outOfStock.length)}
          hint={toPersianDigits(readyToShip.length) + ' کالا آماده ارسال'}
          tone={outOfStock.length > 0 ? 'danger' : 'default'}
        />
        <Stat label="دارای تخفیف" value={toPersianDigits(discounted.length)} hint="کالاهای با قیمت پیش از تخفیف" />
      </div>

      {/* دسته‌بندی‌ها */}
      <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
        <h2 className="border-b border-surface-border px-5 py-3.5 text-sm font-bold text-ink">
          دسته‌بندی‌ها
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-right text-xs">
            <thead>
              <tr className="bg-surface-muted text-ink-muted">
                <th className="px-5 py-3 font-medium">دسته</th>
                <th className="px-5 py-3 font-medium">نامک (URL)</th>
                <th className="px-5 py-3 font-medium">تعداد کالا</th>
                <th className="px-5 py-3 font-medium">ویژه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {categories.map((category) => (
                <tr key={category.slug}>
                  <td className="px-5 py-3">
                    <Link href={`/category/${category.slug}`} className="font-medium text-ink hover:text-primary">
                      {category.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-subtle ltr-inline">{category.slug}</td>
                  <td className="px-5 py-3 tabular-nums text-ink-muted">
                    {toPersianDigits(counts[category.slug] ?? 0)}
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{category.featured ? 'بله' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* برندها */}
      <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
        <h2 className="border-b border-surface-border px-5 py-3.5 text-sm font-bold text-ink">برندها</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-right text-xs">
            <thead>
              <tr className="bg-surface-muted text-ink-muted">
                <th className="px-5 py-3 font-medium">برند</th>
                <th className="px-5 py-3 font-medium">کشور مبدأ</th>
                <th className="px-5 py-3 font-medium">تعداد کالا</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {brands.map((brand) => (
                <tr key={brand.slug}>
                  <td className="px-5 py-3">
                    <Link href={`/brand/${brand.slug}`} className="font-medium text-ink hover:text-primary">
                      {brand.name}
                    </Link>
                    <span className="mt-0.5 block text-[10px] text-ink-subtle ltr-inline">{brand.slug}</span>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{brand.origin}</td>
                  <td className="px-5 py-3 tabular-nums text-ink-muted">
                    {toPersianDigits(brandCount(brand.slug))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* کالاها */}
      <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
          <h2 className="text-sm font-bold text-ink">کالاها</h2>
          <form method="get" className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={searchParams.q ?? ''}
              placeholder="نام، نامک یا برند"
              className="h-9 w-52 rounded-lg border border-surface-border bg-white px-3 text-xs outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary-dark"
            >
              جست‌وجو
            </button>
            {search ? (
              <Link
                href="/admin/content"
                className="flex h-9 items-center rounded-lg border border-surface-border px-3 text-xs text-ink-muted hover:bg-surface-muted"
              >
                پاک کردن
              </Link>
            ) : null}
          </form>
        </div>

        {visibleProducts.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-ink-muted">کالایی با این جست‌وجو پیدا نشد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-xs">
              <thead>
                <tr className="bg-surface-muted text-ink-muted">
                  <th className="px-5 py-3 font-medium">کالا</th>
                  <th className="px-5 py-3 font-medium">دسته</th>
                  <th className="px-5 py-3 font-medium">قیمت</th>
                  <th className="px-5 py-3 font-medium">موجودی</th>
                  <th className="px-5 py-3 font-medium">امتیاز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {visibleProducts.slice(0, 80).map((product) => {
                  const percent = discountPercent(product.price, product.compareAtPrice)
                  return (
                    <tr key={product.slug}>
                      <td className="px-5 py-3">
                        <Link href={`/product/${product.slug}`} className="font-medium text-ink hover:text-primary">
                          {product.name}
                        </Link>
                        <span className="mt-0.5 block text-[10px] text-ink-subtle ltr-inline">
                          {product.slug}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">
                        {categories.find((category) => category.slug === product.category)?.name ?? product.category}
                      </td>
                      <td className="px-5 py-3">
                        <span className="tabular-nums text-ink">{formatPrice(product.price)}</span>
                        {percent ? (
                          <span className="mt-0.5 block text-[10px] text-success">
                            {toPersianDigits(percent)}٪ تخفیف
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                            product.stock <= 0
                              ? 'bg-danger/[0.08] text-danger'
                              : product.stock <= 3
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-success/[0.12] text-success',
                          )}
                        >
                          {product.stock <= 0 ? 'ناموجود' : `${toPersianDigits(product.stock)} عدد`}
                        </span>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-ink-muted">
                        {toPersianDigits(product.rating)} ({toPersianDigits(product.reviewCount)})
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {visibleProducts.length > 80 ? (
          <p className="border-t border-surface-border px-5 py-3 text-[11px] text-ink-subtle">
            {toPersianDigits(80)} کالای اول نمایش داده شد. برای دیدن بقیه، جست‌وجو را دقیق‌تر کنید.
          </p>
        ) : null}
      </section>

      {/* مقالات */}
      <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
        <h2 className="border-b border-surface-border px-5 py-3.5 text-sm font-bold text-ink">
          مقالات مجله و راهنماها
        </h2>
        <ul className="divide-y divide-surface-border">
          {articles.map((article) => (
            <li key={article.slug} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <Link href={`/blog/${article.slug}`} className="text-xs font-bold text-ink hover:text-primary">
                  {article.title}
                </Link>
                <p className="mt-0.5 text-[10px] text-ink-subtle">
                  {articleCategoryLabels[article.category]} — {article.author} —{' '}
                  {formatJalaliDate(article.publishedAt)} — {toPersianDigits(article.readingMinutes)} دقیقه مطالعه
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-ink-subtle ltr-inline">{article.slug}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* صفحات ثابت */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <h2 className="text-sm font-bold text-ink">صفحات ثابت سایت</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {STATIC_PAGES.map((page) => (
            <li key={page.path}>
              <Link
                href={page.path}
                className="flex items-center gap-2 rounded-xl border border-surface-border px-3 py-2 text-[11px] text-ink-muted transition-colors hover:border-primary/30 hover:text-primary"
              >
                {page.label}
                <span className="text-[10px] text-ink-subtle ltr-inline">{page.path}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint: string
  tone?: 'default' | 'danger'
}) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={cn(
          'mt-2 text-lg font-extrabold tabular-nums',
          tone === 'danger' ? 'text-danger' : 'text-ink',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-ink-subtle">{hint}</p>
    </div>
  )
}
