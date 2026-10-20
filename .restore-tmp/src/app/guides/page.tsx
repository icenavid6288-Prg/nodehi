import type { Metadata } from 'next'
import Link from 'next/link'
import { ArticleCard } from '@/components/content/article-card'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ApplianceIcon } from '@/components/ui/appliance-icon'
import { JsonLd } from '@/components/seo/json-ld'
import { articles } from '@/lib/data/articles'
import { categoryCounts, getCategories } from '@/lib/server/catalog'
import { breadcrumbSchema, buildMetadata } from '@/lib/seo'
import { toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'راهنمای خرید لوازم خانگی | انتخاب درست پیش از خرید',
  description:
    'راهنمای تخصصی انتخاب یخچال، ماشین لباسشویی، ظرفشویی، تلویزیون و کولر گازی؛ معیارهای ظرفیت، مصرف انرژی، ابعاد و خدمات پس از فروش به زبان ساده.',
  path: '/guides',
  keywords: ['راهنمای خرید', 'معیارهای خرید لوازم خانگی', 'انتخاب ظرفیت', 'مصرف انرژی'],
})

export default async function GuidesPage() {
  const guides = articles.filter((article) => article.category === 'buying-guide' || article.category === 'comparison')
  const [categories, counts] = await Promise.all([getCategories(), categoryCounts()])
  const breadcrumbItems = [{ name: 'راهنمای خرید', path: '/guides' }]

  return (
    <>
      <JsonLd
        id="schema-guides"
        data={breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems])}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="pb-6">
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">راهنمای خرید لوازم خانگی</h1>
          <p className="mt-2.5 max-w-3xl text-sm leading-7 text-ink-muted">
            خرید لوازم خانگی یک تصمیم چندساله است. در این راهنماها معیارهای واقعی انتخاب را بررسی می‌کنیم: ابعاد فضای
            نصب، ظرفیت مناسب تعداد اعضای خانواده، رده مصرف انرژی، هزینه نگهداری و گستردگی خدمات پس از فروش برند.
          </p>
        </header>

        {/* راهنما به تفکیک دسته */}
        <section className="pb-8" aria-labelledby="by-category">
          <h2 id="by-category" className="mb-4 text-base font-bold text-ink">
            راهنمای خرید به تفکیک دسته‌بندی
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/shop?category=${category.slug}`}
                className="group flex items-start gap-3 rounded-2xl border border-surface-border bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-float"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <ApplianceIcon category={category.slug} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">{category.name}</span>
                  <span className="mt-1 block text-[11px] leading-5 text-ink-subtle">
                    {toPersianDigits(counts[category.slug])} کالا · {category.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* مقالات راهنما */}
        <section className="pb-10" aria-labelledby="guide-articles">
          <h2 id="guide-articles" className="mb-5 text-lg font-extrabold text-ink">
            مقالات راهنمای خرید و مقایسه
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((article, index) => (
              <ArticleCard key={article.slug} article={article} featured={index === 0} />
            ))}
          </div>
        </section>

        {/* جدول تصمیم‌گیری سریع */}
        <section className="pb-10" aria-labelledby="quick-decide">
          <h2 id="quick-decide" className="mb-4 text-lg font-extrabold text-ink">
            جدول تصمیم‌گیری سریع
          </h2>
          <div className="overflow-x-auto thin-scrollbar rounded-2xl border border-surface-border bg-white">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">جدول تصمیم‌گیری سریع برای انتخاب ظرفیت لوازم خانگی</caption>
              <thead className="bg-surface-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-ink">
                    دسته‌بندی
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-ink">
                    خانواده ۱ تا ۲ نفره
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-ink">
                    خانواده ۳ تا ۴ نفره
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-ink">
                    خانواده ۵ نفر و بیشتر
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'یخچال فریزر', a: '۳۰۰ تا ۴۵۰ لیتر', b: '۴۵۰ تا ۶۰۰ لیتر', c: 'بالای ۶۰۰ لیتر' },
                  { name: 'ماشین لباسشویی', a: '۶ تا ۷ کیلوگرم', b: '۸ تا ۹ کیلوگرم', c: 'بالای ۹ کیلوگرم' },
                  { name: 'ماشین ظرفشویی', a: '۸ تا ۱۰ نفره', b: '۱۲ تا ۱۳ نفره', c: '۱۴ نفره و بالاتر' },
                  { name: 'کولر گازی', a: '۹۰۰۰ تا ۱۲۰۰۰ BTU', b: '۱۲۰۰۰ تا ۱۸۰۰۰ BTU', c: '۲۴۰۰۰ BTU و بالاتر' },
                  { name: 'تلویزیون', a: '۴۳ تا ۵۰ اینچ', b: '۵۵ اینچ', c: '۶۵ اینچ و بالاتر' },
                ].map((row, index) => (
                  <tr key={row.name} className={index % 2 === 0 ? 'bg-white' : 'bg-surface-muted'}>
                    <th scope="row" className="px-4 py-3 text-right text-xs font-bold text-ink">
                      {row.name}
                    </th>
                    <td className="px-4 py-3 text-xs text-ink-muted">{row.a}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{row.b}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{row.c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-6 text-ink-subtle">
            این اعداد نقطه شروع انتخاب هستند. عادت شست‌وشو، متراژ فضا و شرایط اقلیمی می‌تواند انتخاب نهایی را یک
            پله جابه‌جا کند.
          </p>
        </section>
      </div>
    </>
  )
}
