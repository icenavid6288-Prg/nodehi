import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ProductGrid } from '@/components/product/product-grid'
import { JsonLd } from '@/components/seo/json-ld'
import { ButtonLink } from '@/components/ui/button'
import { brand } from '@/config/brand'
import { readyToShipProducts } from '@/lib/server/catalog'
import { breadcrumbSchema, buildMetadata, itemListSchema } from '@/lib/seo'
import { formatJalaliDateTime, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'کالاهای آماده ارسال | خرید با ارسال همان‌روز',
  description:
    'فهرست لوازم خانگی موجود در انبار نودهی که آماده ارسال فوری هستند. سفارش تا ساعت ۱۴ ثبت کنید تا در تهران و کرج همان‌روز تحویل بگیرید.',
  path: '/ready-to-ship',
  keywords: ['ارسال فوری لوازم خانگی', 'کالای موجود', 'خرید همان‌روز', 'ارسال سریع'],
})

export default async function ReadyToShipPage() {
  const items = await readyToShipProducts(48)
  const breadcrumbItems = [{ name: 'کالاهای آماده ارسال', path: '/ready-to-ship' }]

  return (
    <>
      <JsonLd
        id="schema-ready"
        data={[
          breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems]),
          itemListSchema(items, 'کالاهای آماده ارسال نودهی'),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="overflow-hidden rounded-2xl bg-gradient-to-l from-secondary-dark via-secondary to-secondary-light p-6 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur">
                <span className="flex h-2 w-2 animate-pulse rounded-full bg-white" />
                موجودی لحظه‌ای انبار
              </span>
              <h1 className="mt-4 text-xl font-extrabold leading-9 text-white sm:text-2xl">
                کالاهای آماده ارسال امروز
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/85">
                این کالاها در انبار تهران موجود هستند و نیازی به تأمین از تأمین‌کننده ندارند. سفارش‌های ثبت‌شده تا
                ساعت ۱۴ در تهران و کرج همان‌روز ارسال می‌شوند و برای سایر شهرها با تیپاکس یا باربری بین ۲ تا ۵ روز
                کاری به دست شما می‌رسد.
              </p>
            </div>

            <dl className="flex gap-6 rounded-2xl bg-white/[0.12] p-5 text-white backdrop-blur">
              <div>
                <dt className="text-[11px] text-white/70">تعداد کالا</dt>
                <dd className="mt-1 text-xl font-extrabold tabular-nums">{toPersianDigits(items.length)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-white/70">آخرین به‌روزرسانی</dt>
                <dd className="mt-1 text-xs font-medium">{formatJalaliDateTime(new Date())}</dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="grid gap-4 py-6 sm:grid-cols-3">
          <InfoCard
            title="ارسال همان‌روز"
            description="سفارش تا ساعت ۱۴ ثبت کنید؛ همان روز به دستتان می‌رسد."
          />
          <InfoCard
            title="پرداخت درب منزل"
            description="کالا را ببینید، سپس پرداخت کنید. در تهران، کرج و مراکز استان‌ها فعال است."
          />
          <InfoCard
            title="نصب رایگان"
            description="نصب و راه‌اندازی اولیه یخچال، لباسشویی، ظرفشویی و تلویزیون رایگان است."
          />
        </div>

        <section className="pb-10" aria-labelledby="ready-list-title">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 id="ready-list-title" className="text-lg font-extrabold text-ink">
              {toPersianDigits(items.length)} کالای آماده ارسال
            </h2>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/shop?ready=1" variant="outline" size="sm">
                مشاهده با فیلتر پیشرفته
              </ButtonLink>
              <ButtonLink href="/shop?sort=newest" variant="outline" size="sm">
                جدیدترین محصولات
              </ButtonLink>
            </div>
          </div>

          <ProductGrid products={items} priorityCount={4} />

          <div className="mt-8 rounded-2xl border border-surface-border bg-white p-6">
            <h2 className="text-base font-bold text-ink">درباره موجودی انبار {brand.name}</h2>
            <p className="mt-3 text-sm leading-7 text-ink-muted">
              موجودی نمایش‌داده‌شده در این صفحه هر پانزده دقیقه از سیستم انبار نودهی به‌روزرسانی می‌شود. این
              همگام‌سازی از طریق سرویس موجودی انجام می‌گیرد و با فروش هم‌زمان در مارکت‌پلیس‌های دیگر یکپارچه است؛
              بنابراین اگر کالایی برای خرید قابل انتخاب است، در انبار رزرو خواهد شد.
            </p>
            <p className="mt-3 text-sm leading-7 text-ink-muted">
              در موارد نادر ممکن است کالایی پیش از پردازش سفارش شما به فروش برود. در این حالت، تیم پشتیبانی بلافاصله
              با شما تماس می‌گیرد و کالای جایگزین یا بازگشت کامل مبلغ را پیشنهاد می‌دهد.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-ink">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/[0.12] text-xs text-secondary-dark">
          ✓
        </span>
        {title}
      </p>
      <p className="mt-2 text-xs leading-6 text-ink-muted">{description}</p>
    </div>
  )
}
