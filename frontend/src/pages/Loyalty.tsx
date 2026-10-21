import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import { LoyaltyTables } from '../components/LoyaltyTables'
import { useAuth } from '../context/AuthContext'
import { get, type LoyaltyResponse } from '../lib/api'
import { toFa } from '../lib/format'
import { loyaltyMeta, usePageMeta } from '../lib/seo'

export default function Loyalty() {
  const { user } = useAuth()
  const [data, setData] = useState<LoyaltyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // متادیتا از هستهٔ مشترک سئو (با JSON-LD اقساط) می‌آید تا با پررندر ایستا یکی باشد.
  usePageMeta(loyaltyMeta(data))

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

      <section className="pb-4" aria-label="جدول سطوح و اقساط">
        {/* جدول‌های سطوح/اقساط/مراحل بین SPA و پررندر ایستا مشترک‌اند. */}
        <LoyaltyTables
          tiers={tiers}
          installments={data?.installments ?? []}
          steps={data?.steps ?? []}
          currentTier={currentTier}
          points={user?.loyaltyPoints ?? null}
        />
      </section>
    </div>
  )
}
