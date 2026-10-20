/**
 * گزارش‌های فروش و انبار برای پنل مدیریت.
 *
 * چرا ماژول جدا؟ هم صفحهٔ `/admin/reports` و هم مسیر خروجی CSV از همین توابع
 * می‌خوانند. اگر محاسبهٔ «بازهٔ زمانی» در دو جا نوشته می‌شد، دیر یا زود یک جا
 * مرز روز (نیمه‌شب) را جور دیگری حساب می‌کرد و جمع صفحه با فایل CSV یکی نبود.
 */

import { prisma } from '@/lib/db'
import { orderStatusLabels } from '@/lib/data/orders'

const dayMs = 86_400_000

export interface DateRange {
  from: Date
  to: Date
  /** نام بازهٔ انتخابی برای نمایش */
  preset: string
  /** شناسهٔ بازه در URL */
  key: string
  /** آیا بازه سرتاسری است؟ (همه سفارش‌ها) */
  allTime: boolean
}

export const RANGE_PRESETS = [
  { key: '7d', label: '۷ روز اخیر', days: 7 },
  { key: '30d', label: '۳۰ روز اخیر', days: 30 },
  { key: '90d', label: '۳ ماه اخیر', days: 90 },
  { key: 'year', label: 'سال جاری', days: 365 },
] as const

/** آغاز روز محلی — مرز بازه نباید ساعت داشته باشد */
function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/**
 * تفسیر بازه از پارامترهای URL.
 *
 * ترتیب اولویت: بازهٔ دستی (`from`/`to`) → پیش‌تنظیم (`range`) → پیش‌فرض ۳۰ روز.
 * ورودی نامعتبر (تاریخ بی‌معنی یا از‌بعد‌بزرگ‌تر) رد می‌شود و به پیش‌فرض
 * برمی‌گردد تا صفحه هرگز با بازهٔ خالی یا معکوس رندر نشود.
 */
export function parseRange(searchParams: {
  from?: string
  to?: string
  range?: string
}): DateRange {
  const fromRaw = (searchParams.from ?? '').trim()
  const toRaw = (searchParams.to ?? '').trim()

  if (fromRaw && toRaw) {
    const from = new Date(fromRaw)
    const to = new Date(toRaw)
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      const start = startOfDay(from)
      const end = new Date(startOfDay(to).getTime() + dayMs - 1)
      if (end > start) {
        return {
          from: start,
          to: end,
          preset: 'بازهٔ انتخابی',
          key: 'custom',
          allTime: false,
        }
      }
    }
  }

  if (searchParams.range === 'all') {
    return {
      from: new Date(0),
      to: new Date(Date.now() + dayMs),
      preset: 'همه سفارش‌ها',
      key: 'all',
      allTime: true,
    }
  }

  const preset = RANGE_PRESETS.find((item) => item.key === searchParams.range) ?? RANGE_PRESETS[1]
  const to = new Date(startOfDay(new Date()).getTime() + dayMs - 1)
  const from = new Date(to.getTime() - preset.days * dayMs + 1)

  return { from, to, preset: preset.label, key: preset.key, allTime: false }
}

/** مقدار `YYYY-MM-DD` برای فیلدهای `type="date"` */
export function toInputDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export interface ReportDay {
  date: string
  orders: number
  revenue: number
}

export interface ReportCount {
  key: string
  label: string
  count: number
  amount: number
}

export interface ReportProduct {
  slug: string
  name: string
  quantity: number
  revenue: number
}

export interface SalesReport {
  range: DateRange
  orders: number
  revenue: number
  average: number
  discount: number
  shipping: number
  unpaidOnline: number
  couponOrders: number
  days: ReportDay[]
  statuses: ReportCount[]
  payments: ReportCount[]
  products: ReportProduct[]
  newCustomers: number
}

