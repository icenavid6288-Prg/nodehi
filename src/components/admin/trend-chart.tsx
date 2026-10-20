import { formatJalaliDate, formatPrice, formatPriceShort, toPersianDigits } from '@/lib/utils/format'
import type { DailyPoint } from '@/lib/server/admin'

/**
 * نمودار ستونی درآمد ۳۰ روز گذشته — SVG درون‌خطی و بدون هیچ کتابخانهٔ نمودار.
 *
 * چرا دست‌ساز؟ پروژه عمداً بدون وابستگی سنگین است (تقویم شمسی، آیکون و کاروسل
 * هم همین‌طور نوشته شده‌اند). یک نمودار سادهٔ ستونی با ۳۰ ستون، باندل‌ساز
 * صدها کیلوبایتی را توجیه نمی‌کند.
 *
 * ترتیب زمانی چپ→راست است (قدیم‌ترین روز سمت چپ) چون خواندنِ «گذشته به حال»
 * در نمودار برای کاربر فارسی‌زبان هم طبیعی است؛ برچسب تاریخ دو سر محور، ابهام
 * جهت را برمی‌دارد.
 */
export function TrendChart({ days, maxRevenue }: { days: DailyPoint[]; maxRevenue: number }) {
  if (days.length === 0) {
    return (
      <p className="rounded-xl bg-surface-muted p-4 text-xs text-ink-muted">
        داده‌ای برای نمودار وجود ندارد.
      </p>
    )
  }

  const width = 720
  const height = 190
  const padding = { top: 12, right: 8, bottom: 26, left: 8 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const scaleMax = maxRevenue > 0 ? maxRevenue : 1
  const slot = plotWidth / days.length
  const barWidth = Math.max(4, slot * 0.62)

  const busiest = [...days].sort((a, b) => b.revenue - a.revenue).slice(0, 3)
  const totalRevenue = days.reduce((sum, day) => sum + day.revenue, 0)
  // `formatPrice(0)` می‌شود «تماس بگیرید» — در گزارش مالی این متن گمراه‌کننده است
  const totalLabel = totalRevenue > 0 ? formatPrice(totalRevenue) : '۰ تومان'

  return (
    <figure className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-48 w-full"
        role="img"
        aria-label={`نمودار درآمد ${toPersianDigits(days.length)} روز گذشته؛ مجموع ${totalLabel}`}
      >
        {/* خطوط راهنما و مقیاس عمودی */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + plotHeight * (1 - ratio)
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                className={ratio === 0 ? 'stroke-surface-border' : 'stroke-surface-border/60'}
                strokeDasharray={ratio === 0 ? undefined : '3 4'}
                strokeWidth={1}
              />
              {ratio > 0 && scaleMax > 1 ? (
                <text
                  x={width - padding.right}
                  y={y - 3}
                  textAnchor="end"
                  className="fill-ink-subtle text-[9px]"
                >
                  {formatPriceShort(Math.round(scaleMax * ratio))}
                </text>
              ) : null}
            </g>
          )
        })}

        {/* ستون‌ها */}
        {days.map((day, index) => {
          const barHeight = day.revenue > 0 ? Math.max(2, (day.revenue / scaleMax) * plotHeight) : 0
          const x = padding.left + index * slot + (slot - barWidth) / 2
          const y = padding.top + plotHeight - barHeight
          return (
            <g key={day.date}>
              <title>
                {`${formatJalaliDate(day.date)} — ${day.revenue > 0 ? formatPrice(day.revenue) : 'بدون فروش'}${day.orders > 0 ? ` — ${toPersianDigits(day.orders)} سفارش` : ''}`}
              </title>
              {day.revenue > 0 ? (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={2}
                  className="fill-primary transition-opacity hover:opacity-80"
                />
              ) : (
                <rect
                  x={x}
                  y={padding.top + plotHeight - 2}
                  width={barWidth}
                  height={2}
                  rx={1}
                  className="fill-surface-border"
                />
              )}
            </g>
          )
        })}

        {/* برچسب دو سر محور — جهت زمان را صریح می‌کند */}
        <text x={padding.left} y={height - 8} className="fill-ink-subtle text-[9px]">
          {formatJalaliDate(days[0].date)}
        </text>
        <text x={width - padding.right} y={height - 8} textAnchor="end" className="fill-ink-subtle text-[9px]">
          {formatJalaliDate(days[days.length - 1].date)}
        </text>
      </svg>

      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-subtle">
        <span>
          مجموع ۳۰ روز: <strong className="text-ink">{totalLabel}</strong>
        </span>
        {busiest[0] && busiest[0].revenue > 0 ? (
          <span>
            پرترین روزها:{' '}
            {busiest
              .map((day) => `${formatJalaliDate(day.date)} (${formatPriceShort(day.revenue)} تومان)`)
              .join('، ')}
          </span>
        ) : null}
      </figcaption>
    </figure>
  )
}
