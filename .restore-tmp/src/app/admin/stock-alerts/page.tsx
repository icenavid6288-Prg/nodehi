import Link from 'next/link'
import type { Metadata } from 'next'
import { ActionButton } from '@/components/admin/action-button'
import { prisma } from '@/lib/db'
import { getBrands, productIndex } from '@/lib/server/catalog'
import { buildMetadata } from '@/lib/seo'
import { canMutate, getStaffUser } from '@/lib/server/admin'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate, formatJalaliDateTime, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'هشدارهای موجودی',
  description: 'درخواست‌های اطلاع‌رسانی موجود شدن کالا در فروشگاه نودهی.',
  path: '/admin/stock-alerts',
  noIndex: true,
})

const TABS = [
  { label: 'در انتظار اطلاع‌رسانی', value: 'pending' },
  { label: 'اطلاع‌رسانی‌شده', value: 'notified' },
  { label: 'همه', value: '' },
]

interface AlertRow {
  id: string
  productSlug: string
  phone: string
  email: string | null
  notifiedAt: Date | null
  createdAt: Date
  userId: string | null
}

export default async function AdminStockAlertsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const staff = await getStaffUser()
  const readOnly = !staff || !canMutate(staff.role)

  const requested = searchParams.status ?? 'pending'
  const statusFilter = ['pending', 'notified', ''].includes(requested) ? requested : 'pending'

  const where =
    statusFilter === 'pending'
      ? { notifiedAt: null }
      : statusFilter === 'notified'
        ? { notifiedAt: { not: null } }
        : {}

  const [alerts, pendingCount, notifiedCount] = await Promise.all([
    prisma.stockAlert.findMany({ where, orderBy: { createdAt: 'desc' }, take: 60 }),
    prisma.stockAlert.count({ where: { notifiedAt: null } }),
    prisma.stockAlert.count({ where: { notifiedAt: { not: null } } }),
  ])

  // گروه‌بندی بر اساس محصول: تصمیم خرید و موجودی‌کردن در سطح کالا گرفته می‌شود،
  // نه در سطح هر درخواست. این دید، صف را به اولویت خرید تبدیل می‌کند.
  const groups = new Map<string, AlertRow[]>()
  for (const alert of alerts) {
    const list = groups.get(alert.productSlug)
    if (list) list.push(alert)
    else groups.set(alert.productSlug, [alert])
  }

  const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)

  // کالا و برند از دیتابیس — غیرفعال‌ها هم می‌آیند تا هشدار کالای حذف‌شده
  // از صف ناپدید نشود
  const [productBySlug, brands] = await Promise.all([
    productIndex([...groups.keys()], { includeInactive: true }),
    getBrands({ includeInactive: true }),
  ])
  const brandNames = Object.fromEntries(brands.map((brand) => [brand.slug, brand.name]))

  function countFor(value: string): number {
    if (value === 'pending') return pendingCount
    if (value === 'notified') return notifiedCount
    return pendingCount + notifiedCount
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">هشدارهای موجودی</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          کاربران وقتی کالایی ناموجود است شماره می‌گذارند تا خبرشان کنید. هر چه یک کالا درخواست بیشتری
          داشته باشد، اولویت خرید و شارژ انبار بالاتر است.
          {readOnly ? ' نقش شما فقط اجازه مشاهده دارد.' : ''}
        </p>
      </header>

      <nav aria-label="فیلتر وضعیت" className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = statusFilter === tab.value
          return (
            <Link
              key={tab.value || 'all'}
              href={tab.value ? `/admin/stock-alerts?status=${tab.value}` : '/admin/stock-alerts?status='}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/[0.06] text-primary'
                  : 'border-surface-border text-ink-muted hover:bg-surface-muted',
              )}
            >
              {tab.label}
              <span className="rounded-full bg-surface-muted px-1.5 py-px text-[10px] tabular-nums text-ink-subtle">
                {toPersianDigits(countFor(tab.value))}
              </span>
            </Link>
          )
        })}
      </nav>

      {ranked.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-14 text-center text-sm text-ink-muted">
          درخواستی در این وضعیت وجود ندارد.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {ranked.map(([slug, items]) => {
            const product = productBySlug[slug]
            return (
              <li key={slug} className="overflow-hidden rounded-2xl border border-surface-border bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border bg-surface-muted px-5 py-3.5">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-ink">
                      {product ? (
                        <Link href={`/product/${slug}`} className="hover:text-primary">
                          {product.name}
                        </Link>
                      ) : (
                        <span className="ltr-inline">{slug}</span>
                      )}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-ink-subtle">
                      {product ? `${brandNames[product.brand] ?? product.brand} — ` : ''}
                      {toPersianDigits(items.length)} درخواست
                    </p>
                  </div>

                  {product ? (
                    <Link
                      href={`/product/${slug}`}
                      className="rounded-lg border border-primary/30 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/[0.06]"
                    >
                      صفحه کالا
                    </Link>
                  ) : null}
                </div>

                <ul className="divide-y divide-surface-border">
                  {items.map((alert) => (
                    <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="ltr-inline text-xs font-medium tabular-nums text-ink">
                          {toPersianDigits(alert.phone)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-ink-subtle">
                          {alert.userId ? 'کاربر ثبت‌شده — ' : ''}
                          {alert.notifiedAt
                            ? `اطلاع داده شد: ${formatJalaliDateTime(alert.notifiedAt)}`
                            : `ثبت: ${formatJalaliDate(alert.createdAt)}`}
                          {alert.email ? (
                            <>
                              {' — '}
                              <span dir="ltr" className="ltr-inline">
                                {alert.email}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>

                      {readOnly ? null : alert.notifiedAt ? (
                        <ActionButton
                          url={`/api/admin/stock-alerts/${alert.id}`}
                          body={{ notified: false }}
                          label="برگرداندن به صف"
                          pendingLabel="در حال ثبت…"
                        />
                      ) : (
                        <ActionButton
                          url={`/api/admin/stock-alerts/${alert.id}`}
                          body={{ notified: true }}
                          label="اطلاع داده شد"
                          pendingLabel="در حال ثبت…"
                          tone="success"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-[11px] leading-5 text-ink-subtle">
        نکته: علامت‌زدن «اطلاع داده شد» فقط صف را پاک می‌کند و پیامکی نمی‌فرستد. ارسال واقعی از مسیر اتوماسیون
        (وب‌هوک موجودی) انجام می‌شود تا صف داخلی و سرویس پیامک از هم جدا بمانند.
      </p>
    </div>
  )
}
