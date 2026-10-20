import { cn } from '@/lib/utils/cn'
import type { SpecItem } from '@/types'

const groupLabels: Record<SpecItem['group'], string> = {
  general: 'مشخصات عمومی',
  technical: 'مشخصات فنی',
  dimensions: 'ابعاد و وزن',
  energy: 'مصرف انرژی',
}

const groupOrder: SpecItem['group'][] = ['general', 'technical', 'dimensions', 'energy']

/** جدول مشخصات فنی گروه‌بندی‌شده — با ردیف‌های راه‌راه برای خوانایی */
export function SpecTable({ specs, className }: { specs: SpecItem[]; className?: string }) {
  if (specs.length === 0) {
    return <p className="text-sm text-ink-muted">مشخصات فنی این محصول به‌زودی تکمیل می‌شود.</p>
  }

  const grouped = groupOrder
    .map((group) => ({ group, items: specs.filter((spec) => spec.group === group) }))
    .filter((entry) => entry.items.length > 0)

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {grouped.map(({ group, items }) => (
        <section key={group}>
          <h3 className="mb-2.5 text-sm font-bold text-primary">{groupLabels[group]}</h3>
          <dl className="overflow-hidden rounded-xl border border-surface-border">
            {items.map((spec, index) => (
              <div
                key={`${spec.label}-${index}`}
                className={cn(
                  'flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-4',
                  index % 2 === 0 ? 'bg-white' : 'bg-surface-muted',
                )}
              >
                <dt className="w-full shrink-0 text-ink-muted sm:w-52">{spec.label}</dt>
                <dd className="font-medium text-ink">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
