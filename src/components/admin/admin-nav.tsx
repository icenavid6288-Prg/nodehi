'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { AdminSearch } from '@/components/admin/admin-search'
import { useAuth } from '@/components/providers/auth-provider'
import { cn } from '@/lib/utils/cn'
import { toPersianDigits } from '@/lib/utils/format'

/** کارهای روزمره فروشگاه */
const links = [
  { href: '/admin', label: 'داشبورد', icon: 'dashboard' as const },
  { href: '/admin/products', label: 'کالاها', icon: 'box' as const },
  { href: '/admin/orders', label: 'سفارش‌ها', icon: 'orders' as const },
  { href: '/admin/customers', label: 'مشتریان', icon: 'users' as const },
  { href: '/admin/users', label: 'کاربران و نقش‌ها', icon: 'shield' as const },
  { href: '/admin/coupons', label: 'کدهای تخفیف', icon: 'ticket' as const },
  { href: '/admin/reviews', label: 'نظرات', icon: 'star' as const },
  { href: '/admin/messages', label: 'پیام‌های تماس', icon: 'mail' as const },
  { href: '/admin/stock-alerts', label: 'هشدار موجودی', icon: 'bell' as const },
]

/**
 * ابزارها و تنظیمات — از کارهای روزمره جدا شده‌اند تا سایدبار شلوغ نشود و
 * پیدا‌کردن «تنظیمات» وسط هفت گزینه فروشگاهی، آزمون‌و‌خطا نباشد.
 */
const toolLinks = [
  { href: '/admin/reports', label: 'گزارش فروش', icon: 'chart' as const },
  { href: '/admin/content', label: 'محتوای سایت', icon: 'grid' as const },
  { href: '/admin/settings', label: 'تنظیمات سایت', icon: 'settings' as const },
  { href: '/admin/sms', label: 'سرویس پیامک', icon: 'chat' as const },
  { href: '/admin/payments', label: 'درگاه پرداخت', icon: 'card' as const },
  { href: '/admin/integrations', label: 'یکپارچه‌سازی‌ها', icon: 'plug' as const },
  { href: '/admin/automation', label: 'اتوماسیون', icon: 'bolt' as const },
  { href: '/admin/audit', label: 'گزارش فعالیت', icon: 'history' as const },
]

/** تعداد کارهای معوق که کنار هر منو نشان داده می‌شود */
export type AdminNavBadges = Record<string, { count: number; title: string }>