/** همهٔ آمار گزارش در یک گذر روی سفارش‌های بازه */
export async function getSalesReport(range: DateRange): Promise<SalesReport> {
  const where = {
    createdAt: { gte: range.from, lte: range.to },
    status: { not: 'cancelled' },
  }

  const [orders, items, newCustomers] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        createdAt: true,
        total: true,
        discount: true,
        shipping: true,
        status: true,
        paymentMethod: true,
        couponCode: true,
      },
    }),
    prisma.orderItem.groupBy({
      by: ['productSlug', 'productName'],
      where: { order: where },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
    prisma.user.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
  ])

  // برای بازهٔ بلند (مثل «همه سفارش‌ها») سطل روزانه بی‌معنی است؛ سقف ۱۲۰ روز هم
  // گذاشته شده تا گزارش یک‌ساله با ۳۶۵ ردیف، جدول و فایل را بی‌فایده نکند.
  // نکته: در این حالت جمع‌های کل همچنان از همهٔ سفارش‌های بازه محاسبه می‌شوند.
  const dayCount = Math.ceil((range.to.getTime() - range.from.getTime()) / dayMs)
  const useDaily = !range.allTime && dayCount <= 120
  const dayBuckets = new Map<string, ReportDay>()
  for (let index = 0; index < (useDaily ? dayCount : 0); index += 1) {
    const date = new Date(range.from.getTime() + index * dayMs)
    const key = toInputDate(date)
    dayBuckets.set(key, { date: key, orders: 0, revenue: 0 })
  }

  const statusMap = new Map<string, ReportCount>()
  const paymentMap = new Map<string, ReportCount>()
  let revenue = 0
  let discount = 0
  let shipping = 0
  let unpaidOnline = 0
  let couponOrders = 0

  for (const order of orders) {
    revenue += order.total
    discount += order.discount
    shipping += order.shipping
    if (order.couponCode) couponOrders += 1
    if (order.paymentMethod === 'online' && order.status === 'pending') unpaidOnline += 1

    const key = toInputDate(order.createdAt)
    const bucket = dayBuckets.get(key)
    if (bucket) {
      bucket.orders += 1
      bucket.revenue += order.total
    }

    const statusEntry = statusMap.get(order.status) ?? {
      key: order.status,
      label: orderStatusLabels[order.status as keyof typeof orderStatusLabels] ?? order.status,
      count: 0,
      amount: 0,
    }
    statusEntry.count += 1
    statusEntry.amount += order.total
    statusMap.set(order.status, statusEntry)

    const paymentEntry = paymentMap.get(order.paymentMethod) ?? {
      key: order.paymentMethod,
      label: paymentLabels[order.paymentMethod] ?? order.paymentMethod,
      count: 0,
      amount: 0,
    }
    paymentEntry.count += 1
    paymentEntry.amount += order.total
    paymentMap.set(order.paymentMethod, paymentEntry)
  }

  return {
    range,
    orders: orders.length,
    revenue,
    average: orders.length > 0 ? Math.round(revenue / orders.length) : 0,
    discount,
    shipping,
    unpaidOnline,
    couponOrders,
    days: [...dayBuckets.values()],
    statuses: [...statusMap.values()].sort((a, b) => b.count - a.count),
    payments: [...paymentMap.values()].sort((a, b) => b.count - a.count),
    products: items.map((item) => ({
      slug: item.productSlug,
      name: item.productName,
      quantity: item._sum.quantity ?? 0,
      revenue: item._sum.lineTotal ?? 0,
    })),
    newCustomers,
  }
}

const paymentLabels: Record<string, string> = {
  online: 'پرداخت آنلاین',
  cod: 'پرداخت درب منزل',
  installment: 'اقساطی',
}

// ─────────────────────────────────────────────────────────────────
// خروجی CSV
// ─────────────────────────────────────────────────────────────────

/** یک خانهٔ CSV با فرار دادن کوتیشن، کاما و خط جدید */
function cell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function row(values: unknown[]): string {
  return values.map(cell).join(',')
}

/** بایت‌های آغازین UTF-8 تا اکسل فارسی، متن را درست بخواند (نه «Ù…Ø§»). */
export const CSV_BOM = '\uFEFF'

function formatJalali(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(value.getTime())) return ''
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

