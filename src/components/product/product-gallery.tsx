'use client'

import { useState } from 'react'
import { ProductImage } from '@/components/ui/product-image'
import { cn } from '@/lib/utils/cn'
import { toPersianDigits } from '@/lib/utils/format'
import type { CategorySlug } from '@/types'

/**
 * گالری تصاویر محصول.
 * تا زمان بارگذاری تصاویر واقعی، یک نمای جانگهدار برندشده نمایش داده
 * می‌شود. به‌محض پر شدن آرایه images، ناوبری تصاویر و بندانگشتی‌ها فعال
 * می‌شوند بدون نیاز به تغییر کد دیگر.
 */
export function ProductGallery({
  images,
  name,
  category,
  videoUrl,
}: {
  images: string[]
  name: string
  category: CategorySlug
  videoUrl?: string | null
}) {
  const views = images.length > 0 ? images : ['']
  const [activeIndex, setActiveIndex] = useState(0)
  const [videoOpen, setVideoOpen] = useState(false)

  const showVideo = Boolean(videoUrl)

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-white">
        {videoOpen && videoUrl ? (
          <div className="aspect-square w-full">
            <iframe
              src={videoUrl}
              title={`ویدیو معرفی ${name}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
              loading="lazy"
              className="h-full w-full"
            />
          </div>
        ) : (
          <ProductImage
            src={views[activeIndex] || undefined}
            alt={`${name} — تصویر ${activeIndex + 1}`}
            category={category}
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="aspect-square w-full"
            iconClassName="h-28 w-28"
          />
        )}

        {showVideo ? (
          <button
            type="button"
            onClick={() => setVideoOpen((open) => !open)}
            className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2 text-xs font-medium text-ink shadow-sm backdrop-blur transition-colors hover:text-primary"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-accent">
              <path d="M8 5.5v13l11-6.5-11-6.5z" />
            </svg>
            {videoOpen ? 'نمایش تصاویر' : 'ویدیو معرفی'}
          </button>
        ) : null}

        {views.length > 1 && !videoOpen ? (
          <span className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] text-ink-muted backdrop-blur">
            {toPersianDigits(activeIndex + 1)} از {toPersianDigits(views.length)}
          </span>
        ) : null}
      </div>

      {views.length > 1 ? (
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {views.map((view, index) => (
            <li key={`${view}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  setActiveIndex(index)
                  setVideoOpen(false)
                }}
                aria-label={`تصویر ${toPersianDigits(index + 1)}`}
                aria-current={index === activeIndex}
                className={cn(
                  'block w-full overflow-hidden rounded-xl border transition-colors',
                  index === activeIndex ? 'border-secondary' : 'border-surface-border hover:border-primary/40',
                )}
              >
                <ProductImage
                  src={view || undefined}
                  alt=""
                  category={category}
                  sizes="80px"
                  className="aspect-square w-full"
                  iconClassName="h-6 w-6"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
