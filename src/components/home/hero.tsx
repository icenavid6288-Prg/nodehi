'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ApplianceIcon } from '@/components/ui/appliance-icon'
import { ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { toPersianDigits } from '@/lib/utils/format'
import type { CategorySlug } from '@/types'

interface Slide {
  id: string
  eyebrow: string
  title: string
  description: string
  primary: { href: string; label: string }
  secondary: { href: string; label: string }
  icon: CategorySlug
  /** کلاس‌های گرادیان پس‌زمینه */
  background: string
  /** نکات کلیدی اسلاید */
  bullets: string[]
}

const slides: Slide[] = [
  {
    id: 'side-by-side',
    eyebrow: 'پیشنهاد ویژه این هفته',
    title: 'یخچال ساید بای ساید با تخفیف تا ۸٪',
    description:
      'مدل‌های اینورتر با گارانتی ۱۰ ساله کمپرسور، ارسال همان‌روز در تهران و کرج و نصب رایگان در محل.',
    primary: { href: '/shop?category=refrigerator', label: 'مشاهده یخچال‌ها' },
    secondary: { href: '/guides/how-to-choose-refrigerator', label: 'راهنمای خرید' },
    icon: 'refrigerator',
    background: 'from-primary via-primary-light to-primary-dark',
    bullets: ['ارسال همان‌روز', 'نصب رایگان', 'گارانتی ۱۰ ساله کمپرسور'],
  },
  {
    id: 'washer',
    eyebrow: 'پرفروش‌ترین‌های ماه',
    title: 'ماشین لباسشویی کم‌مصرف با اقساط بدون ضامن',
    description:
      'ظرفیت ۸ و ۹ کیلوگرمی با رده انرژی A+++، موتور اینورتر بی‌صدا و امکان بازپرداخت تا ۲۴ ماه.',
    primary: { href: '/shop?category=washer', label: 'مشاهده لباسشویی‌ها' },
    secondary: { href: '/loyalty', label: 'خرید اقساطی' },
    icon: 'washer',
    background: 'from-secondary-dark via-secondary to-secondary-light',
    bullets: ['اقساط بدون ضامن', 'رده انرژی A+++', 'بخارشوی ضدحساسیت'],
  },
  {
    id: 'ready',
    eyebrow: 'موجودی فوری انبار',
    title: 'کالاهای آماده ارسال، همین امروز به دستتان می‌رسد',
    description:
      'بیش از ۲۰۰ قلم کالا در انبار تهران موجود است. سفارش تا ساعت ۱۴ ثبت کنید، همان روز ارسال می‌شود.',
    primary: { href: '/ready-to-ship', label: 'کالاهای موجود' },
    secondary: { href: '/shop?sort=newest', label: 'جدیدترین محصولات' },
    icon: 'oven',
    background: 'from-accent-dark via-accent to-accent-light',
    bullets: ['سفارش تا ساعت ۱۴', 'ارسال همان‌روز', 'پرداخت درب منزل'],
  },
]

export function Hero() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((next: number) => {
    setIndex(((next % slides.length) + slides.length) % slides.length)
  }, [])

  // چرخش خودکار اسلایدها، با توقف هنگام هاور (برای خوانایی)
  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 7000)
    return () => window.clearInterval(timer)
  }, [paused])

  const slide = slides[index]

  return (
    <section
      aria-roledescription="کاروسل"
      aria-label="پیشنهادهای ویژه نودهی"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden rounded-2xl border border-surface-border"
    >
      <div className={cn('relative bg-gradient-to-l p-6 transition-colors duration-500 sm:p-10 lg:p-14', slide.background)}>
        {/* بافت تزئینی پس‌زمینه */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/[0.06]" />
          <span className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-white/5" />
        </div>

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div key={slide.id} className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.12] px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur">
              <span className="flex h-1.5 w-1.5 rounded-full bg-secondary-light" />
              {slide.eyebrow}
            </span>

            <h1 className="mt-4 text-2xl font-extrabold leading-[1.35] text-white sm:text-3xl lg:text-[2.5rem] lg:leading-[1.3]">
              {slide.title}
            </h1>

            <p className="mt-3.5 max-w-xl text-sm leading-7 text-white/80 sm:text-base">{slide.description}</p>

            <ul className="mt-5 flex flex-wrap gap-2">
              {slide.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="h-3.5 w-3.5 text-secondary-light">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {bullet}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink
                href={slide.primary.href}
                variant="accent"
                size="lg"
                className="!bg-white !text-primary hover:!bg-white/90"
              >
                {slide.primary.label}
              </ButtonLink>
              <ButtonLink
                href={slide.secondary.href}
                variant="outline"
                size="lg"
                className="!border-white/35 !bg-transparent !text-white hover:!border-white hover:!bg-white/10 hover:!text-white"
              >
                {slide.secondary.label}
              </ButtonLink>
            </div>
          </div>

          {/* نمای تزئینی محصول */}
          <div className="hidden justify-center lg:flex">
            <div className="relative flex h-64 w-64 items-center justify-center rounded-3xl border border-white/15 bg-white/[0.08] backdrop-blur">
              <ApplianceIcon category={slide.icon} className="h-32 w-32 text-white/85" />
              <span className="absolute bottom-4 rounded-xl bg-white/95 px-3 py-1.5 text-[11px] font-bold text-primary">
                {slide.bullets[0]}
              </span>
            </div>
          </div>
        </div>

        {/* کنترل‌های اسلایدر */}
        <div className="relative mt-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" role="tablist" aria-label="انتخاب اسلاید">
            {slides.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={itemIndex === index}
                aria-label={item.eyebrow}
                onClick={() => goTo(itemIndex)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  itemIndex === index ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/70',
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="اسلاید بعدی"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 text-white transition-colors hover:bg-white/15"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="اسلاید قبلی"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 text-white transition-colors hover:bg-white/15"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M10 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="mr-1 text-xs text-white/70 tabular-nums">
              {toPersianDigits(index + 1)} / {toPersianDigits(slides.length)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * نوار دسته‌بندی زیر هیرو — دسترسی سریع به پرتقاضاترین گروه‌ها.
 * تعداد کالاهای هر دسته از لایه داده محاسبه و نمایش داده می‌شود.
 */
export function CategoryStrip({ counts }: { counts: Record<CategorySlug, number> }) {
  return (
    <nav aria-label="دسته‌بندی کالاها" className="grid grid-cols-4 gap-2 lg:grid-cols-8">
      {categoryStripItems.map(({ slug, label, short }) => (
        <Link
          key={slug}
          href={`/shop?category=${slug}`}
          className="group flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-white px-2 py-4 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-float"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.08] text-primary transition-colors group-hover:bg-primary group-hover:text-white">
            <ApplianceIcon category={slug} className="h-6 w-6" />
          </span>
          <span className="text-xs font-medium leading-5 text-ink">{short}</span>
          <span className="text-[10px] text-ink-subtle">
            {label} · {toPersianDigits(counts[slug] ?? 0)} کالا
          </span>
        </Link>
      ))}
    </nav>
  )
}

const categoryStripItems: { slug: CategorySlug; label: string; short: string }[] = [
  { slug: 'refrigerator', label: 'یخچال', short: 'یخچال و فریزر' },
  { slug: 'washer', label: 'لباسشویی', short: 'ماشین لباسشویی' },
  { slug: 'dishwasher', label: 'ظرفشویی', short: 'ماشین ظرفشویی' },
  { slug: 'tv', label: 'تلویزیون', short: 'تلویزیون' },
  { slug: 'air-conditioner', label: 'کولر گازی', short: 'کولر گازی' },
  { slug: 'vacuum', label: 'جاروبرقی', short: 'جاروبرقی' },
  { slug: 'oven', label: 'اجاق گاز', short: 'اجاق گاز و فر' },
  { slug: 'small-appliance', label: 'لوازم کوچک', short: 'لوازم خانگی کوچک' },
]
