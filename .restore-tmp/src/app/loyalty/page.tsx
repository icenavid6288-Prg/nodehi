import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { loyaltyAccount } from '@/lib/data/orders'
import { breadcrumbSchema, buildMetadata } from '@/lib/seo'
import { formatJalaliDate, toPersianDigits } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export const metadata: Metadata = buildMetadata({
  title: 'باشگاه مشتریان | امتیاز، تخفیف وفاداری و خرید اقساطی',
  description:
    'با هر خرید در نودهی امتیاز جمع کنید و در خریدهای بعدی تخفیف بگیرید. شرایط خرید اقساطی بدون ضامن، سطوح عضویت و مزایای هر سطح را ببینید.',
  path: '/loyalty',
  keywords: ['باشگاه مشتریان', 'خرید اقساطی لوازم خانگی', 'تخفیف وفاداری', 'امتیاز خرید'],
})

const tiers = [
  {
    name: 'برنزی',
    requirement: 'از اولین خرید',
    discount: '۳٪',
    points: '۱ امتیاز به ازای هر ۱۰۰ هزار تومان',
    perks: ['اطلاع زودتر از تخفیف‌ها', 'ارسال رایگان بالای ۳۰ میلیون تومان', 'پشتیبانی تلفنی'],
  },
  {
    name: 'نقره‌ای',
    requirement: 'بالای ۵۰ میلیون تومان خرید',
    discount: '۵٪',
    points: '۱.۵ امتیاز به ازای هر ۱۰۰ هزار تومان',
    perks: ['همه مزایای برنزی', 'اولویت در پشتیبانی', 'تعویض رایگان کالای معیوب', 'هدیه تولد'],
    current: true,
  },
  {
    name: 'طلایی',
    requirement: 'بالای ۱۵۰ میلیون تومان خرید',
    discount: '۸٪',
    points: '۲ امتیاز به ازای هر ۱۰۰ هزار تومان',
    perks: [
      'همه مزایای نقره‌ای',
      'نصب و سرویس سالانه رایگان',
      'مشاور اختصاصی خرید',
      'امکان خرید اقساطی بدون کارمزد',
    ],
  },
  {
    name: 'الماس',
    requirement: 'بالای ۳۰۰ میلیون تومان خرید',
    discount: '۱۲٪',
    points: '۳ امتیاز به ازای هر ۱۰۰ هزار تومان',
    perks: ['همه مزایای طلایی', 'دسترسی به فروش ویژه پیش از انتشار', 'تحویل اختصاصی در منزل', 'گارانتی تمدیدشده'],
  },
]

const installments = [
  { months: 6, label: '۶ ماه', interest: 'بدون کارمزد', monthly: 'حساس به اعتبارسنجی' },
  { months: 12, label: '۱۲ ماه', interest: 'کارمزد ۴٪', monthly: 'پرطرفدارترین گزینه' },
  { months: 18, label: '۱۸ ماه', interest: 'کارمزد ۷٪', monthly: 'مناسب خریدهای بزرگ' },
  { months: 24, label: '۲۴ ماه', interest: 'کارمزد ۹٪', monthly: 'کم‌ترین قسط ماهانه' },
]

