import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { ButtonLink } from '@/components/ui/button'
import { brand } from '@/config/brand'
import { trustPoints } from '@/lib/data/content'
import { breadcrumbSchema, buildMetadata, organizationSchema } from '@/lib/seo'
import { toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'درباره نودهی | فروشگاه لوازم خانگی با ضمانت و گارانتی',
  description:
    'نودهی فروشگاه اینترنتی لوازم خانگی با تمرکز بر اصالت کالا، قیمت شفاف، ارسال سریع و خدمات پس از فروش مطمئن است. داستان، ارزش‌ها و آمار فروشگاه را ببینید.',
  path: '/about',
  keywords: ['درباره نودهی', 'فروشگاه لوازم خانگی', 'ضمانت اصالت کالا'],
})

const stats = [
  { label: 'سال فعالیت', value: '۱۲' },
  { label: 'مشتری فعال', value: '۸۵۰۰۰' },
  { label: 'کالای موجود', value: '۲۴۰۰' },
  { label: 'شهر تحت پوشش ارسال', value: '۳۱۰' },
]

const values = [
  {
    title: 'شفافیت در قیمت و مشخصات',
    description:
      'مشخصات فنی هر کالا را کامل و بدون بزرگ‌نمایی منتشر می‌کنیم. اگر کالایی محدودیت دارد، همان‌جا می‌نویسیم تا پس از خرید غافلگیر نشوید.',
  },
  {
    title: 'اصالت کالا و فاکتور رسمی',
    description:
      'همه کالاها از نمایندگی‌های رسمی تأمین می‌شوند و با فاکتور معتبر و کارت گارانتی ارسال می‌گردند. هیچ کالای بدون گارانتی در نودهی فروخته نمی‌شود.',
  },
  {
    title: 'خدمات پس از فروش واقعی',
    description:
      'تیم پشتیبانی ما پس از خرید هم در دسترس است. پیگیری گارانتی، هماهنگی سرویس و رسیدگی به مرجوعی، بخشی از خدمت ماست نه یک استثنا.',
  },
  {
    title: 'مشاوره بدون فروش اجباری',
    description:
      'اگر کالای گران‌تر برای نیاز شما مناسب نباشد، همان را می‌گوییم. هدف ما انتخاب درست شماست، نه بالا بردن مبلغ سبد خرید.',
  },
]

export default function AboutPage() {
  const breadcrumbItems = [{ name: 'درباره ما', path: '/about' }]

  return (
    <>
      <JsonLd
        id="schema-about"
        data={[
          organizationSchema(),
          breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems]),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="overflow-hidden rounded-2xl bg-primary p-6 sm:p-10">
          <div className="max-w-3xl">
            <h1 className="text-xl font-extrabold leading-9 text-white sm:text-2xl">
              درباره فروشگاه لوازم خانگی {brand.name}
            </h1>
            <p className="mt-4 text-sm leading-8 text-white/80">
              {brand.name} از سال ۱۳۹۳ در بازار لوازم خانگی ایران فعالیت می‌کند. مسیری که با یک فروشگاه کوچک در
              خیابان ولیعصر تهران آغاز شد، امروز به فروشگاهی آنلاین با انبار اختصاصی و شبکه ارسال سراسری تبدیل شده
              است. تمرکز ما از ابتدا بر یک اصل ساده بوده: خرید لوازم خانگی باید مطمئن باشد.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/shop" variant="accent" size="lg" className="!bg-white !text-primary hover:!bg-white/90">
                مشاهده محصولات
              </ButtonLink>
              <ButtonLink
                href="/contact"
                variant="outline"
                size="lg"
                className="!border-white/35 !bg-transparent !text-white hover:!border-white hover:!bg-white/10 hover:!text-white"
              >
                تماس با ما
              </ButtonLink>
            </div>
          </div>
        </header>

        {/* آمار */}
        <section className="py-8" aria-label="آمار فروشگاه">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-surface-border bg-white p-5 text-center">
                <dd className="text-2xl font-extrabold text-primary tabular-nums">{toPersianDigits(stat.value)}</dd>
                <dt className="mt-1.5 text-xs text-ink-muted">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* ارزش‌ها */}
        <section className="pb-10" aria-labelledby="values-title">
          <h2 id="values-title" className="text-lg font-extrabold text-ink">
            اصولی که به آن پایبندیم
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <article key={value.title} className="rounded-2xl border border-surface-border bg-white p-6">
                <h3 className="text-sm font-bold text-ink">{value.title}</h3>
                <p className="mt-2 text-sm leading-7 text-ink-muted">{value.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* تعهدات */}
        <section className="pb-10" aria-labelledby="commitments-title">
          <h2 id="commitments-title" className="text-lg font-extrabold text-ink">
            تعهدات فروشگاه
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trustPoints.map((point) => (
              <li key={point.title} className="rounded-2xl border border-surface-border bg-white p-5">
                <p className="text-sm font-bold text-ink">{point.title}</p>
                <p className="mt-1.5 text-xs leading-6 text-ink-muted">{point.description}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* شعبه‌ها */}
        <section className="pb-12" aria-labelledby="branches-title">
          <h2 id="branches-title" className="text-lg font-extrabold text-ink">
            شعبه‌های حضوری
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-muted">
            علاوه بر فروشگاه اینترنتی، می‌توانید محصولات را حضوری در شعبه‌های زیر ببینید و خریداری کنید. کارشناسان
            ما برای مشاوره حضوری در ساعات کاری در دسترس هستند.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {brand.branches.map((branch) => (
              <article key={branch.city} className="rounded-2xl border border-surface-border bg-white p-6">
                <h3 className="text-sm font-bold text-ink">شعبه {branch.city}</h3>
                <p className="mt-2 text-sm text-ink-muted">{branch.address}</p>
                <p className="mt-3 text-xs text-ink-subtle">ساعات کاری: {brand.contact.workingHours}</p>
                <a
                  href={branch.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-medium text-primary transition-colors hover:text-accent"
                >
                  مشاهده روی نقشه ←
                </a>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
