import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { AddToCartButton, CompareButton, WishlistButton } from '@/components/product/actions'
import { Price } from '@/components/product/price'
import { ProductGrid } from '@/components/product/product-grid'
import { ProductGallery } from '@/components/product/product-gallery'
import { ReviewSection } from '@/components/product/review-section'
import { SpecTable } from '@/components/product/spec-table'
import { JsonLd } from '@/components/seo/json-ld'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Rating } from '@/components/ui/rating'
import { brand } from '@/config/brand'
import {
  getBrandName,
  getCatalog,
  getCategory,
  getProduct,
  relatedProducts,
} from '@/lib/server/catalog'
import { breadcrumbSchema, buildMetadata, faqSchema, productSchema } from '@/lib/seo'
import { toPersianDigits } from '@/lib/utils/format'

/** پیش‌تولید همه صفحات محصول در زمان build — بهترین حالت برای سرعت و سئو */
export async function generateStaticParams() {
  const catalog = await getCatalog()
  return catalog.products.map((product) => ({ slug: product.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug)
  if (!product) {
    return buildMetadata({
      title: 'محصول یافت نشد',
      description: 'این محصول در فروشگاه نودهی موجود نیست.',
      path: `/product/${params.slug}`,
      noIndex: true,
    })
  }

  const category = await getCategory(product.category)
  const brandName = await getBrandName(product.brand)
  const path = `/product/${product.slug}`

  return buildMetadata({
    title: `${product.name} | قیمت و خرید`,
    description: `${product.shortDescription} خرید ${product.name} از برند ${brandName}${
      category ? ` در دسته ${category.name}` : ''
    } با گارانتی ${toPersianDigits(product.attributes.warrantyMonths)} ماهه، ${
      product.attributes.readyToShip ? 'ارسال همان‌روز' : 'ارسال سریع'
    } و امکان پرداخت درب منزل.`,
    path,
    type: 'product',
    keywords: [
      product.name,
      `قیمت ${product.name}`,
      `خرید ${product.name}`,
      brandName,
      category?.name ?? 'لوازم خانگی',
      ...product.tags,
    ],
    publishedTime: product.publishedAt,
  })
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug)
  if (!product) notFound()

  const category = await getCategory(product.category)
  const brandName = await getBrandName(product.brand)
  const related = await relatedProducts(product)
  const outOfStock = product.stock <= 0

  const breadcrumbItems = [
    { name: 'فروشگاه', path: '/shop' },
    ...(category ? [{ name: category.name, path: `/shop?category=${category.slug}` }] : []),
    { name: brandName, path: `/shop?brand=${product.attributes.brand}` },
    { name: product.name, path: `/product/${product.slug}` },
  ]

  // پرسش‌های متداول اختصاصی محصول — برای اسکیمای FAQ و غنی‌سازی محتوا
  const productFaqs = [
    {
      question: `گارانتی ${product.name} چند ماه است و شامل چه بخش‌هایی می‌شود؟`,
      answer: `این کالا با گارانتی ${toPersianDigits(
        product.attributes.warrantyMonths,
      )} ماهه شرکت ارائه می‌شود و شامل تمام عیوب فنی و قطعات الکترونیکی است. کمپرسور و موتور در صورت دارا بودن گارانتی بلندمدت، جداگانه مشمول می‌شوند. فاکتور رسمی و کارت گارانتی همراه کالا ارسال می‌گردد.`,
    },
    {
      question: `هزینه و زمان ارسال ${product.name} چقدر است؟`,
      answer: product.attributes.readyToShip
        ? 'این کالا در انبار موجود و آماده ارسال است. سفارش‌های ثبت‌شده تا ساعت ۱۴ در تهران و کرج همان روز ارسال می‌شوند و سایر شهرها بین ۲ تا ۵ روز کاری به دست شما می‌رسد.'
        : 'این کالا پس از ثبت سفارش از انبار تأمین می‌شود. زمان تقریبی آماده‌سازی ۲ تا ۴ روز کاری است و پس از آن با تیپاکس یا باربری به سراسر کشور ارسال می‌گردد.',
    },
    {
      question: `آیا امکان خرید اقساطی وجود دارد؟`,
      answer: product.attributes.installmentAvailable
        ? 'بله. برای این کالا خرید اقساطی فعال است. کافی است در مرحله تسویه حساب گزینه خرید اقساطی را انتخاب کنید؛ بازپرداخت بین ۶ تا ۲۴ ماه و بدون نیاز به ضامن امکان‌پذیر است.'
        : 'برای این کالا در حال حاضر خرید اقساطی فعال نیست. برای اطلاع از زمان فعال شدن آن با پشتیبانی تماس بگیرید.',
    },
    {
      question: `امکان بازگشت کالا وجود دارد؟`,
      answer:
        'از تاریخ تحویل، هفت روز فرصت بازگشت کالای سالم و بدون آسیب با بسته‌بندی اصلی وجود دارد. هزینه بازگشت در صورت وجود عیب یا مغایرت با توضیحات محصول، بر عهده نودهی است.',
    },
  ]

  return (
    <>
      <JsonLd
        id="schema-product"
        data={[
          productSchema(product, { categoryName: category?.name, brandName }),
          breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems]),
          faqSchema(productFaqs),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* گالری */}
          <div className="lg:sticky lg:top-32 lg:h-fit">
            <ProductGallery
              images={product.images}
              name={product.name}
              category={product.category}
              videoUrl={product.videoUrl}
            />
          </div>

          {/* مشخصات و خرید */}
          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="primary">{brandName}</Badge>
                {category ? (
                  <Link
                    href={`/shop?category=${category.slug}`}
                    className="text-xs text-ink-subtle transition-colors hover:text-primary"
                  >
                    {category.name}
                  </Link>
                ) : null}
              </div>

              <h1 className="text-xl font-extrabold leading-9 text-ink sm:text-2xl">{product.name}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                {product.reviewCount > 0 ? (
                  <a href="#reviews" className="transition-opacity hover:opacity-80">
                    <Rating value={product.rating} count={product.reviewCount} />
                  </a>
                ) : null}
                <span className="text-xs text-ink-subtle">
                  کد کالا: <span className="ltr-inline">{product.id}</span>
                </span>
              </div>

              <p className="mt-3.5 text-sm leading-7 text-ink-muted">{product.shortDescription}</p>
            </div>

            {/* کارت خرید */}
            <div className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <Price price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
                <div className="flex items-center gap-1.5">
                  <WishlistButton slug={product.slug} />
                  <CompareButton slug={product.slug} size="icon" withLabel={false} />
                </div>
              </div>

              <ul className="flex flex-col gap-2 border-y border-surface-border py-3.5 text-xs">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-ink-muted">وضعیت موجودی</span>
                  <span className={outOfStock ? 'font-medium text-danger' : 'font-medium text-success'}>
                    {outOfStock
                      ? 'ناموجود در انبار'
                      : product.stock <= 5
                        ? `تنها ${toPersianDigits(product.stock)} عدد`
                        : 'موجود در انبار'}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-ink-muted">ارسال</span>
                  <span className="font-medium text-ink">
                    {product.attributes.readyToShip ? 'آماده ارسال — همان روز' : '۲ تا ۴ روز کاری'}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-ink-muted">گارانتی</span>
                  <span className="font-medium text-ink">
                    {toPersianDigits(product.attributes.warrantyMonths)} ماه گارانتی شرکتی
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-ink-muted">کشور سازنده</span>
                  <span className="font-medium text-ink">{product.attributes.madeIn}</span>
                </li>
              </ul>

              <AddToCartButton product={product} showQuantity size="lg" />

              {product.attributes.installmentAvailable && product.price > 0 ? (
                <ButtonLink href="/loyalty" variant="outline" size="md" className="w-full">
                  خرید اقساطی بدون ضامن
                </ButtonLink>
              ) : null}

              <ul className="flex flex-col gap-1.5 text-[11px] text-ink-muted">
                <li className="flex items-center gap-2">
                  <span className="text-secondary-dark">✓</span> پرداخت آنلاین امن یا پرداخت درب منزل
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-secondary-dark">✓</span> ۷ روز ضمانت بازگشت کالای سالم
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-secondary-dark">✓</span> نصب و راه‌اندازی اولیه رایگان
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-secondary-dark">✓</span> مشاوره تخصصی خرید پیش از پرداخت
                </li>
              </ul>
            </div>

            {/* نکات کلیدی */}
            {product.highlights.length > 0 ? (
              <section className="rounded-2xl border border-surface-border bg-white p-5">
                <h2 className="mb-3 text-sm font-bold text-ink">نکات کلیدی این کالا</h2>
                <ul className="flex flex-col gap-2.5">
                  {product.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2.5 text-sm leading-6 text-ink-muted">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.4}
                        className="mt-1 h-4 w-4 shrink-0 text-secondary"
                      >
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        {/* ناوبری بخش‌ها + مشخصات فنی */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-10">
            <section id="specs" className="scroll-mt-32">
              <h2 className="mb-5 text-lg font-extrabold text-ink">مشخصات فنی {product.name}</h2>
              <SpecTable specs={product.specs} />
            </section>

            <section id="description" className="scroll-mt-32">
              <h2 className="mb-4 text-lg font-extrabold text-ink">معرفی و بررسی تخصصی</h2>
              <div className="rounded-2xl border border-surface-border bg-white p-6">
                <p className="text-sm leading-8 text-ink-muted">{product.description}</p>

                <h3 className="mt-6 text-sm font-bold text-ink">این کالا برای چه کسانی مناسب است؟</h3>
                <p className="mt-2 text-sm leading-8 text-ink-muted">
                  {product.name} برای کاربرانی طراحی شده است که به دنبال {category?.description ?? 'کالایی'}{' '}
                  با دوام بالا، مصرف انرژی بهینه و خدمات پس از فروش مطمئن هستند. اگر معیار اصلی شما
                  {product.attributes.energyRating
                    ? ` مصرف برق پایین (رده ${product.attributes.energyRating})`
                    : ' کیفیت ساخت'}{' '}
                  است، این مدل در مقایسه با رقبای هم‌قیمت خود انتخاب منطقی‌تری محسوب می‌شود.
                </p>

                <h3 className="mt-6 text-sm font-bold text-ink">نگهداری و افزایش عمر مفید</h3>
                <ul className="mt-2 flex flex-col gap-2 text-sm leading-7 text-ink-muted">
                  <li>• پیش از استفاده، دفترچه راهنمای کالا را مطالعه کنید تا از شرایط گارانتی مطلع شوید.</li>
                  <li>• برای جلوگیری از نوسان برق، استفاده از محافظ برق توصیه می‌شود.</li>
                  <li>
                    • سرویس دوره‌ای سالانه، عمر مفید دستگاه را به‌طور محسوسی افزایش می‌دهد.
                  </li>
                </ul>

                <div className="mt-6 rounded-xl bg-surface-muted p-4">
                  <p className="text-xs leading-6 text-ink-muted">
                    <span className="font-bold text-ink">توجه:</span> مشخصات منتشرشده توسط کارشناسان {brand.name}{' '}
                    از منابع رسمی سازنده استخراج شده است. در صورت مشاهده هرگونه مغایرت، تا پیش از استفاده از کالا
                    با پشتیبانی تماس بگیرید.
                  </p>
                </div>
              </div>
            </section>

            <ReviewSection
              reviews={product.reviews}
              rating={product.rating}
              reviewCount={product.reviewCount}
              productSlug={product.slug}
            />

            <section id="product-faq" className="scroll-mt-32">
              <h2 className="mb-5 text-lg font-extrabold text-ink">پرسش‌های متداول درباره این کالا</h2>
              <ul className="flex flex-col gap-3">
                {productFaqs.map((faq) => (
                  <li key={faq.question} className="overflow-hidden rounded-2xl border border-surface-border bg-white">
                    <details className="group">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-ink transition-colors hover:bg-surface-muted">
                        {faq.question}
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-open:rotate-180"
                        >
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </summary>
                      <p className="border-t border-surface-border px-5 py-4 text-sm leading-7 text-ink-muted">
                        {faq.answer}
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* ستون کناری چسبان */}
          <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-32">
            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold text-ink">مشاوره تخصصی خرید</h2>
              <p className="mt-2 text-xs leading-6 text-ink-muted">
                در انتخاب ظرفیت و مدل مناسب تردید دارید؟ کارشناسان ما هر روز از ۹ صبح تا ۹ شب پاسخگو هستند.
              </p>
              <a
                href={`tel:${brand.contact.phoneRaw}`}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-secondary/[0.12] px-4 py-3 text-sm font-medium text-secondary-dark transition-colors hover:bg-secondary/20"
              >
                {brand.contact.phone}
              </a>
            </div>

            {product.specs.length > 0 ? (
              <nav aria-label="دسترسی سریع به بخش‌های صفحه" className="rounded-2xl border border-surface-border bg-white p-5">
                <h2 className="mb-3 text-sm font-bold text-ink">در این صفحه</h2>
                <ul className="flex flex-col gap-2 text-xs">
                  <li>
                    <a href="#specs" className="text-ink-muted transition-colors hover:text-primary">
                      مشخصات فنی کامل
                    </a>
                  </li>
                  <li>
                    <a href="#description" className="text-ink-muted transition-colors hover:text-primary">
                      معرفی و بررسی تخصصی
                    </a>
                  </li>
                  <li>
                    <a href="#reviews" className="text-ink-muted transition-colors hover:text-primary">
                      نظرات کاربران
                    </a>
                  </li>
                  <li>
                    <a href="#product-faq" className="text-ink-muted transition-colors hover:text-primary">
                      پرسش‌های متداول
                    </a>
                  </li>
                </ul>
              </nav>
            ) : null}
          </aside>
        </div>

        {/* محصولات مشابه */}
        {related.length > 0 ? (
          <section className="mt-12 pb-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg font-extrabold text-ink">محصولات مشابه و جایگزین</h2>
              <ButtonLink href={category ? `/shop?category=${category.slug}` : '/shop'} variant="link" size="sm">
                مشاهده همه {category?.name ?? 'محصولات'} ←
              </ButtonLink>
            </div>
            <ProductGrid products={related} columns="default" />
          </section>
        ) : null}
      </div>
    </>
  )
}
