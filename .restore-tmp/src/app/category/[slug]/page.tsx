import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ProductGrid } from '@/components/product/product-grid'
import { JsonLd } from '@/components/seo/json-ld'
import { ButtonLink } from '@/components/ui/button'
import { getBrandName, getCategories, getCategory, queryProducts } from '@/lib/server/catalog'
import { breadcrumbSchema, buildMetadata, itemListSchema } from '@/lib/seo'
import { toPersianDigits } from '@/lib/utils/format'

export async function generateStaticParams() {
  const categories = await getCategories()
  return categories.map((category) => ({ slug: category.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await getCategory(params.slug)
  if (!category) {
    return buildMetadata({
      title: 'دسته‌بندی یافت نشد',
      description: 'دسته‌بندی مورد نظر در فروشگاه نودهی وجود ندارد.',
      path: `/category/${params.slug}`,
      noIndex: true,
    })
  }

  const items = await queryProducts({ categories: [category.slug] })

  return buildMetadata({
    title: `خرید ${category.name} | ${toPersianDigits(items.length)} مدل با قیمت روز`,
    description: category.seoIntro,
    path: `/category/${category.slug}`,
    keywords: [category.name, `خرید ${category.name}`, `قیمت ${category.name}`, category.nameEn],
  })
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategory(params.slug)
  if (!category) notFound()

  const items = await queryProducts({ categories: [category.slug] })

  const cheapest = items.reduce<number | null>(
    (min, product) => (min === null || product.price < min ? product.price : min),
    null,
  )

  const brandSlugs = [...new Set(items.map((product) => product.brand))]
  const categories = await getCategories()
  const otherCategories = categories.filter((item) => item.slug !== category.slug)

  const breadcrumbItems = [
    { name: 'فروشگاه', path: '/shop' },
    { name: category.name, path: `/category/${category.slug}` },
  ]

  return (
    <>
      <JsonLd
        id={`schema-category-${category.slug}`}
        data={[
          breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems]),
          itemListSchema(items.slice(0, 20), category.name),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="rounded-2xl border border-surface-border bg-white p-6 sm:p-8">
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">خرید {category.name}</h1>
          <p className="mt-2 text-sm text-ink-muted">{category.description}</p>
          {/* متن سئویی دسته — برای موتور جستجو و برای کاربری که راهنمای خرید می‌خواهد */}
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-muted">{category.seoIntro}</p>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-surface-border pt-5 text-[11px]">
            <span className="text-ink-muted">
              {toPersianDigits(items.length)} مدل موجود
            </span>
            {cheapest !== null ? (
              <span className="text-ink-muted">
                شروع قیمت از <span className="font-bold text-ink">{cheapest.toLocaleString('fa-IR')} تومان</span>
              </span>
            ) : null}
            <ButtonLink href={`/shop?category=${category.slug}`} variant="outline" size="sm">
              فیلتر و مرتب‌سازی پیشرفته
            </ButtonLink>
          </div>
        </header>

        {brandSlugs.length > 0 ? (
          <nav
            aria-label="برندهای این دسته"
            className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-surface-border bg-white p-4"
          >
            <span className="text-xs font-bold text-ink-subtle">برندها:</span>
            {brandSlugs.map((slug) => (
              <Link
                key={slug}
                href={`/brand/${slug}`}
                className="rounded-xl border border-surface-border px-3.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-primary"
              >
                {getBrandName(slug)}
              </Link>
            ))}
          </nav>
        ) : null}

        <section className="mt-6 pb-10">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-16 text-center">
              <p className="text-sm font-bold text-ink">در این دسته فعلاً کالایی موجود نیست</p>
              <p className="mt-1.5 text-xs text-ink-muted">
                برای دیدن گزینه‌های مشابه، فهرست کامل فروشگاه را ببینید.
              </p>
              <ButtonLink href="/shop" variant="primary" size="sm" className="mt-4">
                مشاهده همه محصولات
              </ButtonLink>
            </div>
          ) : (
            <ProductGrid products={items} priorityCount={4} />
          )}
        </section>

        {/* لینک‌سازی داخلی بین دسته‌ها: هم برای کاربر و هم برای خزشگر گوگل */}
        <nav aria-label="دسته‌بندی‌های دیگر" className="mb-12 rounded-2xl border border-surface-border bg-white p-5">
          <h2 className="text-sm font-bold text-ink">دسته‌بندی‌های دیگر</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {otherCategories.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/category/${item.slug}`}
                  className="inline-block rounded-xl bg-surface-muted px-3.5 py-2 text-xs text-ink-muted transition-colors hover:bg-primary/[0.08] hover:text-primary"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  )
}
