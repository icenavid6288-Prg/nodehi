import { cn } from '@/lib/utils/cn'
import { ratingToStars, toPersianDigits } from '@/lib/utils/format'

function Star({ fill = 'full', className }: { fill?: 'full' | 'half' | 'empty'; className?: string }) {
  const id = `star-${fill}`
  return (
    <svg viewBox="0 0 20 20" className={cn('h-4 w-4', className)} aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 15l-5.3 2.6 1-5.8L1.5 7.7l5.9-.9L10 1.5z"
        fill={fill === 'full' ? 'currentColor' : fill === 'half' ? `url(#${id})` : 'none'}
        stroke="currentColor"
        strokeWidth={fill === 'empty' ? 1.2 : 0}
        opacity={fill === 'empty' ? 0.35 : 1}
      />
    </svg>
  )
}

/** نمایش امتیاز با ستاره؛ متن امتیاز اختیاری است */
export function Rating({
  value,
  count,
  size = 'md',
  showValue = true,
  className,
}: {
  value: number
  count?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
}) {
  const { full, half, empty } = ratingToStars(value)
  const starClass = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className="flex items-center gap-0.5 text-amber-400"
        role="img"
        aria-label={`امتیاز ${toPersianDigits(value)} از ۵`}
      >
        {Array.from({ length: full }, (_, i) => (
          <Star key={`f${i}`} fill="full" className={starClass} />
        ))}
        {half ? <Star fill="half" className={starClass} /> : null}
        {Array.from({ length: empty }, (_, i) => (
          <Star key={`e${i}`} fill="empty" className={starClass} />
        ))}
      </div>
      {showValue ? (
        <span className="text-xs font-medium text-ink-muted tabular-nums">
          {toPersianDigits(value.toFixed(1))}
          {typeof count === 'number' && count > 0 ? (
            <span className="text-ink-subtle"> ({toPersianDigits(count)} نظر)</span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}

/** نمودار توزیع امتیازها در بخش نظرات */
export function RatingBreakdown({ distribution }: { distribution: Record<number, number> }) {
  const total = Object.values(distribution).reduce((sum, n) => sum + n, 0) || 1
  return (
    <ul className="flex flex-col gap-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] ?? 0
        const percent = Math.round((count / total) * 100)
        return (
          <li key={star} className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="w-8 tabular-nums">{toPersianDigits(star)} ستاره</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <span
                className="block h-full rounded-full bg-amber-400"
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="w-10 text-left tabular-nums">{toPersianDigits(percent)}٪</span>
          </li>
        )
      })}
    </ul>
  )
}
