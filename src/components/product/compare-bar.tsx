'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProductsBySlugs } from '@/components/providers/product-lookup'
import { useStore } from '@/components/providers/store-provider'
import { ProductImage } from '@/components/ui/product-image'
import { cn } from '@/lib/utils/cn'
import { toPersianDigits } from '@/lib/utils/format'

/**
 * نوار شناور مقایسه.
 * وقتی کاربر محصولی را برای مقایسه انتخاب می‌کند، این نوار پایین صفحه ظاهر
 * می‌شود تا دسترسی به جدول مقایسه همیشه در دسترس باشد.
 */
export function CompareBar() {
  const pathname = usePathname()
  const { compare, toggleCompare, clearCompare, hydrated, maxCompare } = useStore()

  // هوک باید بی‌قید صدا زده شود (قاعدهٔ هوک‌ها)؛ ولی در صفحه‌هایی که نوار
  // نمایش داده نمی‌شود هیچ درخواستی هم فرستاده نمی‌شود
  const hidden = pathname === '/compare' || pathname === '/cart'
  const { products } = useProductsBySlugs(hidden ? [] : compare)

  // در خود صفحه مقایسه یا سبد خرید، نمایش نوار لازم نیست
  if (!hydrated || compare.length === 0 || hidden) return null

  // محصولات از دیتابیس می‌آیند؛ کالای حذف‌شده به‌طور خودکار از نوار می‌افتد
  const items = products

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <div className="pointer-events-auto flex w-full max-w-3xl items-center gap-3 rounded-2xl border border-surface-border bg-white/[0.97] p-3 shadow-float backdrop-blur">
        <ul className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar" aria-label="محصولات انتخاب‌شده برای مقایسه">
          {items.map((product) => (
            <li key={product.slug} className="relative shrink-0">
              <ProductImage
                src={product.images[0]}
                alt={product.name}
                category={product.category}
                sizes="56px"
                className="h-12 w-12 rounded-lg border border-surface-border"
                iconClassName="h-6 w-6"
              />
              <button
                type="button"
                onClick={() => toggleCompare(product.slug)}
                aria-label={`حذف ${product.name} از مقایسه`}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-danger"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} className="h-2.5 w-2.5">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        <p className="hidden shrink-0 text-xs text-ink-muted sm:block">
          {toPersianDigits(items.length)} از {toPersianDigits(maxCompare)}
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={clearCompare}
            className="text-xs text-ink-muted transition-colors hover:text-danger"
          >
            پاک کردن
          </button>
          <Link
            href="/compare"
            className={cn(
              'flex h-10 items-center rounded-xl px-4 text-sm font-medium text-white transition-colors',
              items.length >= 2 ? 'bg-primary hover:bg-primary-light' : 'pointer-events-none bg-ink-subtle',
            )}
            aria-disabled={items.length < 2}
          >
            مقایسه کن
          </Link>
        </div>
      </div>
    </div>
  )
}
