import Link from 'next/link'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { ButtonLink } from '@/components/ui/button'
import { getBrands, getCatalog } from '@/lib/server/catalog'
import { breadcrumbSchema, buildMetadata, itemListSchema } from '@/lib/seo'
import { toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'برندهای لوازم خانگی | نمایندگی و گارانتی معتبر',
  description:
    'فهرست برندهای لوازم خانگی موجود در نودهی: سامسونگ، ال‌جی، بوش، اسنوا، پاکشوما، پارس خزر و بیشتر. مقایسه مدل‌ها با گارانتی و خدمات پس از فروش.',
  path: '/brands',
  keywords: ['برندهای لوازم خانگی', 'سامسونگ', 'ال جی', 'بوش', 'اسنوا', 'پاکشوما', 'پارس خزر'],
})

export default async function BrandsPage() {
  const [brands, catalog] = await Promise.all([getBrands(), getCatalog()])

  // شمارش محصولات هر برند یک‌بار انجام می‌شود، نه در حلقه (N×M)
  const countByBrand = catalog.products.reduce<Record<string, number>>((acc, product) => {
    acc[product.brand] = (acc[product.brand] ?? 0) + 1
    return acc
  }, {})

  const breadcrumbItems = [{ name: 'برندها', path: '/brands' }]

  // برندهایی که محصول دارند اول نمایش داده می‌شوند تا کاربر به صفحه خالی نرود
  const ordered = [...brands].sort(
    (a, b) => (countByBrand[b.slug] ?? 0) - (countByBrand[a.slug] ?? 0),
  )

  return (
    <>
      <JsonLd
        id="schema-brands"
        data={[
          breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems]),
          itemListSchema(catalog.products.slice(0, 20), 'برندهای لوازم خانگی نودهی'),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="mx-auto max-w-2xl text-center">
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">برندهای لوازم خانگی</h1>
          <p className="mt-3 text-sm leading-7 text-ink-muted">
            انتخاب برند، مهم‌ترین تصمیم پس از انتخاب کالا است؛ چون تعیین می‌کند قطعه و خدمات پس از فروش در
            سال‌های بعد در دسترس باشد یا نه. اینجا هر برند را با تعداد مدل‌های موجود و توضیح کوتاه می‌بینید.
          </p>
        </header>

        <ul className="mt-8 grid gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((item) => {
            const count = countByBrand[item.slug] ?? 0
            return (
              <li key={item.slug}>
                <Link
                  href={`/brand/${item.slug}`}
                  className="flex h-full flex-col rounded-2xl border border-surface-border bg-white p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-extrabold text-ink">{item.name}</h2>
                      <p dir="ltr" className="mt-0.5 text-left text-[11px] tracking-wide text-ink-subtle">
                        {item.nameEn}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1 text-[10px] font-medium text-ink-muted">
                      {item.origin}
                    </span>
                  </div>

                  <p className="mt-3 flex-1 text-xs leading-6 text-ink-muted">{item.description}</p>

                  <p className="mt-4 border-t border-surface-border pt-3 text-[11px] font-medium text-primary">
                    {count > 0
                      ? `${toPersianDigits(count)} مدل موجود ←`
                      : 'به‌زودی مدل‌های این برند اضافه می‌شود'}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>

        <section className="mb-12 rounded-2xl border border-surface-border bg-white p-6">
          <h2 className="text-sm font-bold text-ink">کدام برند را انتخاب کنم؟</h2>
          <div className="mt-4 grid gap-4 text-xs leading-6 text-ink-muted sm:grid-cols-3">
            <div>
              <p className="font-bold text-ink">اگر اولویت شما دوام است</p>
              <p className="mt-1">
                برندهای کره‌ای و آلمانی مثل سامسونگ، ال‌جی و بوش معمولاً کمپرسور و موتور بادوام‌تر و شبکه
                خدمات گسترده‌تری دارند؛ در عوض قیمت بالاتری هم دارند.
              </p>
            </div>
            <div>
              <p className="font-bold text-ink">اگر اولویت شما قیمت است</p>
              <p className="mt-1">
                برندهای ایرانی مثل اسنوا، پاکشوما و امرسان قطعات در دسترس و هزینه تعمیر پایین‌تری دارند و برای
                مصارف روزمره انتخاب اقتصادی‌تری هستند.
              </p>
            </div>
            <div>
              <p className="font-bold text-ink">اگر اولویت شما مصرف انرژی است</p>
              <p className="mt-1">
                به برچسب انرژی و فناوری اینورتر توجه کنید. اختلاف یک رده انرژی روی قبض برق کولر گازی و یخچال،
                در چند سال کاملاً محسوس می‌شود.
              </p>
            </div>
          </div>

          <ButtonLink href="/compare" variant="outline" size="sm" className="mt-5">
            مقایسه مدل‌های دو برند
          </ButtonLink>
        </section>
      </div>
    </>
  )
}
