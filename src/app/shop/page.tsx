import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ProductGrid } from '@/components/product/product-grid'
import { FilterPanel, MobileFilterDrawer } from '@/components/shop/filter-panel'
import { ActiveFilterChips, Pagination, SortSelect } from '@/components/shop/toolbar'
import { JsonLd } from '@/components/seo/json-ld'
import { ButtonLink } from '@/components/ui/button'
import { brand } from '@/config/brand'
import { buildFacets, type ProductFacets } from '@/lib/data/queries'
import {
  categoryCounts,
  getBrandName,
  getCategories,
  getCategory,
  queryProducts,
} from '@/lib/server/catalog'
import { countActiveFilters, parseShopSearchParams, type RawSearchParams } from '@/lib/filters'
import { breadcrumbSchema, buildMetadata, itemListSchema } from '@/lib/seo'
import { toPersianDigits } from '@/lib/utils/format'
import type { Product } from '@/types'

/**
 * تولید متادیتای پویا بر اساس فیلتر فعال.
 * این کار از محتوای تکراری (duplicate content) جلوگیری می‌کند و برای هر
 * ترکیب دسته و برند، عنوان و توضیح اختصاصی می‌سازد.
 */
export async function generateMetadata({ searchParams }: { searchParams: RawSearchParams }): Promise<Metadata> {
  const { filters, discountedOnly } = parseShopSearchParams(searchParams)

  const parts: string[] = []
  if (filters.categories.length === 1) {
    const category = await getCategory(filters.categories[0]!)
    if (category) parts.push(category.name)
  }
  if (filters.brands.length === 1) parts.push(await getBrandName(filters.brands[0]!))
  if (discountedOnly) parts.push('کالاهای تخفیف‌دار')
  if (filters.readyToShipOnly) parts.push('آماده ارسال')
  if (filters.q) parts.push(`جستجوی «${filters.q}»`)

  const qualifier = parts.length ? parts.join(' ') : 'لوازم خانگی'
  const title = `خرید ${qualifier} با قیمت روز و گارانتی`
  const description = `مشاهده و خرید ${
    parts.length ? qualifier : 'انواع لوازم خانگی'
  } در فروشگاه ${brand.name}؛ مقایسه مشخصات فنی، قیمت به‌روز، گارانتی رسمی، ارسال سریع و امکان خرید اقساطی و پرداخت درب منزل.`

  return buildMetadata({
    title,
    description,
    path: '/shop',
    keywords: ['خرید لوازم خانگی', 'قیمت لوازم خانگی', ...parts],
    // صفحات فیلترشده ترکیبی نباید ایندکس شوند تا محتوای تکراری ایجاد نشود
    noIndex: countActiveFilters(filters, discountedOnly) > 2,
  })
}

