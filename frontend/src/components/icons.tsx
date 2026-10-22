import type { ReactNode } from 'react'

type IconProps = { className?: string }

type CategoryIconProps = { name: string; className?: string }

const base = 'h-5 w-5'

export function SearchIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

export function CartIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="20" r="1.3" />
      <circle cx="18" cy="20" r="1.3" />
    </svg>
  )
}

export function UserIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5" strokeLinecap="round" />
    </svg>
  )
}

export function MenuIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  )
}

export function CloseIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  )
}

export function TruckIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 6h10v10H3zM13 10h4l3 3v3h-7" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </svg>
  )
}

export function ShieldIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.6-3 8.1-7 10-4-1.9-7-5.4-7-10V6z" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function StarIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
    </svg>
  )
}

export function CheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronLeftIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m14 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronRightIcon({ className = base }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m10 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PauseIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 6v12M15 6v12" strokeLinecap="round" />
    </svg>
  )
}

export function PlayIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  )
}

/**
 * نقشهٔ آیکون دسته‌بندی‌ها.
 *
 * کلید هر آیکون همان مقدار `icon` است که API کاتالوگ برای هر دسته برمی‌گرداند
 * (مثل `refrigerator` یا `washer`)، بنابراین افزودن دستهٔ تازه در بک‌اند بدون
 * تغییر این فایل هم کار می‌کند و آیکون عمومی می‌گیرد.
 */
const categoryIcons: Record<string, ReactNode> = {
  refrigerator: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2.2" />
      <path d="M6 10h12M9 6.5V8M9 13v1.8" />
    </>
  ),
  washer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2.2" />
      <path d="M4 7h16" />
      <circle cx="12" cy="14" r="3.8" />
      <circle cx="8" cy="5" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  dishwasher: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2.2" />
      <path d="M4 8h16M8 12.5h8M8 16h8" />
      <circle cx="7" cy="5.5" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2.2" />
      <path d="M9 20h6M12 16.5V20" />
    </>
  ),
  'air-conditioner': (
    <>
      <rect x="3" y="4.5" width="18" height="7" rx="2.2" />
      <path d="M6 8.5h6" />
      <path d="M7 14c0 1.8 1 2.6 1 4.2M12 14c0 1.8 1 2.6 1 4.2M17 14c0 1.8 1 2.6 1 4.2" />
    </>
  ),
  vacuum: (
    <>
      <circle cx="9" cy="14" r="4.5" />
      <path d="M12.5 10.5 15 4h4" />
      <path d="M4 20.5h9" />
    </>
  ),
  oven: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2.2" />
      <path d="M4 8h16" />
      <rect x="7" y="11.5" width="10" height="6.5" rx="1.2" />
      <circle cx="7.5" cy="5.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="5.5" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  'small-appliance': (
    <>
      <rect x="3.5" y="9" width="17" height="8.5" rx="2.2" />
      <path d="M8 9V7M12 9V7M16 9V7M6.5 17.5V20M17.5 17.5V20" />
    </>
  ),
}

/** آیکون عمومی برای دسته‌ای که در نقشه نیست */
const fallbackCategoryIcon = (
  <>
    <rect x="3.5" y="6" width="17" height="13" rx="2.2" />
    <path d="M3.5 11h17M8 6V4M16 6V4" />
  </>
)

/** آیکون دسته‌بندی بر اساس شناسهٔ آیکونِ آمده از API */
export function CategoryIcon({ name, className = 'h-6 w-6' }: CategoryIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {categoryIcons[name] ?? fallbackCategoryIcon}
    </svg>
  )
}
