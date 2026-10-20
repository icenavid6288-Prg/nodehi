import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'

export interface PromoBandContent {
  badge: string | null
  title: string | null
  subtitle: string | null
  href: string
  cta: string
}

/**
 * بنر تبلیغاتی صفحه اصلی.
 *
 * محتوا از تنظیمات پنل می‌آید (`pages.promo.*`)، پس ادمین می‌تواند کمپین را
 * بدون تغییر کد و انتشار دوباره سایت عوض کند. این کامپوننت عمداً «بی‌حالت»
 * است: مقدارها را می‌گیرد و نمایش می‌دهد، بدون دست‌زدن به دیتابیس.
 *
 * ⚠️ لینک ورودی از پنل می‌آید، پس فقط مسیر داخلی سایت پذیرفته می‌شود. لینک
 * بیرونی می‌توانست ابزار فیشینگ شود (بازدیدکننده به دامنه‌ای جعلی برود که
 * ظاهر نودهی را دارد).
 */
export function PromoBand({ content }: { content: PromoBandContent }) {
  const href = isSafeInternalHref(content.href) ? content.href : '/shop'

  return (
    <section
      aria-label="پیشنهاد ویژه"
      className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-l from-primary via-primary-light to-primary-dark px-5 py-6 text-white sm:px-7 sm:py-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          {content.badge ? (
            <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium">
              {content.badge}
            </p>
          ) : null}
          {content.title ? (
            <h2 className="mt-3 text-lg font-extrabold leading-8 sm:text-xl">{content.title}</h2>
          ) : null}
          {content.subtitle ? (
            <p className="mt-2 max-w-2xl text-xs leading-6 text-white/85 sm:text-sm">
              {content.subtitle}
            </p>
          ) : null}
        </div>

        <ButtonLink href={href} variant="secondary" size="md" className="shrink-0">
          {content.cta || 'مشاهده کالاها'}
        </ButtonLink>
      </div>
    </section>
  )
}

/** فقط مسیرهای نسبی داخلی مجازند */
export function isSafeInternalHref(href: string | null | undefined): boolean {
  if (!href) return false
  const trimmed = href.trim()
  return trimmed.startsWith('/') && !trimmed.startsWith('//')
}
