import Link from 'next/link'
import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { getLowStockReport } from '@/lib/server/admin'
import {
  getSalesReport,
  parseRange,
  RANGE_PRESETS,
  toInputDate,
} from '@/lib/server/reports'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate, formatPrice, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'گزارش فروش و انبار',
  description: 'گزارش فروش نودهی با بازهٔ زمانی دلخواه، تفکیک روزانه و خروجی CSV.',
  path: '/admin/reports',
  noIndex: true,
})

/** گزارش جمعی + انبار، با انتخاب بازه و خروجی CSV */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; range?: string }
}) {
  const range = parseRange(searchParams)
  const [report, lowStock] = await Promise.all([getSalesReport(range), getLowStockReport()])

  const maxDayRevenue = report.days.reduce((max, day) => Math.max(max, day.revenue), 0)
  const exportQuery = new URLSearchParams()
  if (range.key === 'custom') {
    exportQuery.set('from', toInputDate(range.from))
    exportQuery.set('to', toInputDate(range.to))
  } else if (range.key === 'all') {
    exportQuery.set('range', 'all')
  } else {
    exportQuery.set('range', range.key)
  }
  const exportBase = `/api/admin/reports/export?${exportQuery.toString()}`

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-ink">گزارش فروش و انبار</h1>
            <p className="mt-2 text-sm leading-7 text-ink-muted">
              بازهٔ فعلی: <strong className="text-ink">{range.preset}</strong> — از{' '}
              {formatJalaliDate(range.allTime ? new Date() : range.from)} تا{' '}
              {formatJalaliDate(range.to)}.
              {!range.allTime && report.days.length === 0
                ? ' بازه بیش از ۱۲۰ روز است، پس تفکیک روزانه نمایش داده نمی‌شود؛ جمع‌ها کامل محاسبه شده‌اند.'
                : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportLink href={`${exportBase}&type=sales`} label="گزارش جمعی (CSV)" />
            <ExportLink href={`${exportBase}&type=orders`} label="سفارش‌ها (CSV)" primary />
            <ExportLink href={`${exportBase}&type=inventory`} label="انبار (CSV)" />
          </div>
        </div>
      </header>

      {/* انتخاب بازه */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <h2 className="text-sm font-bold text-ink">بازهٔ زمانی</h2>
        <nav aria-label="بازه‌های آماده" className="mt-3 flex flex-wrap gap-2">
          {RANGE_PRESETS.map((preset) => (
            <Link
              key={preset.key}
              href={`/admin/reports?range=${preset.key}`}
              aria-current={range.key === preset.key ? 'page' : undefined}
              className={cn(
                'rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors',
                range.key === preset.key
                  ? 'border-primary bg-primary/[0.06] text-primary'
                  : 'border-surface-border text-ink-muted hover:bg-surface-muted',
              )}
            >
              {preset.label}
            </Link>
          ))}
          <Link
            href="/admin/reports?range=all"
            aria-current={range.key === 'all' ? 'page' : undefined}
            className={cn(
              'rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors',
              range.key === 'all'
                ? 'border-primary bg-primary/[0.06] text-primary'
                : 'border-surface-border text-ink-muted hover:bg-surface-muted',
            )}
          >
            همه سفارش‌ها
          </Link>
        </nav>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink-muted">از تاریخ (میلادی)</span>
            <input
              type="date"
              name="from"
              defaultValue={range.allTime ? '' : toInputDate(range.from)}
              className="h-11 rounded-xl border border-surface-border bg-white px-3.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink-muted">تا تاریخ (میلادی)</span>
            <input
              type="date"
              name="to"
              defaultValue={range.allTime ? '' : toInputDate(range.to)}
              className="h-11 rounded-xl border border-surface-border bg-white px-3.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
          >
            اعمال بازه
          </button>
          {range.key === 'custom' ? (
            <Link
              href="/admin/reports"
              className="flex h-11 items-center rounded-xl border border-surface-border px-4 text-sm text-ink-muted transition-colors hover:bg-surface-muted"
            >
              بازگشت به ۳۰ روز اخیر
            </Link>
          ) : null}
        </form>
        <p className="mt-2 text-[11px] leading-5 text-ink-subtle">
          فیلدهای تاریخ میلادی‌اند (استاندارد مرورگر)؛ معادل شمسی بازهٔ فعال در بالای صفحه نوشته شده است.
          بازهٔ دستی بر پیش‌تنظیم‌ها اولویت دارد.
        </p>
      </section>

      {/* شاخص‌های بازه */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="درآمد بازه" value={money(report.revenue)} hint="سفارش‌های لغوشده حساب نشده‌اند" tone="primary" />
        <Stat label="تعداد سفارش" value={toPersianDigits(report.orders)} hint={range.preset} />
        <Stat
          label="میانگین سبد"
          value={report.average > 0 ? formatPrice(report.average) : '—'}
          hint="میانگین مبلغ هر سفارش در این بازه"
        />
        <Stat
          label="تخفیف داده‌شده"
          value={money(report.discount)}
          hint={`${toPersianDigits(report.couponOrders)} سفارش با کد تخفیف`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="هزینهٔ ارسال دریافت‌شده" value={money(report.shipping)} hint="جمع هزینه ارسال سفارش‌های بازه" />
        <Stat
          label="آنلاین پرداخت‌نشده"
          value={toPersianDigits(report.unpaidOnline)}
          hint="سفارش‌های پرداخت آنلاین در وضعیت «در انتظار پرداخت»"
        />
        <Stat label="مشتری تازه" value={toPersianDigits(report.newCustomers)} hint="ثبت‌نام در همین بازه" />
        <Stat
          label="کالاهای کم‌موجود"
          value={toPersianDigits(lowStock.items.length)}
          hint={`آستانه ${toPersianDigits(lowStock.threshold)} عدد — ${toPersianDigits(lowStock.outOfStock)} کالا ناموجود`}
        />
      </div>

      {/* تفکیک روزانه */}
      {report.days.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
          <h2 className="border-b border-surface-border px-5 py-3.5 text-sm font-bold text-ink">
            تفکیک روزانه ({toPersianDigits(report.days.length)} روز)
          </h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-surface-muted text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">تاریخ</th>
                  <th className="px-4 py-3 font-medium">سفارش</th>
                  <th className="px-4 py-3 font-medium">درآمد</th>
                  <th className="px-4 py-3 font-medium">سهم از بیشترین روز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {[...report.days].reverse().map((day) => {
                  const percent = maxDayRevenue > 0 ? Math.round((day.revenue / maxDayRevenue) * 100) : 0
                  return (
                    <tr key={day.date} className="hover:bg-surface-muted/60">
                      <td className="whitespace-nowrap px-4 py-2.5 text-ink">
                        {formatJalaliDate(day.date)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-ink-muted">
                        {toPersianDigits(day.orders)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums font-medium text-ink">
                        {day.revenue > 0 ? formatPrice(day.revenue) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted">
                            <span
                              className="block h-full rounded-full bg-primary"
                              style={{ width: `${percent}%` }}
                            />
                          </span>
                          <span className="text-[10px] tabular-nums text-ink-subtle">
                            {toPersianDigits(percent)}٪
                          </span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Breakdown
          title="وضعیت سفارش‌ها"
          rows={report.statuses.map((entry) => ({
            label: entry.label,
            count: entry.count,
            amount: entry.amount,
          }))}
          empty="در این بازه سفارشی ثبت نشده است."
        />
        <Breakdown
          title="روش پرداخت"
          rows={report.payments.map((entry) => ({
            label: entry.label,
            count: entry.count,
            amount: entry.amount,
          }))}
          empty="در این بازه سفارشی ثبت نشده است."
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
        <h2 className="border-b border-surface-border px-5 py-3.5 text-sm font-bold text-ink">
          پرفروش‌ترین کالاهای این بازه
        </h2>
        {report.products.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-ink-muted">
            در این بازه فروشی ثبت نشده است.
          </p>
        ) : (
          <table className="w-full text-right text-xs">
            <thead className="bg-surface-muted text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">کالا</th>
                <th className="px-4 py-3 font-medium">تعداد فروش</th>
                <th className="px-4 py-3 font-medium">درآمد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {report.products.map((product) => (
                <tr key={product.slug} className="hover:bg-surface-muted/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/product/${product.slug}`} className="text-ink hover:text-primary">
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-muted">
                    {toPersianDigits(product.quantity)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-medium text-ink">
                    {formatPrice(product.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-[11px] leading-5 text-ink-subtle">
        خروجی CSV با بایت‌های BOM ساخته می‌شود تا اکسل فارسی متن را درست بخواند. «سفارش‌ها» یک ردیف برای
        هر سفارش است (مناسب حسابداری) و «انبار» موجودی همهٔ کالاها را با وضعیت موجود/کم‌موجود/ناموجود
        می‌دهد.
      </p>
    </div>
  )
}

function ExportLink({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <a
      href={href}
      className={cn(
        'rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors',
        primary
          ? 'border-primary bg-primary text-white hover:bg-primary-dark'
          : 'border-surface-border text-ink-muted hover:border-primary/30 hover:text-primary',
      )}
    >
      {label}
    </a>
  )
}

function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint: string
  tone?: 'default' | 'primary'
}) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={cn(
          'mt-2 text-lg font-extrabold tabular-nums',
          tone === 'primary' ? 'text-primary' : 'text-ink',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-ink-subtle">{hint}</p>
    </div>
  )
}

function Breakdown({
  title,
  rows,
  empty,
}: {
  title: string
  rows: { label: string; count: number; amount: number }[]
  empty: string
}) {
  const total = rows.reduce((sum, entry) => sum + entry.count, 0)
  return (
    <section className="rounded-2xl border border-surface-border bg-white p-5">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl bg-surface-muted p-4 text-xs text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((entry) => {
            const percent = total > 0 ? Math.round((entry.count / total) * 100) : 0
            return (
              <li key={entry.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">{entry.label}</span>
                  <span className="tabular-nums text-ink">
                    {toPersianDigits(entry.count)} سفارش — <strong>{formatPrice(entry.amount)}</strong>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <span className="block h-full rounded-full bg-secondary" style={{ width: `${percent}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** `formatPrice(0)` متن «تماس بگیرید» می‌دهد؛ در گزارش مالی صفر باید صفر بماند */
function money(value: number): string {
  return value > 0 ? formatPrice(value) : '۰ تومان'
}
