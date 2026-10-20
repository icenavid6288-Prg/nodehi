import { describe, expect, it } from 'vitest'
import {
  buildSalesCsv,
  CSV_BOM,
  parseRange,
  toInputDate,
  type SalesReport,
} from '@/lib/server/reports'

const dayMs = 86_400_000

describe('parseRange', () => {
  it('پیش‌فرض ۳۰ روز است وقتی هیچ پارامتری نیامده', () => {
    const range = parseRange({})
    expect(range.key).toBe('30d')
    expect(range.allTime).toBe(false)
    const days = Math.round((range.to.getTime() - range.from.getTime()) / dayMs)
    expect(days).toBe(30)
  })

  it('پیش‌تنظیم‌ها را می‌شناسد و روزها را درست می‌شمارد', () => {
    expect(parseRange({ range: '7d' }).key).toBe('7d')
    expect(parseRange({ range: '90d' }).key).toBe('90d')
    const seven = parseRange({ range: '7d' })
    expect(Math.round((seven.to.getTime() - seven.from.getTime()) / dayMs)).toBe(7)
  })

  it('پیش‌تنظیم ناشناخته را نادیده می‌گیرد و به پیش‌فرض برمی‌گردد', () => {
    expect(parseRange({ range: '۹۹۹' }).key).toBe('30d')
    expect(parseRange({ range: '; DROP TABLE' }).key).toBe('30d')
  })

  it('بازهٔ دستی بر پیش‌تنظیم اولویت دارد', () => {
    const range = parseRange({ range: '7d', from: '2026-01-01', to: '2026-01-31' })
    expect(range.key).toBe('custom')
    expect(toInputDate(range.from)).toBe('2026-01-01')
    expect(toInputDate(range.to)).toBe('2026-01-31')
  })

  it('بازهٔ معکوس (تا قبل از از) رد می‌شود و به پیش‌فرض برمی‌گردد', () => {
    const range = parseRange({ from: '2026-05-01', to: '2026-04-01' })
    expect(range.key).toBe('30d')
  })

  it('تاریخ بی‌معنی باعث خطا نمی‌شود', () => {
    const range = parseRange({ from: 'نه‌تاریخ', to: 'هم‌چنین' })
    expect(range.key).toBe('30d')
    expect(Number.isNaN(range.from.getTime())).toBe(false)
  })

  it('بازهٔ سرتاسری را می‌شناسد', () => {
    const range = parseRange({ range: 'all' })
    expect(range.allTime).toBe(true)
    expect(range.key).toBe('all')
  })

  it('مرز بازه ساعت ندارد و تا پایان روز کشیده می‌شود', () => {
    const range = parseRange({ from: '2026-02-10', to: '2026-02-12' })
    expect([range.from.getHours(), range.from.getMinutes()]).toEqual([0, 0])
    expect(range.to.getHours()).toBe(23)
    expect(range.to.getMinutes()).toBe(59)
  })
})

const baseReport: SalesReport = {
  range: {
    from: new Date(2026, 0, 1),
    to: new Date(2026, 0, 31, 23, 59, 59),
    preset: 'بازهٔ انتخابی',
    key: 'custom',
    allTime: false,
  },
  orders: 2,
  revenue: 1_500_000,
  average: 750_000,
  discount: 100_000,
  shipping: 50_000,
  unpaidOnline: 1,
  couponOrders: 1,
  days: [{ date: '2026-01-02', orders: 2, revenue: 1_500_000 }],
  statuses: [{ key: 'paid', label: 'پرداخت‌شده', count: 2, amount: 1_500_000 }],
  payments: [{ key: 'online', label: 'پرداخت آنلاین', count: 1, amount: 900_000 }],
  products: [
    { slug: 'yakhchal, test', name: 'یخچال «ساید», ۲۸ فوت', quantity: 3, revenue: 900_000 },
  ],
  newCustomers: 1,
}

describe('buildSalesCsv', () => {
  it('با BOM شروع می‌شود تا اکسل فارسی درست بخواند', () => {
    const csv = buildSalesCsv(baseReport)
    expect(csv.startsWith(CSV_BOM)).toBe(true)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('کوتیشن، کاما و کوتیشن تکراری را فرار می‌دهد', () => {
    const csv = buildSalesCsv(baseReport)
    // نام کالا شامل کاما و کوتیشن است — باید داخل کوتیشن دوتایی بسته شود
    expect(csv).toContain('"یخچال «ساید», ۲۸ فوت"')
    expect(csv.includes('\u0000')).toBe(false)
  })

  it('همهٔ بخش‌های گزارش را می‌نویسد', () => {
    const csv = buildSalesCsv(baseReport)
    for (const section of ['خلاصه', 'تفکیک روزانه', 'وضعیت سفارش‌ها', 'روش پرداخت', 'پرفروش‌ترین کالاها']) {
      expect(csv).toContain(section)
    }
  })

  it('عددهای کلیدی گزارش را بدون قالب‌بندی فارسی می‌نویسد', () => {
    const csv = buildSalesCsv(baseReport)
    // درآمد باید رقم لاتین باشد تا اکسل آن را عدد بخواند
    expect(csv).toContain('1500000')
    expect(csv.includes('۱٬۵۰۰٬۰۰۰')).toBe(false)
  })

  it('برای گزارش بدون روز، بخش تفکیک روزانه را حذف می‌کند', () => {
    const csv = buildSalesCsv({ ...baseReport, days: [] })
    expect(csv).toContain('خلاصه')
    expect(csv.includes('تفکیک روزانه')).toBe(false)
  })
})
