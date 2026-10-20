import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchBox } from '@/components/layout/search-box'
import { ButtonLink } from '@/components/ui/button'
import { buildMetadata } from '@/lib/seo'
import { getCategories } from '@/lib/server/catalog'

export const metadata: Metadata = buildMetadata({
  title: 'صفحه یافت نشد',
  description: 'صفحه مورد نظر شما در فروشگاه نودهی پیدا نشد.',
  path: '/404',
  noIndex: true,
})

export default async function NotFound() {
  // دسته‌ها از دیتابیس می‌آیند تا صفحه ۴۰۴ پس از تغییر دسته‌ها هم درست بماند
  const categories = await getCategories()

  return (
    <div className="container-page py-16">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <span className="text-6xl font-extrabold text-primary/15 tabular-nums">۴۰۴</span>

        <div>
          <h1 className="text-xl font-extrabold text-ink">این صفحه پیدا نشد</h1>
          <p className="mt-2.5 text-sm leading-7 text-ink-muted">
            ممکن است نشانی صفحه تغییر کرده باشد، محصول از فروشگاه حذف شده یا در نوشتن آدرس اشتباهی رخ داده باشد.
            می‌توانید از جستجوی زیر استفاده کنید یا از دسته‌بندی‌ها به محصول مورد نظر خود برسید.
          </p>
        </div>

        <div className="w-full max-w-lg text-right">
          <SearchBox />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink href="/" variant="primary" size="md">
            صفحه اصلی
          </ButtonLink>
          <ButtonLink href="/shop" variant="outline" size="md">
            همه محصولات
          </ButtonLink>
          <ButtonLink href="/contact" variant="outline" size="md">
            تماس با پشتیبانی
          </ButtonLink>
        </div>

        <nav aria-label="دسته‌بندی محصولات" className="mt-4 w-full border-t border-surface-border pt-6">
          <p className="mb-3 text-xs font-bold text-ink-subtle">دسته‌بندی‌های پرطرفدار</p>
          <ul className="flex flex-wrap justify-center gap-1.5">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/shop?category=${category.slug}`}
                  className="inline-block rounded-full border border-surface-border bg-white px-3.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
