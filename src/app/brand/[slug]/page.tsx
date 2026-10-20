import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ProductGrid } from '@/components/product/product-grid'
import { JsonLd } from '@/components/seo/json-ld'
import { ButtonLink } from '@/components/ui/button'
import { getBrands, getCategories, queryProducts } from '@/lib/server/catalog'
import { breadcrumbSchema, buildMetadata, itemListSchema } from '@/lib/seo'
import { toPersianDigits } from '@/lib/utils/format'

/** همه برندها در زمان build به‌صورت صفحه ثابت ساخته می‌شوند (سرعت و سئو) */
export async function generateStaticParams() {
  const brands = await getBrands()
  return brands.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const brands = await getBrands()
  const item = brands.find((brand) => brand.slug === params.slug)
  if (!item) {
    return buildMetadata({
      title: 'برند یافت نشد',
      description: 'برند مورد نظر در فروشگاه نودهی وجود ندارد.',
      path: `/brand/${params.slug}`,
      noIndex: true,
    })
  }

  const count = (await queryProducts({ brands: [item.slug] })).length

  return buildMetadata({
    title: `لوازم خانگی ${item.name} | ${toPersianDigits(count)} مدل با گارانتی`,
    description: `${item.description} خرید لوازم خانگی ${item.name} (${item.nameEn}) با گارانتی معتبر، ارسال سریع و امکان مقایسه مدل‌ها در فروشگاه نودهی.`,
    path: `/brand/${item.slug}`,
    keywords: [`${item.name}`, `لوازم خانگی ${item.name}`, item.nameEn, `قیمت ${item.name}`],
  })
}

export default async function BrandPage({ params }: { params: { slug: string } }) {
  const brands = await getBrands()
  const brandInfo = brands.find((brand) => brand.slug === params.slug)
  if (!brandInfo) notFound()

  const items = await queryProducts({ brands: [brandInfo.slug] })

  // دسته‌بندی‌هایی که این برند در آن‌ها کالا دارد — برای لینک‌سازی داخلی
  const categories = await getCategories()
  const presentCategories = categories.filter((category) =>
    items.some((product) => product.category === category.slug),
  )

  const breadcrumbItems = [
    { name: 'برندها', path: '/brands' },
    { name: brandInfo.name, path: `/brand/${brandInfo.slug}` },
  ]

  const inStock = items.filter((product) => product.stock > 0).length

  return (
    <>
      <JsonLd
        id={`schema-brand-${brandInfo.slug}`}
        data={[
          breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems]),
          itemListSchema(items.slice(0, 20), `لوازم خانگی ${brandInfo.name}`),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="rounded-2xl border border-surface-border bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/[0.08] px-3.5 py-1.5 text-xs font-medium text-primary">
                برند {brandInfo.origin}
              </span>
              <h1 className="mt-4 text-xl font-extrabold text-ink sm:text-2xl">
                لوازم خانگی {brandInfo.name}
              </h1>
              <p dir="ltr" className="mt-1 text-left text-xs tracking-wide text-ink-subtle">
                {brandInfo.nameEn}
              </p>
              <p className="mt-4 text-sm leading-7 text-ink-muted">{brandInfo.description}</p>
            </div>

            <dl className="flex gap-5 rounded-xl bg-surface-muted p-5 text-center">
              <div>
                <dt className="text-[11px] text-ink-subtle">مدل موجود</dt>
                <dd className="mt-1 text-lg font-extrabold tabular-nums text-ink">
                  {toPersianDigits(items.length)}
                </dd>
              </div>
              <div className="border-r border-surface-border pr-5">
                <dt className="text-[11px] text-ink-subtle">آماده ارسال</dt>
                <dd className="mt-1 text-lg font-extrabold tabular-nums text-secondary-dark">
                  {toPersianDigits(inStock)}
                </dd>
              </div>
            </dl>
          </div>

          {presentCategories.length > 0 ? (
            <nav aria-label="دسته‌بندی‌های این برند" className="mt-6 flex flex-wrap gap-2 border-t border-surface-border pt-5">
              {presentCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="rounded-xl border border-surface-border px-3.5 py-2 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          ) : null}
        </header>

        <section className="mt-6 pb-12">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-16 text-center">
              <p className="text-sm font-bold text-ink">در حال حاضر محصولی از این برند موجود نیست</p>
              <p className="mt-1.5 text-xs leading-6 text-ink-muted">
                موجودی این برند به‌زودی شارژ می‌شود. می‌توانید به فهرست کامل فروشگاه سر بزنید یا برای اطلاع،
                تماس بگیرید.
              </p>
              <ButtonLink href="/shop" variant="primary" size="sm" className="mt-4">
                مشاهده همه محصولات
              </ButtonLink>
            </div>
          ) : (
            <>
              <h2 className="mb-4 text-sm font-bold text-ink">
                {toPersianDigits(items.length)} محصول از {brandInfo.name}
              </h2>
              <ProductGrid products={items} priorityCount={4} />
            </>
          )}
        </section>
      </div>
    </>
  )
}
