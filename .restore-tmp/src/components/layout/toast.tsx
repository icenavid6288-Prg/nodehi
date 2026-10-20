'use client'

import { useStore } from '@/components/providers/store-provider'

/** پیام شناور کوتاه — برای بازخورد افزودن به سبد و مقایسه */
export function Toast() {
  const { notice } = useStore()

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 justify-center px-4"
    >
      {notice ? (
        <div className="pointer-events-auto animate-fade-up rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white shadow-float">
          {notice}
        </div>
      ) : null}
    </div>
  )
}
