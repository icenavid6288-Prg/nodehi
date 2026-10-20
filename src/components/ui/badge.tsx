import { cn } from '@/lib/utils/cn'
import { discountPercent, toPersianDigits } from '@/lib/utils/format'

type Tone = 'neutral' | 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'warning'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-ink-muted border-surface-border',
  primary: 'bg-primary/[0.08] text-primary border-primary/15',
  secondary: 'bg-secondary/[0.12] text-secondary-dark border-secondary/25',
  accent: 'bg-accent/[0.12] text-accent-dark border-accent/25',
  success: 'bg-success/10 text-success border-success/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

/** برچسب درصد تخفیف — فقط در صورت وجود تخفیف رندر می‌شود */
export function DiscountBadge({ price, compareAtPrice }: { price: number; compareAtPrice: number | null }) {
  const percent = discountPercent(price, compareAtPrice)
  if (!percent) return null
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white shadow-sm">
      {toPersianDigits(percent)}٪ تخفیف
    </span>
  )
}