/** گزارش جمعی: خلاصه + روزانه + وضعیت + روش پرداخت + پرفروش‌ها */
export function buildSalesCsv(report: SalesReport): string {
  const lines: string[] = []
  lines.push(row(['گزارش فروش نودهی']))
  lines.push(row(['بازه', report.range.preset]))
  lines.push(row(['از', formatJalali(report.range.from), toInputDate(report.range.from)]))
  lines.push(row(['تا', formatJalali(report.range.to), toInputDate(report.range.to)]))
  lines.push('')

  lines.push(row(['خلاصه']))
  lines.push(row(['تعداد سفارش', 'درآمد (تومان)', 'میانگین سبد (تومان)', 'جمع تخفیف (تومان)', 'جمع ارسال (تومان)']))
  lines.push(
    row([report.orders, report.revenue, report.average, report.discount, report.shipping]),
  )
  lines.push(
    row(['سفارش آنلاین پرداخت‌نشده', report.unpaidOnline, 'سفارش با کد تخفیف', report.couponOrders, 'مشتری تازه', report.newCustomers]),
  )
  lines.push('')

  if (report.days.length > 0) {
    lines.push(row(['تفکیک روزانه']))
    lines.push(row(['تاریخ شمسی', 'تاریخ میلادی', 'تعداد سفارش', 'درآمد (تومان)']))
    for (const day of report.days) {
      lines.push(row([formatJalali(day.date), day.date, day.orders, day.revenue]))
    }
    lines.push('')
  }

  lines.push(row(['وضعیت سفارش‌ها']))
  lines.push(row(['وضعیت', 'تعداد', 'مبلغ (تومان)']))
  for (const entry of report.statuses) {
    lines.push(row([entry.label, entry.count, entry.amount]))
  }
  lines.push('')

  lines.push(row(['روش پرداخت']))
  lines.push(row(['روش', 'تعداد', 'مبلغ (تومان)']))
  for (const entry of report.payments) {
    lines.push(row([entry.label, entry.count, entry.amount]))
  }
  lines.push('')

  lines.push(row(['پرفروش‌ترین کالاها']))
  lines.push(row(['نام کالا', 'نامک', 'تعداد فروش', 'مبلغ (تومان)']))
  for (const product of report.products) {
    lines.push(row([product.name, product.slug, product.quantity, product.revenue]))
  }

  return CSV_BOM + lines.join('\r\n') + '\r\n'
}

/** سطح جزئیات: یک ردیف برای هر سفارش (مناسب حسابداری) */
export async function buildOrdersCsv(range: DateRange): Promise<string> {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
    orderBy: { createdAt: 'asc' },
    include: { items: { select: { productName: true, quantity: true } } },
  })

  const lines: string[] = []
  lines.push(
    row([
      'شماره سفارش',
      'تاریخ شمسی',
      'تاریخ میلادی',
      'نام مشتری',
      'شماره همراه',
      'وضعیت',
      'روش پرداخت',
      'کد تخفیف',
      'تعداد اقلام',
      'جمع کالا (تومان)',
      'تخفیف (تومان)',
      'ارسال (تومان)',
      'مبلغ نهایی (تومان)',
      'کد رهگیری',
      'اقلام',
    ]),
  )

  for (const order of orders) {
    lines.push(
      row([
        order.orderNumber,
        formatJalali(order.createdAt),
        order.createdAt.toISOString(),
        [order.customerFirstName, order.customerLastName].filter(Boolean).join(' '),
        order.customerPhone,
        orderStatusLabels[order.status as keyof typeof orderStatusLabels] ?? order.status,
        paymentLabels[order.paymentMethod] ?? order.paymentMethod,
        order.couponCode ?? '',
        order.items.length,
        order.subtotal,
        order.discount,
        order.shipping,
        order.total,
        order.trackingCode ?? '',
        // ارقام لاتین در CSV می‌مانند تا اکسل بتواند آن‌ها را عدد بخواند
        order.items.map((item) => `${item.productName} x${item.quantity}`).join(' | '),
      ]),
    )
  }

  return CSV_BOM + lines.join('\r\n') + '\r\n'
}

/** سطح انبار: موجودی کالاها بر پایهٔ آستانهٔ هشدار پنل */
export async function buildInventoryCsv(): Promise<string> {
  const { getCatalog } = await import('@/lib/server/catalog')
  const { getLowStockReport } = await import('@/lib/server/admin')
  const { products } = await getCatalog()
  const lowStock = await getLowStockReport()

  const lines: string[] = []
  lines.push(row(['گزارش انبار نودهی']))
  lines.push(row(['آستانه هشدار موجودی', lowStock.threshold]))
  lines.push(row(['کالاهای ناموجود', lowStock.outOfStock]))
  lines.push(row(['تعداد کالاها', products.length]))
  lines.push('')
  lines.push(row(['نام کالا', 'نامک', 'برند', 'قیمت (تومان)', 'موجودی', 'وضعیت']))
  for (const product of [...products].sort((a, b) => a.stock - b.stock)) {
    lines.push(
      row([
        product.name,
        product.slug,
        product.brand,
        product.price,
        product.stock,
        product.stock <= 0
          ? 'ناموجود'
          : product.stock <= lowStock.threshold
            ? 'کم‌موجود'
            : 'موجود',
      ]),
    )
  }

  return CSV_BOM + lines.join('\r\n') + '\r\n'
}
