'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCatalogMeta } from '@/components/providers/catalog-provider'
import { cn } from '@/lib/utils/cn'

/** نوار برندها — لینک داخلی به صفحه فیلترشده هر برند (بهبود لینک‌سازی داخلی) */
export function BrandStrip() {
  const { brands } = useCatalogMeta()

  return (
    <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
      {brands.map((brand) => (
        <li key={brand.slug}>
          <Link
            href={`/shop?brand=${brand.slug}`}
            title={brand.description}
            className={cn(
              'flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-surface-border bg-white px-2 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-float',
            )}
          >
            <span className="text-sm font-bold text-primary">{brand.name}</span>
            <span className="ltr-inline text-[10px] text-ink-subtle">{brand.nameEn}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * ثبت ایمیل برای اطلاع از تخفیف‌ها.
 * در این نسخه فقط اعتبارسنجی سمت کلاینت انجام می‌شود؛ با فعال شدن اتوماسیون
 * بازاریابی، این فرم به وب‌هوک ایمیل‌مارکتینگ متصل می‌گردد.
 */
export function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'error' | 'success'>('idle')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
    setStatus(valid ? 'success' : 'error')
    if (valid) setEmail('')
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-primary">
      <div className="grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="text-lg font-extrabold text-white sm:text-xl">
            از تخفیف‌های نودهی باخبر شوید
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/75">
            با عضویت در خبرنامه، پیشنهادهای ویژه هفتگی و کدهای تخفیف اختصاصی را پیش از انتشار عمومی دریافت کنید.
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-2.5" noValidate>
          <div className="flex gap-2">
            <label htmlFor="newsletter-email" className="sr-only">
              ایمیل شما
            </label>
            <Input
              id="newsletter-email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setStatus('idle')
              }}
              placeholder="email@example.com"
              className="text-left"
              aria-describedby="newsletter-status"
            />
            <Button type="submit" variant="accent" className="shrink-0">
              عضویت
            </Button>
          </div>
          <p
            id="newsletter-status"
            role="status"
            aria-live="polite"
            className={cn(
              'min-h-5 text-xs',
              status === 'error' ? 'text-red-200' : 'text-secondary-light',
            )}
          >
            {status === 'error'
              ? 'آدرس ایمیل وارد‌شده معتبر نیست.'
              : status === 'success'
                ? 'عضویت شما ثبت شد. اولین پیشنهاد ویژه را برایتان ارسال می‌کنیم.'
                : 'می‌توانید هر زمان اشتراک خود را لغو کنید.'}
          </p>
        </form>
      </div>
    </div>
  )
}