/** سایدبار پنل مدیریت */
export function AdminNav({
  user,
  badges = {},
}: {
  user: { displayName: string; role: string; roleLabel: string }
  badges?: AdminNavBadges
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    setPending(true)
    try {
      await logout()
      router.push('/')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  // مجموع کارهای معوق — یک نگاه به بالای سایدبار کافی است تا بار کاری معلوم شود
  const badgeTotal = Object.values(badges).reduce((sum, badge) => sum + badge.count, 0)

  return (
    <nav aria-label="ناوبری پنل مدیریت" className="lg:sticky lg:top-32 lg:h-fit">
      <AdminSearch />

      <div className="mb-3 overflow-hidden rounded-2xl bg-primary p-5 text-white">
        <p className="text-[11px] text-white/[0.72]">وارد شده به‌عنوان</p>
        <p className="mt-1 truncate text-sm font-bold">{user.displayName}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/[0.14] px-3 py-1 text-[11px] font-bold text-white">
            {user.roleLabel}
          </span>
          {badgeTotal > 0 ? (
            <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-white">
              {toPersianDigits(badgeTotal)} کار معوق
            </span>
          ) : (
            <span className="rounded-full bg-white/[0.14] px-3 py-1 text-[11px] text-white/[0.85]">
              کار معوقی نیست
            </span>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-0.5 rounded-2xl border border-surface-border bg-white p-2">
        {links.map((link) => (
          <li key={link.href}>
            <NavRow link={link} pathname={pathname} badge={badges[link.href]} />
          </li>
        ))}
      </ul>

      <p className="mt-4 px-3 text-[11px] font-bold text-ink-subtle">ابزارها و تنظیمات</p>
      <ul className="mt-2 flex flex-col gap-0.5 rounded-2xl border border-surface-border bg-white p-2">
        {toolLinks.map((link) => (
          <li key={link.href}>
            <NavRow link={link} pathname={pathname} badge={badges[link.href]} />
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-surface-border bg-white px-3 py-3 text-sm text-ink-muted transition-colors hover:text-primary"
      >
        بازگشت به فروشگاه
      </Link>

      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={pending}
        className="mt-2 w-full rounded-2xl border border-surface-border bg-white px-3 py-3 text-sm text-ink-muted transition-colors hover:border-danger/30 hover:text-danger disabled:opacity-60"
      >
        {pending ? 'در حال خروج…' : 'خروج از حساب'}
      </button>
    </nav>
  )
}

/** یک ردیف ناوبری — مشترک بین دو فهرست بالا تا رفتار فعال‌شدن یکسان بماند */
function NavRow({
  link,
  pathname,
  badge,
}: {
  link: { href: string; label: string; icon: string }
  pathname: string
  badge?: { count: number; title: string }
}) {
  // داشبورد فقط با تطبیق دقیق فعال می‌شود تا در زیرصفحه‌ها هم روشن نماند
  const active = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href)
  const showBadge = Boolean(badge && badge.count > 0)
  return (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
        active
          ? 'bg-primary/[0.06] font-bold text-primary'
          : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
      )}
    >
      <AdminIcon name={link.icon} className="h-4.5 w-4.5" />
      <span className="flex-1">{link.label}</span>
      {showBadge && badge ? (
        <span
          title={badge.title}
          className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tabular-nums text-white"
        >
          {toPersianDigits(badge.count)}
        </span>
      ) : null}
    </Link>
  )
}

function AdminIcon({ name, className }: { name: string; className?: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  }

  switch (name) {
    case 'box':
      return (
        <svg {...common}>
          <path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4v-9z" />
          <path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9" />
        </svg>
      )
    case 'orders':
      return (
        <svg {...common}>
          <path d="M5 3.5h14v17l-7-3.5-7 3.5z" />
          <path d="M9 8h6M9 12h4" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="3.2" />
          <path d="M3 19.5c1-3.2 3.4-4.8 6-4.8s5 1.6 6 4.8" />
          <path d="M16 5.5a3 3 0 010 6M18.5 19.5c-.3-1.6-.9-2.9-1.8-3.9" />
        </svg>
      )
    case 'ticket':
      return (
        <svg {...common}>
          <path d="M3 8.5a2 2 0 012-2h14a2 2 0 012 2v1.5a2 2 0 000 4V16a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8.5z" />
          <path d="M13 7v10" strokeDasharray="2 2" />
        </svg>
      )
    case 'star':
      return (
        <svg {...common}>
          <path d="M12 3.5l2.6 5.4 5.9.9-4.3 4.2 1 5.9L12 17l-5.2 2.9 1-5.9L3.5 9.8l5.9-.9L12 3.5z" />
        </svg>
      )
    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="5.5" width="18" height="13" rx="2" />
          <path d="M3.5 7l8.5 6 8.5-6" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...common}>
          <path d="M18 15.5V10a6 6 0 10-12 0v5.5L4.5 18h15z" />
          <path d="M10 21h4" />
        </svg>
      )
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 20h16" />
          <path d="M7 20V11M12 20V5M17 20v-6" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3.5l7 2.5v6c0 4-3 7-7 8.5-4-1.5-7-4.5-7-8.5V6l7-2.5z" />
          <path d="M9.5 12.2l1.8 1.8 3.4-3.6" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.5 12a7.5 7.5 0 00-.1-1.2l2-1.5-2-3.4-2.4 1a7.5 7.5 0 00-2-1.2L14.6 3h-4l-.4 2.7a7.5 7.5 0 00-2 1.2l-2.4-1-2 3.4 2 1.5a7.5 7.5 0 000 2.4l-2 1.5 2 3.4 2.4-1a7.5 7.5 0 002 1.2l.4 2.7h4l.4-2.7a7.5 7.5 0 002-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
        </svg>
      )
    case 'chat':
      return (
        <svg {...common}>
          <path d="M4 5.5h16v11H9l-5 3.5v-14.5z" />
          <path d="M8.5 10h7M8.5 13h4" />
        </svg>
      )
    case 'card':
      return (
        <svg {...common}>
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <path d="M3 10h18" />
          <path d="M7 14.5h3" />
        </svg>
      )
    case 'plug':
      return (
        <svg {...common}>
          <path d="M9 3.5v5M15 3.5v5" />
          <path d="M6.5 8.5h11v3a5.5 5.5 0 01-11 0v-3z" />
          <path d="M12 17v3.5" />
        </svg>
      )
    case 'bolt':
      return (
        <svg {...common}>
          <path d="M13 3L5 13.5h5l-1 7.5 8-10.5h-5L13 3z" />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <path d="M3.5 12a8.5 8.5 0 108.5-8.5 8.5 8.5 0 00-6.2 2.7" />
          <path d="M3.5 4.5v4h4" />
          <path d="M12 8v4.5l3 1.8" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" />
        </svg>
      )
  }
}
