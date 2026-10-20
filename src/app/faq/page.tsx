import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { ButtonLink } from '@/components/ui/button'
import { brand } from '@/config/brand'
import { faqs } from '@/lib/data/content'
import { breadcrumbSchema, buildMetadata, faqSchema } from '@/lib/seo'
import { toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'سوالات متداول | ارسال، گارانتی، پرداخت و مرجوعی',
  description:
    'پاسخ پرتکرارترین پرسش‌های مشتریان نودهی درباره هزینه و زمان ارسال، گارانتی محصولات، پرداخت درب منزل، خرید اقساطی و شرایط بازگشت کالا.',
  path: '/faq',
  keywords: ['سوالات متداول', 'شرایط مرجوعی', 'گارانتی لوازم خانگی', 'هزینه ارسال'],
})

const categoryLabels: Record<string, string> = {
  shipping: 'ارسال و مرجوعی',
  payment: 'پرداخت و اقساط',
  warranty: 'گارانتی و خدمات',
  product: 'انتخاب محصول',
}

export default function FaqPage() {
  const breadcrumbItems = [{ name: 'سوالات متداول', path: '/faq' }]
  const grouped = Object.keys(categoryLabels).map((category) => ({
    category,
    label: categoryLabels[category]!,
    items: faqs.filter((faq) => faq.category === category),
  }))

  return (
    <>
      <JsonLd
        id="schema-faq"
        data={[
          faqSchema(),
          breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems]),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="pb-6">
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">سوالات متداول</h1>
          <p className="mt-2.5 max-w-3xl text-sm leading-7 text-ink-muted">
            پاسخ {toPersianDigits(faqs.length)} پرسش پرتکرار مشتریان درباره ارسال، گارانتی، پرداخت و مرجوعی را در این
            صفحه جمع کرده‌ایم. اگر پاسخ سوال خود را پیدا نکردید، کارشناسان ما از طریق تلفن و چت آنلاین پاسخگو هستند.
          </p>
        </header>

        <div className="grid gap-8 pb-10 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-8">
            {grouped.map((group) => (
              <section key={group.category} id={group.category} className="scroll-mt-28">
                <h2 className="mb-4 text-base font-bold text-ink">{group.label}</h2>
                <ul className="flex flex-col gap-3">
                  {group.items.map((faq) => (
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
            ))}
          </div>

          <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-32">
            <nav aria-label="دسته‌بندی پرسش‌ها" className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink">موضوع‌ها</h2>
              <ul className="flex flex-col gap-2 text-xs">
                {grouped.map((group) => (
                  <li key={group.category}>
                    <a href={`#${group.category}`} className="text-ink-muted transition-colors hover:text-primary">
                      {group.label} ({toPersianDigits(group.items.length)})
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold text-ink">پاسخ خود را پیدا نکردید؟</h2>
              <p className="mt-2 text-xs leading-6 text-ink-muted">
                کارشناسان پشتیبانی نودهی {brand.contact.workingHours} پاسخگوی شما هستند.
              </p>
              <a
                href={`tel:${brand.contact.phoneRaw}`}
                className="mt-3 flex items-center justify-center rounded-xl bg-secondary/[0.12] px-4 py-3 text-sm font-medium text-secondary-dark transition-colors hover:bg-secondary/20"
              >
                {brand.contact.phone}
              </a>
              <ButtonLink href="/contact" variant="outline" size="sm" className="mt-2 w-full">
                ارسال پیام
              </ButtonLink>
            </div>

            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold text-ink">مطالب مرتبط</h2>
              <ul className="mt-3 flex flex-col gap-2 text-xs">
                <li>
                  <Link href="/guides" className="text-primary transition-colors hover:text-accent">
                    راهنمای خرید لوازم خانگی
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-primary transition-colors hover:text-accent">
                    قوانین و مقررات فروشگاه
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-primary transition-colors hover:text-accent">
                    سیاست حریم خصوصی
                  </Link>
                </li>
                <li>
                  <Link href="/ready-to-ship" className="text-primary transition-colors hover:text-accent">
                    کالاهای آماده ارسال
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
