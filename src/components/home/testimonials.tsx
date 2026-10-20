'use client'

import { useRef } from 'react'
import { Rating } from '@/components/ui/rating'
import { testimonials } from '@/lib/data/content'

/**
 * نظرات مشتریان.
 * به‌جای کتابخانه کاروسل، از اسکرول افقی بومی استفاده شده تا هم حجم
 * جاوااسکریپت کم بماند و هم تجربه لمسی روی موبایل طبیعی باشد.
 */
export function Testimonials() {
  const scrollerRef = useRef<HTMLUListElement>(null)

  function scrollBy(direction: 1 | -1) {
    const scroller = scrollerRef.current
    if (!scroller) return
    // در حالت RTL جهت اسکرول معکوس است
    scroller.scrollBy({ left: direction * -340, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <ul
        ref={scrollerRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        aria-label="نظرات مشتریان نودهی"
      >
        {testimonials.map((testimonial) => (
          <li
            key={testimonial.id}
            className="w-[19rem] shrink-0 snap-start rounded-2xl border border-surface-border bg-white p-5 shadow-card sm:w-[22rem]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/[0.12] text-sm font-bold text-secondary-dark">
                {testimonial.name.slice(0, 1)}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">{testimonial.name}</p>
                <p className="text-xs text-ink-subtle">{testimonial.city}</p>
              </div>
              <Rating value={testimonial.rating} showValue={false} size="sm" />
            </div>

            <blockquote className="mt-4 text-sm leading-7 text-ink-muted">«{testimonial.body}»</blockquote>

            <p className="mt-4 border-t border-surface-border pt-3 text-xs text-ink-subtle">
              خریدار: {testimonial.productName}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-4 hidden justify-center gap-2 sm:flex">
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="نظرات بعدی"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-ink-muted transition-colors hover:border-primary hover:text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="نظرات قبلی"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-ink-muted transition-colors hover:border-primary hover:text-primary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path d="M10 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
