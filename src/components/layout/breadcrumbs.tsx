import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

export interface Crumb {
  name: string
  path: string
}

/**
 * مسیر راهنما (breadcrumb).
 * هم برای کاربر جهت‌یابی می‌دهد و هم در نتایج گوگل مسیر صفحه را نشان
 * می‌دهد. اسکیمای متناظر آن در lib/seo ساخته می‌شود.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="مسیر صفحه" className={cn('flex items-center gap-1.5 text-xs text-ink-muted', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="transition-colors hover:text-primary">
            صفحه اصلی
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.path}-${index}`} className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 text-ink-subtle">
                <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isLast ? (
                <span aria-current="page" className="font-medium text-ink">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="transition-colors hover:text-primary">
                  {item.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
