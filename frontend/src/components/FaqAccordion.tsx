/**
 * آکاردئون سوالات متداول — هم در SPA (فایل‌های `faq-` برای جاوااسکریپت)
 * و هم در پررندر ایستا (بدون JS، با <details>) استفاده می‌شود.
 * این مؤلفه «منبع واحد» مارک‌آپ FAQ است.
 */
import React from 'react'

export type FaqEntry = {
  id?: number | string
  category?: string
  question: string
  answer: string
}

export function FaqAccordion({
  items,
  idPrefix = 'faq',
}: {
  items: FaqEntry[]
  idPrefix?: string
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const id = `${idPrefix}-${item.id ?? index}`
        return (
          <details key={id} id={id} className="faq-item group rounded-xl border border-line bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-bold text-ink transition hover:bg-sky/5 [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span className="text-xs text-muted transition group-open:rotate-180">▾</span>
            </summary>
            <div className="border-t border-line/60 px-5 py-4 text-[13px] leading-7 text-muted">
              {item.answer.split(/\n+/u).map((paragraph, pIndex) => (
                <p key={pIndex} className={pIndex > 0 ? 'mt-3' : ''}>
                  {paragraph}
                </p>
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}