export default async function ShopPage({ searchParams }: { searchParams: RawSearchParams }) {
  const state = parseShopSearchParams(searchParams)
  const { filters, perPage, page } = state

  // اعمال فیلتر اصلی — کاتالوگ از دیتابیس خوانده می‌شود
  let results: Product[] = await queryProducts(filters)

  if (state.discountedOnly) {
    results = results.filter((product) => product.compareAtPrice && product.compareAtPrice > product.price)
  }

  const totalCount = results.length
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
  const safePage = Math.min(page, totalPages)
  const pageItems = results.slice((safePage - 1) * perPage, safePage * perPage)

  /**
   * فیلتر تخفیف‌دار به‌صورت جداگانه اعمال می‌شود چون بخشی از ProductFilters نیست.
   */
  const withDiscount = (list: Product[]): Product[] =>
    state.discountedOnly
      ? list.filter((product) => product.compareAtPrice && product.compareAtPrice > product.price)
      : list

  /**
   * شمارش گزینه‌های هر گروه فیلتر.
   * هر گروه با نادیده گرفتن فیلتر خودش محاسبه می‌شود (رفتار استاندارد فیلتر
   * چندوجهی). نتیجه این‌که وقتی «یخچال» انتخاب شده، سایر دسته‌بندی‌ها هم
   * تعداد واقعی خود را نشان می‌دهند نه صفر؛ در نتیجه کاربر تشویق به بررسی
   * سایر دسته‌ها می‌شود.
   */
  const brandFacets = buildFacets(withDiscount(await queryProducts({ ...filters, brands: [] })))
  const colorFacets = buildFacets(withDiscount(await queryProducts({ ...filters, colors: [] })))
  const energyFacets = buildFacets(withDiscount(await queryProducts({ ...filters, energyRatings: [] })))
  const categoryFacetList = withDiscount(await queryProducts({ ...filters, categories: [] }))

  const facets: ProductFacets = {
    brands: brandFacets.brands,
    colors: colorFacets.colors,
    energyRatings: energyFacets.energyRatings,
    capacities: buildFacets(results).capacities,
    priceRange: buildFacets(results).priceRange,
  }

  const [counts, categories] = await Promise.all([categoryCounts(), getCategories()])

  // شمارش دسته‌ها با نادیده گرفتن فیلتر دسته‌بندی
  const categoryCountsInResult: Record<string, number> = {}
  for (const product of categoryFacetList) {
    categoryCountsInResult[product.category] = (categoryCountsInResult[product.category] ?? 0) + 1
  }

  const activeCategories = (
    await Promise.all(filters.categories.map((slug) => getCategory(slug)))
  ).filter((category): category is NonNullable<typeof category> => Boolean(category))

  const breadcrumbItems = [
    { name: 'فروشگاه', path: '/shop' },
    ...activeCategories.map((category) => ({
      name: category.name,
      path: `/shop?category=${category.slug}`,
    })),
  ]

  const heading = activeCategories.length
    ? `خرید ${activeCategories.map((category) => category.name).join(' و ')}`
    : filters.brands.length
      ? `محصولات ${(await Promise.all(filters.brands.map((slug) => getBrandName(slug)))).join(' و ')}`
      : 'فروشگاه لوازم خانگی نودهی'

  return (
    <>
      <JsonLd
        id="schema-shop"
        data={[breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems]), itemListSchema(pageItems, heading)]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="pb-5">
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">{heading}</h1>

          {activeCategories.length === 1 ? (
            <p className="mt-2.5 max-w-4xl text-sm leading-7 text-ink-muted">
              {activeCategories[0]!.seoIntro}
            </p>
          ) : (
            <p className="mt-2.5 max-w-4xl text-sm leading-7 text-ink-muted">
              بیش از {toPersianDigits(counts.refrigerator + counts.washer + counts.dishwasher + counts.tv)} کالای
              اصل با گارانتی رسمی، قیمت به‌روز و امکان مقایسه دقیق مشخصات فنی. ارسال سریع به سراسر ایران و امکان
              پرداخت درب منزل.
            </p>
          )}

          {/* لینک‌سازی داخلی هوشمند به دسته‌های مرتبط */}
          <nav aria-label="دسته‌بندی‌های مرتبط" className="mt-4 flex flex-wrap gap-1.5">
            {categories.map((category) => {
              const active = filters.categories.includes(category.slug)
              return (
                <Link
                  key={category.slug}
                  href={active ? '/shop' : `/shop?category=${category.slug}`}
                  className={
                    active
                      ? 'rounded-full border border-primary bg-primary/[0.08] px-3.5 py-1.5 text-xs font-medium text-primary'
                      : 'rounded-full border border-surface-border bg-white px-3.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-primary'
                  }
                >
                  {category.name}
                  <span className="mr-1 text-[10px] text-ink-subtle">({toPersianDigits(counts[category.slug])})</span>
                </Link>
              )
            })}
          </nav>
        </header>

        <div className="grid gap-6 lg:grid-cols-[264px_1fr]">
          <FilterPanel facets={facets} categoryCounts={categoryCountsInResult} totalCount={totalCount} className="hidden lg:flex" />

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-border bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <MobileFilterDrawer
                  facets={facets}
                  categoryCounts={categoryCountsInResult}
                  totalCount={totalCount}
                  triggerLabel={`فیلترها${countActiveFilters(filters, state.discountedOnly) > 0 ? ` (${toPersianDigits(countActiveFilters(filters, state.discountedOnly))})` : ''}`}
                />
                <p className="text-xs text-ink-muted">
                  {toPersianDigits(totalCount)} کالا
                  {totalPages > 1 ? ` · صفحه ${toPersianDigits(safePage)} از ${toPersianDigits(totalPages)}` : ''}
                </p>
              </div>
              <SortSelect />
            </div>

            <div className="mb-4">
              <ActiveFilterChips />
            </div>

            <ProductGrid products={pageItems} priorityCount={4} />

            <Pagination page={safePage} totalPages={totalPages} />

            {/* متن سئو انتهای صفحه */}
            <section className="mt-10 rounded-2xl border border-surface-border bg-white p-6">
              <h2 className="text-base font-bold text-ink">راهنمای خرید از فروشگاه {brand.name}</h2>
              <p className="mt-3 text-sm leading-7 text-ink-muted">
                خرید لوازم خانگی فقط به قیمت محدود نمی‌شود؛ ظرفیت مناسب، رده مصرف انرژی، ابعاد فضای نصب و گستردگی
                خدمات پس از فروش برند، چهار عاملی هستند که هزینه واقعی خرید را در پنج سال آینده تعیین می‌کنند. در
                نودهی مشخصات فنی هر کالا را کامل و بدون بزرگ‌نمایی منتشر می‌کنیم تا بتوانید مدل‌ها را کنار هم
                مقایسه کنید.
              </p>
              <p className="mt-3 text-sm leading-7 text-ink-muted">
                اگر در انتخاب تردید دارید، از ابزار{' '}
                <Link href="/compare" className="font-medium text-primary hover:text-accent">
                  مقایسه محصولات
                </Link>{' '}
                استفاده کنید یا{' '}
                <Link href="/guides" className="font-medium text-primary hover:text-accent">
                  راهنمای خرید
                </Link>{' '}
                مربوط به هر دسته را مطالعه کنید. مشاوران ما نیز هر روز از ۹ صبح تا ۹ شب آماده پاسخگویی هستند.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href="/ready-to-ship" variant="outline" size="sm">
                  کالاهای آماده ارسال
                </ButtonLink>
                <ButtonLink href="/loyalty" variant="outline" size="sm">
                  خرید اقساطی و باشگاه مشتریان
                </ButtonLink>
                <ButtonLink href="/faq" variant="outline" size="sm">
                  سوالات متداول
                </ButtonLink>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
