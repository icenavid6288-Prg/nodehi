import { cn } from '@/lib/utils/cn'
import type { CategorySlug } from '@/types'

/**
 * آیکون‌های خطی لوازم خانگی.
 * به‌صورت SVG درون‌خطی نوشته شده‌اند تا نه وابستگی آیکون‌پک اضافه شود و نه
 * درخواست شبکه‌ای برای هر آیکون زده شود (تأثیر مستقیم بر Core Web Vitals).
 */
const paths: Record<CategorySlug, React.ReactNode> = {
  refrigerator: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2.5" />
      <path d="M5 10h14" />
      <path d="M8.5 5.5v2M8.5 13v2.5" />
    </>
  ),
  washer: (
    <>
      <rect x="3.5" y="3" width="17" height="18" rx="2.5" />
      <path d="M3.5 8h17" />
      <circle cx="12" cy="14.5" r="4" />
      <path d="M7 5.5h.01M10 5.5h.01" />
    </>
  ),
  dishwasher: (
    <>
      <rect x="3.5" y="2.5" width="17" height="19" rx="2.5" />
      <path d="M3.5 7.5h17" />
      <path d="M6.5 12h11M6.5 16h11" />
      <path d="M9 5h.01M12 5h.01" />
    </>
  ),
  tv: (
    <>
      <rect x="2.5" y="4" width="19" height="12.5" rx="2" />
      <path d="M8 20.5h8M12 16.5v4" />
    </>
  ),
  'air-conditioner': (
    <>
      <rect x="2.5" y="4.5" width="19" height="7.5" rx="2.5" />
      <path d="M6 8.5h12" />
      <path d="M6.5 15.5c0 1.5 1.5 2 1.5 3.5M12 15.5c0 1.5 1.5 2 1.5 3.5M17.5 15.5c0 1.5 1.5 2 1.5 3.5" />
    </>
  ),
  vacuum: (
    <>
      <circle cx="13" cy="16" r="4.5" />
      <circle cx="13" cy="16" r="1.6" />
      <path d="M9.5 12.5L17 3.5M20 7l-3 3M5.5 20.5H3" />
    </>
  ),
  oven: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M3 9h18" />
      <rect x="7" y="12.5" width="10" height="5.5" rx="1.5" />
      <path d="M7 6h.01M16.5 6h.01" />
    </>
  ),
  'small-appliance': (
    <>
      <path d="M6 3.5h12l-1.5 6.5H7.5L6 3.5z" />
      <path d="M5 10h14l-1.5 7a2.5 2.5 0 01-2.5 2h-6a2.5 2.5 0 01-2.5-2L5 10z" />
      <path d="M18 5.5c1.5.5 2.5 1.5 2.5 3" />
    </>
  ),
}

export function ApplianceIcon({
  category,
  className,
}: {
  category: CategorySlug
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('h-6 w-6', className)}
    >
      {paths[category]}
    </svg>
  )
}
