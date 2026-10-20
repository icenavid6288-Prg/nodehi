import Link from 'next/link'
import { brand } from '@/config/brand'
import { cn } from '@/lib/utils/cn'

/**
 * لوگو و لوگوتایپ نودهی. پس از آماده شدن فایل لوگو، این مؤلفه با تصویر جایگزین می‌شود.
 * `tone="inverse"` برای زمینه‌های تیره (مانند سربرگ کشوی موبایل) است.
 */
export function Logo({
  className,
  showTagline = false,
  tone = 'default',
}: {
  className?: string
  showTagline?: boolean
  tone?: 'default' | 'inverse'
}) {
  const inverse = tone === 'inverse'
  return (
    <Link href="/" className={cn('flex items-center gap-2.5', className)} aria-label={`${brand.name} — صفحه اصلی`}>
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl shadow-sm',
          inverse ? 'bg-white/15 text-white ring-1 ring-white/20' : 'bg-primary text-white',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
          <path
            d="M4 18V8.5a1.5 1.5 0 011.5-1.5h13A1.5 1.5 0 0120 8.5V18"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
          />
          <path d="M4 13h16" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" />
          <circle cx="8" cy="10.5" r="0.9" fill="currentColor" />
          <path d="M2.5 20.5h19" stroke="#12B5A5" strokeWidth={2.2} strokeLinecap="round" />
        </svg>
      </span>
      <span className="flex flex-col leading-tight">
        <span className={cn('text-lg font-extrabold', inverse ? 'text-white' : 'text-primary')}>
          {brand.name}
        </span>
        {showTagline ? (
          <span className={cn('text-[11px]', inverse ? 'text-white/70' : 'text-ink-subtle')}>
            لوازم خانگی مطمئن
          </span>
        ) : null}
      </span>
    </Link>
  )
}
