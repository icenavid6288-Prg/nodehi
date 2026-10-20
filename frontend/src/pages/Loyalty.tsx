import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import { useAuth } from '../context/AuthContext'
import { get, type LoyaltyResponse } from '../lib/api'
import { toFa } from '../lib/format'

export default function Loyalty() {
  const { user } = useAuth()
  const [data, setData] = useState<LoyaltyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    get<LoyaltyResponse>('/loyalty')
      .then((response) => alive && setData(response))
      .catch(() => alive && setError('دریافت اطلاعات باشگاه مشتریان ناموفق بود.'))
    return () => {
      alive = false
    }
  }, [])

  const tiers = data?.tiers ?? []
  const currentTier = user?.loyaltyTier ?? ''

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: 'باشگاه مشتریان' }]} />

      <header className="overflow-hidden rounded-2xl bg-primary p-6 sm:p-9">
        <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.12] px-3.5 py-1.5 text-xs font-medium text-white">
              <span className="flex h-1.5 w-1.5 rounded-full bg-secondary" />
              باشگاه مشتریان نودهی
            </span>
            <h1 className="mt-4 text-2xl font-extrabold leading-9 text-white">
              با هر خرید امتیاز بگیرید و در خرید بعدی تخفیف بگیرید
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/80">
              عضویت در باشگاه مشتریان رایگان است و به‌صورت خودکار با اولین خرید فعال می‌شود. امتیازهای شما در تمام
              سفارش‌ها جمع می‌شود و در سطوح بالاتر، تخفیف دائمی و خدمات اختصاصی دریافت می‌کنید.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={user ? '/account' : '/login'}
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary transition hover:bg-white/90"
              >
                {user ? 'مشاهده امتیاز من' : 'ورود و مشاهده امتیاز'}
              </Link>
              <Link
                to="/shop"
                className="rounded-xl border border-white/35 px-5 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
              >
                شروع خرید
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-5 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">سطح فعلی</span>
              <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px]">
                {currentTier || 'تازه‌وارد'}
              </span>
            </div>
            <p className="mt-4 text-3xl font-extrabold tabular-nums">{toFa(user?.loyaltyPoints ?? 0)}</p>
            <p className="text-xs text-white/70">امتیاز فعال</p>
            <p className="mt-4 border-t border-white/15 pt-3 text-[11px] leading-6 text-white/70">
              {user
                ? 'امتیاز هر خرید پس از تحویل کالا به حساب شما اضافه می‌شود.'
                : 'برای دیدن امتیاز و سطح عضویت خود وارد حساب کاربری شوید.'}
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="mt-6 rounded-2xl border border-surface-border bg-white p-6 text-sm text-danger">{error}</div>
      )}

      <section className="py-10" aria-labelledby="tiers-title">
        <h2 id="tiers-title" className="text-lg font-extrabold">
          سطوح عضویت و مزایای هر سطح
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-muted">
          سطح عضویت شما بر اساس مجموع خریدهای موفق در نودهی تعیین می‌شود و هر سال بازبینی می‌گردد. تخفیف هر سطح
          به‌صورت خودکار در سبد خرید اعمال می‌شود.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tiers.map((tier) => {
            const active = currentTier !== '' && tier.name === currentTier
            return (
              <article
                key={tier.name}
                className={
                  active
                    ? 'flex flex-col gap-3 rounded-2xl border border-secondary bg-white p-5 shadow-float'
                    : 'flex flex-col gap-3 rounded-2xl border border-surface-border bg-white p-5'
                }
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold">{tier.name}</h3>
                  {active && (
                    <span className="rounded-full bg-secondary/[0.12] px-2.5 py-1 text-[10px] font-medium text-secondary-dark">
                      سطح شما
                    </span>
                  )}
                </div>

                <p className="text-xs text-ink-subtle">{tier.requirement}</p>

                <div className="flex items-center gap-4 rounded-xl bg-surface-muted px-3.5 py-3">
                  <div>
                    <p className="text-[10px] text-ink-muted">تخفیف دائمی</p>
                    <p className="text-sm font-extrabold text-primary">{tier.discount}</p>
                  </div>
                  <div className="border-r border-surface-border pr-4">
                    <p className="text-[10px] text-ink-muted">نرخ امتیاز</p>
                    <p className="text-[11px] font-medium">{tier.points}</p>
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
            )
          })}
        </div>
      </section>

      <section className="pb-10" aria-labelledby="installment-title">
        <h2 id="installment-title" className="text-lg font-extrabold">
          خرید اقساطی لوازم خانگی
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-muted">
          خرید اقساطی نودهی از طریق سرویس‌های اعتبارسنجی آنلاین انجام می‌شود. نیازی به ضامن یا چک نیست؛ کافی است
          مدارک هویتی و فیش حقوقی را بارگذاری کنید و در چند دقیقه نتیجه را ببینید.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(data?.installments ?? []).map((option) => (
            <div
              key={option.months}
              className={
                option.featured
                  ? 'rounded-2xl border border-primary/30 bg-white p-5'
                  : 'rounded-2xl border border-surface-border bg-white p-5'
              }
            >
              <p className="text-lg font-extrabold text-primary">{option.label}</p>
              <p className="mt-1 text-xs text-ink-muted">{option.interest}</p>
              <p className="mt-3 text-[11px] text-ink-subtle">{option.note}</p>
              {option.featured && (
                <span className="mt-3 inline-block rounded-full bg-primary/[0.08] px-2.5 py-1 text-[10px] font-medium text-primary">
                  پرطرفدار
                </span>
              )}
            </div>
          ))}
        </div>

        <ol className="mt-6 grid gap-4 rounded-2xl border border-surface-border bg-white p-6 sm:grid-cols-4">
          {(data?.steps ?? []).map((item) => (
            <li key={item.step}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/[0.08] text-sm font-bold text-primary">
                {toFa(item.step)}
              </span>
              <p className="mt-2.5 text-sm font-bold">{item.title}</p>
              <p className="mt-1 text-xs leading-6 text-ink-muted">{item.description}</p>
            </li>
          ))}
        </ol>

        <p className="mt-5 rounded-2xl bg-white p-5 text-xs leading-6 text-ink-muted">
          <span className="font-bold text-ink">نکته مهم:</span> در خرید اقساطی، بازپرداخت از طریق سرویس اعتبارسنجی
          انجام می‌شود و نودهی هیچ‌گونه اطلاعات بانکی شما را ذخیره نمی‌کند. سقف اعتبار اقساطی میان خریدهای مختلف
          تقسیم می‌شود تا از ایجاد تعهد بیش از توان مالی جلوگیری گردد.
        </p>
      </section>
    </div>
  )
}