export default function LoyaltyPage() {
  const progress = Math.round(
    (loyaltyAccount.points / (loyaltyAccount.points + loyaltyAccount.pointsToNextTier)) * 100,
  )
  const breadcrumbItems = [{ name: 'باشگاه مشتریان', path: '/loyalty' }]

  return (
    <>
      <JsonLd
        id="schema-loyalty"
        data={breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }, ...breadcrumbItems])}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <header className="overflow-hidden rounded-2xl bg-primary p-6 sm:p-9">
          <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.12] px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur">
                <span className="flex h-1.5 w-1.5 rounded-full bg-secondary-light" />
                باشگاه مشتریان نودهی
              </span>
              <h1 className="mt-4 text-xl font-extrabold leading-9 text-white sm:text-2xl">
                با هر خرید امتیاز بگیرید و در خرید بعدی تخفیف بگیرید
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/80">
                عضویت در باشگاه مشتریان رایگان است و به‌صورت خودکار با اولین خرید فعال می‌شود. امتیازهای شما در
                تمام سفارش‌ها جمع می‌شود و در سطوح بالاتر، تخفیف دائمی و خدمات اختصاصی دریافت می‌کنید.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/account" variant="accent" size="lg" className="!bg-white !text-primary hover:!bg-white/90">
                  مشاهده امتیاز من
                </ButtonLink>
                <ButtonLink
                  href="/shop"
                  variant="outline"
                  size="lg"
                  className="!border-white/35 !bg-transparent !text-white hover:!border-white hover:!bg-white/10 hover:!text-white"
                >
                  شروع خرید
                </ButtonLink>
              </div>
            </div>

            {/* کارت عضویت نمونه */}
            <div className="rounded-2xl bg-white/10 p-5 text-white backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">سطح فعلی</span>
                <Badge tone="secondary" className="!border-white/25 !bg-white/15 !text-white">
                  {loyaltyAccount.tier}
                </Badge>
              </div>
              <p className="mt-4 text-3xl font-extrabold tabular-nums">{toPersianDigits(loyaltyAccount.points)}</p>
              <p className="text-xs text-white/70">امتیاز فعال</p>

              <div className="mt-4">
                <div
                  className="h-2 overflow-hidden rounded-full bg-white/20"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-label="پیشرفت تا سطح بالاتر"
                >
                  <span className="block h-full rounded-full bg-secondary-light" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-white/75">
                  {toPersianDigits(loyaltyAccount.pointsToNextTier)} امتیاز تا سطح {loyaltyAccount.nextTier}
                </p>
              </div>

              <p className="mt-4 border-t border-white/15 pt-3 text-[11px] text-white/70">
                عضو از {formatJalaliDate(loyaltyAccount.memberSince)}
              </p>
            </div>
          </div>
        </header>

        {/* سطوح عضویت */}
        <section className="py-10" aria-labelledby="tiers-title">
          <h2 id="tiers-title" className="text-lg font-extrabold text-ink">
            سطوح عضویت و مزایای هر سطح
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-muted">
            سطح عضویت شما بر اساس مجموع خریدهای موفق در نودهی تعیین می‌شود و هر سال بازبینی می‌گردد. تخفیف هر سطح
            به‌صورت خودکار در سبد خرید اعمال می‌شود.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {tiers.map((tier) => (
              <article
                key={tier.name}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border bg-white p-5',
                  tier.current ? 'border-secondary shadow-float' : 'border-surface-border',
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-ink">{tier.name}</h3>
                  {tier.current ? (
                    <span className="rounded-full bg-secondary/[0.12] px-2.5 py-1 text-[10px] font-medium text-secondary-dark">
                      سطح شما
                    </span>
                  ) : null}
                </div>

                <p className="text-xs text-ink-subtle">{tier.requirement}</p>

                <div className="flex items-center gap-4 rounded-xl bg-surface-muted px-3.5 py-3">
                  <div>
                    <p className="text-[10px] text-ink-muted">تخفیف دائمی</p>
                    <p className="text-sm font-extrabold text-primary">{tier.discount}</p>
                  </div>
                  <div className="border-r border-surface-border pr-4">
                    <p className="text-[10px] text-ink-muted">نرخ امتیاز</p>
                    <p className="text-[11px] font-medium text-ink">{tier.points}</p>
                  </div>
                </div>

                <ul className="flex flex-col gap-2">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-xs leading-6 text-ink-muted">
                      <span className="mt-1 text-secondary">✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* خرید اقساطی */}
        <section className="pb-10" aria-labelledby="installment-title">
          <h2 id="installment-title" className="text-lg font-extrabold text-ink">
            خرید اقساطی لوازم خانگی
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-muted">
            خرید اقساطی نودهی از طریق سرویس‌های اعتبارسنجی آنلاین انجام می‌شود. نیازی به ضامن یا چک نیست؛ کافی است
            مدارک هویتی و فیش حقوقی را بارگذاری کنید و در چند دقیقه نتیجه را ببینید.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {installments.map((option, index) => (
              <div
                key={option.months}
                className={cn(
                  'rounded-2xl border bg-white p-5',
                  index === 1 ? 'border-primary/30' : 'border-surface-border',
                )}
              >
                <p className="text-lg font-extrabold text-primary">{option.label}</p>
                <p className="mt-1 text-xs text-ink-muted">{option.interest}</p>
                <p className="mt-3 text-[11px] text-ink-subtle">{option.monthly}</p>
                {index === 1 ? (
                  <span className="mt-3 inline-block rounded-full bg-primary/[0.08] px-2.5 py-1 text-[10px] font-medium text-primary">
                    پرطرفدار
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <ol className="mt-6 grid gap-4 rounded-2xl border border-surface-border bg-white p-6 sm:grid-cols-4">
            {[
              { step: '۱', title: 'انتخاب کالا', description: 'محصول را به سبد خرید اضافه کنید.' },
              { step: '۲', title: 'انتخاب اقساط', description: 'در تسویه حساب گزینه اقساطی را بزنید.' },
              { step: '۳', title: 'اعتبارسنجی', description: 'مدارک را بارگذاری و نتیجه را ببینید.' },
              { step: '۴', title: 'ارسال کالا', description: 'پس از تأیید، کالا بدون ضامن ارسال می‌شود.' },
            ].map((item) => (
              <li key={item.step}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/[0.08] text-sm font-bold text-primary">
                  {item.step}
                </span>
                <p className="mt-2.5 text-sm font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-xs leading-6 text-ink-muted">{item.description}</p>
              </li>
            ))}
          </ol>

          <p className="mt-5 rounded-2xl bg-surface-muted p-5 text-xs leading-6 text-ink-muted">
            <span className="font-bold text-ink">نکته مهم:</span> در خرید اقساطی، بازپرداخت از طریق سرویس اعتبارسنجی
            انجام می‌شود و نودهی هیچ‌گونه اطلاعات بانکی شما را ذخیره نمی‌کند. اعتبار اقساط سه‌ماهه برای خریدهای
            مختلف تقسیم می‌شود تا از ایجاد تعهد بیش از توان مالی جلوگیری گردد.
          </p>
        </section>
      </div>
    </>
  )
}
