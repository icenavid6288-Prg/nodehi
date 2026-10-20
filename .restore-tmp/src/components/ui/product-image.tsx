import Image from 'next/image'
import { ApplianceIcon } from '@/components/ui/appliance-icon'
import { cn } from '@/lib/utils/cn'
import type { CategorySlug } from '@/types'

/**
 * پس‌زمینه‌های گرادیانی هر دسته.
 * تا زمانی که تصاویر واقعی محصولات از مخزن آروان/لیارا بارگذاری نشوند، این
 * جانگهدارها یک نمای یکدست و برندشده ارائه می‌دهند و از تصویر شکسته جلوگیری
 * می‌کنند. پس از آماده شدن عکس‌ها، فقط فیلد images محصول پر می‌شود.
 */
const gradients: Record<CategorySlug, string> = {
  refrigerator: 'from-sky-50 via-white to-primary/[0.08] text-primary/45',
  washer: 'from-teal-50 via-white to-secondary/10 text-secondary/50',
  dishwasher: 'from-indigo-50 via-white to-primary/[0.08] text-indigo-400/50',
  tv: 'from-slate-100 via-white to-primary/10 text-slate-400/60',
  'air-conditioner': 'from-cyan-50 via-white to-secondary/10 text-cyan-500/45',
  vacuum: 'from-orange-50 via-white to-accent/10 text-accent/40',
  oven: 'from-amber-50 via-white to-accent/[0.08] text-amber-500/45',
  'small-appliance': 'from-rose-50 via-white to-accent/[0.08] text-rose-400/45',
}

export function ProductImage({
  src,
  alt,
  category,
  className,
  sizes = '(max-width: 768px) 50vw, 25vw',
  priority = false,
  iconClassName,
}: {
  src?: string
  alt: string
  category: CategorySlug
  className?: string
  sizes?: string
  priority?: boolean
  iconClassName?: string
}) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br',
        gradients[category],
        className,
      )}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <ApplianceIcon category={category} className={cn('h-16 w-16', iconClassName)} />
      )}
    </div>
  )
}
