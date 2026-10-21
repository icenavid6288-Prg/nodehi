/**
 * جدول‌های باشگاه مشتریان (سطوح، اقساط، مراحل) — منبع واحد مارک‌آپ برای
 * صفحهٔ SPA و پررندر ایستا؛ هر دو از همین مؤلفه استفاده می‌کنند.
 */
import React from 'react'
import { toFa } from '../lib/format'

export type LoyaltyTier = {
  name: string
  requirement: string
  discount: string
  points: string
  perks: string[]
}

export type LoyaltyInstallment = {
  months: number
  label: string
  interest: string
  note: string
  featured: boolean
}

export type LoyaltyStep = { step: number; title: string; description: string }

export function LoyaltyTables({
  tiers,
  installments,
  steps,
  currentTier = '',
  points = null,
}: {
  tiers: LoyaltyTier[]
  installments: LoyaltyInstallment[]
  steps: LoyaltyStep[]
  currentTier?: string
  points?: number | null
}) {
  return (
    <>
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

                {points != null && active && (
                  <p className="mt-auto border-t border-surface-border pt-3 text-[11px] text-ink-subtle">
                    امتیاز فعلی شما: {toFa(points)}
                  </p>
                )}
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
          {installments.map((option) => (
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
          {steps.map((item) => (
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
    </>
  )
}
