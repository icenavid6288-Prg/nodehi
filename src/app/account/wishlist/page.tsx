'use client'

import { useStore } from '@/components/providers/store-provider'
import { ProductGrid } from '@/components/product/product-grid'
import { useProductsBySlugs } from '@/components/providers/product-lookup'
import { ButtonLink } from '@/components/ui/button'
import { toPersianDigits } from '@/lib/utils/format'

export default function WishlistPage() {
  const { wishlist, hydrated } = useStore()

  // کالاها از دیتابیس می‌آیند؛ کالایی که در پنل غیرفعال شده باشد خودبه‌خود
  // از این فهرست می‌افتد
  const { products: items, loading: productsLoading } = useProductsBySlugs(wishlist)

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">علاقه‌مندی‌ها</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          کالاهایی که ذخیره کرده‌اید در این بخش نگه‌داری می‌شوند. اگر قیمت یا موجودی یکی از آن‌ها تغییر کند،
          می‌توانیم با پیامک به شما اطلاع دهیم.
        </p>
      </header>

      {!hydrated || productsLoading ? (
        <div className="rounded-2xl border border-surface-border bg-white p-12 text-center text-sm text-ink-muted">
          در حال بارگذاری…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-surface-border bg-white px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-ink-subtle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
              <path d="M12 20s-7-4.5-7-9.5A4 4 0 0112 8a4 4 0 017 2.5c0 5-7 9.5-7 9.5z" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-ink">فهرست علاقه‌مندی‌های شما خالی است</p>
            <p className="mt-1.5 max-w-md text-xs leading-6 text-ink-muted">
              با کلیک روی آیکون قلب در کارت محصولات، آن‌ها را برای بررسی بعدی ذخیره کنید.
            </p>
          </div>
          <ButtonLink href="/shop" variant="primary" size="sm">
            مشاهده محصولات
          </ButtonLink>
        </div>
      ) : (
        <>
          <p className="text-xs text-ink-muted">{toPersianDigits(items.length)} کالا ذخیره شده است.</p>
          <ProductGrid products={items} />
        </>
      )}
    </div>
  )
}
