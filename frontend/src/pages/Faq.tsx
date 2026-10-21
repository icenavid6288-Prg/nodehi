import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import { FaqAccordion } from '../components/FaqAccordion'
import { get, type FaqResponse } from '../lib/api'
import { toFa } from '../lib/format'
import { faqMeta, usePageMeta } from '../lib/seo'

const PHONE = '۰۲۱-۹۱۰۰۰۰۰۰'
const PHONE_RAW = '+982191000000'

export default function Faq() {
  const { hash } = useLocation()
  const [data, setData] = useState<FaqResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    get<FaqResponse>('/faqs')
      .then((response) => alive && setData(response))
      .catch(() => alive && setError('دریافت پرسش‌ها ناموفق بود؛ صفحه را دوباره باز کنید.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  // لینک‌های عمیق به یک موضوع (#shipping) پس از بارگذاری پرسش‌ها فعال می‌شوند.
  useEffect(() => {
    if (!data || !hash) return
    const target = document.getElementById(hash.slice(1))
    if (target) target.scrollIntoView({ block: 'start' })
  }, [data, hash])

  const groups = (data?.categories ?? [])
    .map((category) => ({
      ...category,
      items: (data?.items ?? []).filter((item) => item.category === category.slug),
    }))
    .filter((group) => group.items.length > 0)

  // متادیتا (شامل JSON-LD از نوع FAQPage) از هستهٔ مشترک سئو می‌آید تا با
  // نسخهٔ پررندرشدهٔ ایستا دقیقاً یکی باشد.
  usePageMeta(faqMeta(data?.items ?? [], data?.categories ?? []))

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: 'سوالات متداول' }]} />

      <header className="pb-6">
        <h1 className="text-2xl font-extrabold">سوالات متداول</h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-7 text-ink-muted">
          پاسخ {toFa(data?.total ?? 0)} پرسش پرتکرار مشتریان درباره ارسال، گارانتی، پرداخت و مرجوعی را در این صفحه
          جمع کرده‌ایم. اگر پاسخ سوال خود را پیدا نکردید، کارشناسان ما از طریق تلفن و فرم تماس پاسخگو هستند.
        </p>
      </header>

      {loading && <p className="py-10 text-sm text-ink-muted">در حال بارگذاری پرسش‌ها…</p>}
      {error && !loading && (
        <div className="rounded-2xl border border-surface-border bg-white p-6 text-sm text-danger">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid gap-8 pb-10 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <section key={group.slug} id={group.slug} className="scroll-mt-28">
                <h2 className="mb-3 text-base font-bold">{group.label}</h2>
                {/* مارک‌آپ آکاردئون بین SPA و پررندر ایستا مشترک است. */}
                <FaqAccordion items={group.items} idPrefix={group.slug} />
              </section>
            ))}
          </div>

          <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-28">
            <nav aria-label="موضوع پرسش‌ها" className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="mb-3 text-sm font-bold">موضوع‌ها</h2>
              <ul className="flex flex-col gap-2 text-xs">
                {groups.map((group) => (
                  <li key={group.slug}>
                    <a href={`#${group.slug}`} className="text-ink-muted transition-colors hover:text-primary">
                      {group.label} ({toFa(group.items.length)})
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold">پاسخ خود را پیدا نکردید؟</h2>
              <p className="mt-2 text-xs leading-6 text-ink-muted">
                کارشناسان پشتیبانی نودهی هر روز از ۹ صبح تا ۹ شب پاسخگوی شما هستند.
              </p>
              <a
                href={`tel:${PHONE_RAW}`}
                className="mt-3 flex items-center justify-center rounded-xl bg-secondary/[0.12] px-4 py-3 text-sm font-medium text-secondary-dark transition-colors hover:bg-secondary/20"
              >
                {PHONE}
              </a>
              <Link
                to="/contact"
                className="mt-2 block rounded-xl border border-surface-border px-4 py-2.5 text-center text-xs font-bold text-primary transition-colors hover:border-primary/40"
              >
                ارسال پیام
              </Link>
            </div>

            <div className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-bold">مطالب مرتبط</h2>
              <ul className="mt-3 flex flex-col gap-2 text-xs">
                <li>
                  <Link to="/guides" className="text-primary transition-colors hover:text-accent">
                    راهنمای خرید لوازم خانگی
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-primary transition-colors hover:text-accent">
                    قوانین و مقررات فروشگاه
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-primary transition-colors hover:text-accent">
                    سیاست حریم خصوصی
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="text-primary transition-colors hover:text-accent">
                    مقالات و راهنمای خرید
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
