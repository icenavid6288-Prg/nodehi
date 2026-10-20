'use client'

import Link from 'next/link'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { AddToCartButton, CompareButton } from '@/components/product/actions'
import { Price } from '@/components/product/price'
import { useStore } from '@/components/providers/store-provider'
import { ButtonLink } from '@/components/ui/button'
import { ProductImage } from '@/components/ui/product-image'
import { Rating } from '@/components/ui/rating'
import { useCatalogMeta } from '@/components/providers/catalog-provider'
import { useProductsBySlugs } from '@/components/providers/product-lookup'
import { cn } from '@/lib/utils/cn'
import { formatNumber, toPersianDigits } from '@/lib/utils/format'
import type { Product } from '@/types'

/**
 * جدول مقایسه محصولات.
 * سطرهای مقایسه از اتحاد مشخصات فنی محصولات انتخاب‌شده ساخته می‌شوند، بنابراین
 * مقایسه مدل‌های متفاوت از برندهای مختلف هم درست کار می‌کند.
 */
export default function ComparePage() {
  const { compare, toggleCompare, clearCompare, hydrated } = useStore()
  const { getBrandName, getCategory } = useCatalogMeta()

  // محصولات مقایسه از دیتابیس خوانده می‌شوند (مرورگر فقط نامک را نگه می‌دارد)
  const { products: selected, loading: productsLoading } = useProductsBySlugs(compare)

  const breadcrumbItems = [{ name: 'مقایسه محصولات', path: '/compare' }]

  // سطرهای ویژگی‌های ساختاریافته
  const attributeRows: { label: string; render: (product: Product) => React.ReactNode }[] = [
    { label: 'برند', render: (p) => getBrandName(p.brand) },
    { label: 'دسته‌بندی', render: (p) => getCategory(p.category)?.name ?? '—' },
    {
      label: 'ظرفیت',
      render: (p) =>
        p.attributes.capacity ? `${toPersianDigits(p.attributes.capacity)} ${p.attributes.capacityUnit ?? ''}` : '—',
    },
    { label: 'رده مصرف انرژی', render: (p) => <span className="ltr-inline">{p.attributes.energyRating ?? '—'}</span> },
    { label: 'رنگ', render: (p) => p.attributes.color },
    { label: 'موتور اینورتر', render: (p) => (p.attributes.inverter ? 'دارد' : 'ندارد') },
    {
      label: 'ابعاد (عرض×ارتفاع×عمق)',
      render: (p) =>
        p.attributes.widthCm
          ? `${toPersianDigits(p.attributes.widthCm)} × ${toPersianDigits(p.attributes.heightCm ?? 0)} × ${toPersianDigits(p.attributes.depthCm ?? 0)} سانتی‌متر`
          : '—',
    },
    { label: 'گارانتی', render: (p) => `${toPersianDigits(p.attributes.warrantyMonths)} ماه` },
    { label: 'کشور سازنده', render: (p) => p.attributes.madeIn },
    { label: 'ارسال', render: (p) => (p.attributes.readyToShip ? 'آماده ارسال — همان روز' : '۲ تا ۴ روز کاری') },
    { label: 'خرید اقساطی', render: (p) => (p.attributes.installmentAvailable ? 'دارد' : 'ندارد') },
    { label: 'موجودی', render: (p) => (p.stock > 0 ? `${toPersianDigits(p.stock)} عدد` : 'ناموجود') },
  ]

  /**
   * برچسب مشخصاتی که پیش از این در سطرهای ساختاریافته نمایش داده شده‌اند.
   * بدون این حذف، موادی مانند «رنگ» و «ابعاد» دو بار در جدول تکرار می‌شوند و
   * جدول را شلوغ و طولانی می‌کنند. مقایسه پس از حذف فاصله و نیم‌فاصله انجام
   * می‌شود تا نگارش‌های متفاوت برچسب هم گرفته شوند.
   */
  const coveredPrefixes = ['برند', 'دسته‌بندی', 'ظرفیت', 'رده', 'رنگ', 'ابعاد', 'گارانتی', 'کشور']

  const normalizeLabel = (label: string) => label.replace(/[\s\u200c]+/g, '')

  const isCovered = (label: string) => {
    const normalized = normalizeLabel(label)
    return coveredPrefixes.some((prefix) => normalized.startsWith(normalizeLabel(prefix)))
  }

  // اتحاد برچسب‌های مشخصات فنی، بدون مواردی که در سطرهای ساختاریافته آمده‌اند
  const specLabels = [
    ...new Set(
      selected
        .flatMap((product) => product.specs.map((spec) => spec.label))
        .filter((label) => !isCovered(label)),
    ),
  ]

  return (
    <>
      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
          <div>
            <h1 className="text-xl font-extrabold text-ink sm:text-2xl">مقایسه محصولات</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-muted">
              مشخصات فنی، قیمت و شرایط ارسال محصولات انتخابی را کنار هم ببینید تا انتخابی آگاهانه داشته باشید. برای
              افزودن محصول جدید، از دکمه «مقایسه» در کارت هر کالا استفاده کنید.
            </p>
          </div>
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={clearCompare}
              className="text-xs text-ink-muted underline-offset-4 transition-colors hover:text-danger hover:underline"
            >
              پاک کردن جدول مقایسه
            </button>
          ) : null}
        </header>

        {!hydrated || productsLoading ? (
          <div className="rounded-2xl border border-surface-border bg-white p-12 text-center text-sm text-ink-muted">
            در حال آماده‌سازی جدول مقایسه…
          </div>
        ) : selected.length === 0 ? (
          <EmptyCompare />
        ) : selected.length === 1 ? (
          <div className="flex flex-col gap-6">
            <p className="rounded-2xl border border-secondary/25 bg-secondary/[0.08] px-5 py-4 text-sm text-secondary-dark">
              برای مقایسه، حداقل دو محصول انتخاب کنید. می‌توانید محصولات پیشنهادی زیر را نیز اضافه کنید.
            </p>
            <SuggestionGrid exclude={selected.map((p) => p.slug)} />
          </div>
        ) : (
          <div className="flex flex-col gap-8 pb-10">
            {/* جدول مقایسه — اسکرول افقی در موبایل */}
            <div className="overflow-x-auto thin-scrollbar rounded-2xl border border-surface-border bg-white">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <caption className="sr-only">
                  جدول مقایسه مشخصات فنی {toPersianDigits(selected.length)} محصول
                </caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky right-0 z-10 w-44 border-b border-l border-surface-border bg-surface-muted px-4 py-3 text-right text-xs font-bold text-ink"
                    >
                      مشخصه
                    </th>
                    {selected.map((product) => (
                      <th key={product.slug} scope="col" className="border-b border-surface-border px-4 py-4 align-top">
                        <div className="flex w-52 flex-col gap-3">
                          <button
                            type="button"
                            onClick={() => toggleCompare(product.slug)}
                            className="self-start text-[11px] text-ink-subtle transition-colors hover:text-danger"
                          >
                            حذف ×
                          </button>
                          <Link href={`/product/${product.slug}`} className="block">
                            <ProductImage
                              src={product.images[0]}
                              alt={product.name}
                              category={product.category}
                              sizes="200px"
                              className="aspect-square w-full rounded-xl"
                              iconClassName="h-10 w-10"
                            />
                          </Link>
                          <Link
                            href={`/product/${product.slug}`}
                            className="line-clamp-2 text-right text-sm font-bold leading-6 text-ink transition-colors hover:text-primary"
                          >
                            {product.name}
                          </Link>
                          <Rating value={product.rating} count={product.reviewCount} size="sm" />
                          <Price price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
                          <AddToCartButton product={product} size="sm" label="افزودن به سبد" />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {attributeRows.map((row, rowIndex) => (
                    <tr key={row.label} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-surface-muted'}>
                      <th
                        scope="row"
                        className={cn(
                          'sticky right-0 z-10 border-l border-surface-border px-4 py-3 text-right text-xs font-medium text-ink-muted',
                          rowIndex % 2 === 0 ? 'bg-white' : 'bg-surface-muted',
                        )}
                      >
                        {row.label}
                      </th>
                      {selected.map((product) => (
                        <td key={product.slug} className="px-4 py-3 text-xs text-ink">
                          {row.render(product)}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {specLabels.map((label, index) => (
                    <tr
                      key={label}
                      className={(attributeRows.length + index) % 2 === 0 ? 'bg-white' : 'bg-surface-muted'}
                    >
                      <th
                        scope="row"
                        className={cn(
                          'sticky right-0 z-10 border-l border-surface-border px-4 py-3 text-right text-xs font-medium text-ink-muted',
                          (attributeRows.length + index) % 2 === 0 ? 'bg-white' : 'bg-surface-muted',
                        )}
                      >
                        {label}
                      </th>
                      {selected.map((product) => {
                        const spec = product.specs.find((item) => item.label === label)
                        return (
                          <td key={product.slug} className="px-4 py-3 text-xs text-ink">
                            {spec?.value ?? '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/shop" variant="outline" size="sm">
                افزودن محصول دیگر به مقایسه
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function EmptyCompare() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-surface-border bg-white px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-ink-subtle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
          <path d="M5 4v16M12 4v16M19 4v16" strokeLinecap="round" />
          <path d="M3.5 16.5h3M10.5 9h3M17.5 13h3" strokeLinecap="round" />
        </svg>
      </span>
      <div>
        <p className="text-sm font-bold text-ink">هنوز محصولی برای مقایسه انتخاب نشده است</p>
        <p className="mt-1.5 max-w-md text-xs leading-6 text-ink-muted">
          با کلیک روی دکمه «مقایسه» در کارت محصولات، آن‌ها را به این جدول اضافه کنید. تا چهار محصول را می‌توانید
          همزمان مقایسه کنید.
        </p>
      </div>
      <ButtonLink href="/shop" variant="primary" size="sm">
        رفتن به فروشگاه
      </ButtonLink>
      <SuggestionGrid exclude={[]} />
    </div>
  )
}

/** پیشنهاد محصولات پرطرفدار برای شروع مقایسه */
function SuggestionGrid({ exclude }: { exclude: string[] }) {
  const { popularSlugs, getBrandName } = useCatalogMeta()
  const { products: popular } = useProductsBySlugs(popularSlugs)
  const suggestions = popular
    .filter((product) => !exclude.includes(product.slug) && product.stock > 0)
    .slice(0, 4)

  return (
    <section className="w-full pt-6">
      <h2 className="mb-3 text-sm font-bold text-ink">پیشنهاد برای شروع مقایسه</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {suggestions.map((product) => (
          <li key={product.slug} className="rounded-xl border border-surface-border bg-white p-3 text-right">
            <Link href={`/product/${product.slug}`} className="block">
              <ProductImage
                src={product.images[0]}
                alt={product.name}
                category={product.category}
                sizes="200px"
                className="aspect-square w-full rounded-lg"
              />
            </Link>
            <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-ink">{product.name}</p>
            <p className="mt-1 text-[11px] text-ink-subtle">{getBrandName(product.brand)}</p>

            <p className="mt-1.5 text-[11px] font-medium text-ink">{formatNumber(product.price)} تومان</p>
            <div className="mt-2.5">
              <CompareButton slug={product.slug} size="sm" className="w-full" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
