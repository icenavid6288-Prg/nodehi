import type { Metadata } from 'next'
import { ContactForm } from '@/components/contact/contact-form'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { brand } from '@/config/brand'
import { breadcrumbSchema, buildMetadata, faqSchema, storeSchema } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'تماس با ما | پشتیبانی و مشاوره خرید',
  description:
    'راه‌های ارتباط با فروشگاه نودهی: تلفن پشتیبانی، پیامک، ایمیل و نشانی شعبه‌ها. مشاوره تخصصی خرید و پیگیری سفارش در ساعات کاری.',
  path: '/contact',
  keywords: ['تماس با نودهی', 'پشتیبانی لوازم خانگی', 'مشاوره خرید'],
})

export default function ContactPage() {
  const breadcrumbItems = [{ name: 'تماس با ما', path: '/contact' }]

  return (
    <>
      <JsonLd
        id="schema-contact"
        data={[
          storeSchema(),
          faqSchema([
            {
              question: 'چه ساعتی می‌توانم با پشتیبانی نودهی تماس بگیرم؟',
              answer: `${brand.contact.workingHours} آماده پاسخگویی هستیم. برای پیگیری سفارش‌های ارسال‌شده، خارج از این ساعات نیز می‌توانید از پنل کاربری استفاده کنید.`,
            },
            {
              question: 'پاسخگویی در روزهای تعطیل چگونه است؟',
              answer:
                'در روزهای تعطیل رسمی، پشتیبانی تلفنی محدود است اما پیام‌های ثبت‌شده در فرم تماس و چت آنلاین در اولین روز کاری بررسی و پاسخ داده می‌شوند.',
            },
          ]),
          breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems]),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="pb-6">
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">تماس با نودهی</h1>
          <p className="mt-2.5 max-w-3xl text-sm leading-7 text-ink-muted">
            برای مشاوره خرید، پیگیری سفارش، درخواست سرویس یا هر پرسش دیگری با ما در ارتباط باشید. کارشناسان ما
            پاسخگوی شما هستند و برای انتخاب درست کالا کنارتان می‌مانند.
          </p>
        </header>

        <div className="grid gap-6 pb-12 lg:grid-cols-[1fr_360px]">
          <ContactForm />

          <aside className="flex flex-col gap-4">
            {/* راه‌های ارتباطی */}
            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold text-ink">راه‌های ارتباطی</h2>
              <ul className="mt-4 flex flex-col gap-4 text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4">
                      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1.1 1A16 16 0 014 6.1 1 1 0 015 4z" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-xs text-ink-muted">تلفن پشتیبانی</span>
                    <a href={`tel:${brand.contact.phoneRaw}`} className="font-bold text-ink transition-colors hover:text-primary">
                      {brand.contact.phone}
                    </a>
                    <span className="mt-0.5 block text-xs text-ink-subtle">{brand.contact.workingHours}</span>
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/[0.12] text-secondary-dark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4">
                      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
                      <path d="M10.5 18.5h3" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-xs text-ink-muted">همراه و پیامک</span>
                    <a href={`tel:${brand.contact.mobile}`} className="font-bold text-ink transition-colors hover:text-primary">
                      {brand.contact.mobile}
                    </a>
                    <span className="mt-0.5 block text-xs text-ink-subtle">پاسخگویی به پیامک در ساعات کاری</span>
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/[0.12] text-accent-dark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4">
                      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-xs text-ink-muted">ایمیل</span>
                    <a href={`mailto:${brand.contact.email}`} className="ltr-inline font-bold text-ink transition-colors hover:text-primary">
                      {brand.contact.email}
                    </a>
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-4 w-4">
                      <path d="M12 21s-6.5-6-6.5-10.5a6.5 6.5 0 1113 0C18.5 15 12 21 12 21z" />
                      <circle cx="12" cy="10.5" r="2.3" />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-xs text-ink-muted">نشانی دفتر مرکزی</span>
                    <span className="font-medium text-ink">{brand.contact.address}</span>
                    <span className="mt-0.5 block text-xs text-ink-subtle">کد پستی: {brand.contact.postalCode}</span>
                  </span>
                </li>
              </ul>
            </div>

            {/* شبکه‌های اجتماعی */}
            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold text-ink">ما را دنبال کنید</h2>
              <p className="mt-2 text-xs leading-6 text-ink-muted">
                پیشنهادهای ویژه، مقایسه محصولات و نکات نگهداری را در شبکه‌های اجتماعی منتشر می‌کنیم.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {(
                  [
                    ['اینستاگرام', brand.social.instagram],
                    ['تلگرام', brand.social.telegram],
                    ['واتس‌اپ', brand.social.whatsapp],
                    ['لینکدین', brand.social.linkedin],
                  ] as [string, string][]
                ).map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-xl border border-surface-border px-3 py-2.5 text-ink-muted transition-colors hover:border-primary hover:text-primary"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* پیگیری سریع سفارش */}
            <div className="rounded-2xl bg-primary p-5">
              <h2 className="text-sm font-bold text-white">پیگیری سریع سفارش</h2>
              <p className="mt-2 text-xs leading-6 text-white/75">
                برای دیدن وضعیت سفارش و کد رهگیری مرسوله، وارد پنل کاربری شوید.
              </p>
              <a
                href="/account/orders"
                className="mt-3 flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-white/90"
              >
                ورود به پیگیری سفارش
              </a>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
