import { describe, expect, it } from 'vitest'
import {
  discountPercent,
  formatNumber,
  formatPrice,
  formatJalaliDate,
  formatRelativeTime,
  normalizeSearchText,
  ratingToStars,
  toLatinDigits,
  toPersianDigits,
} from '@/lib/utils/format'

describe('تبدیل ارقام', () => {
  it('ارقام لاتین را به فارسی تبدیل می‌کند', () => {
    expect(toPersianDigits(1234567890)).toBe('۱۲۳۴۵۶۷۸۹۰')
    expect(toPersianDigits('کد 42')).toBe('کد ۴۲')
  })

  it('ارقام فارسی را به لاتین برمی‌گرداند', () => {
    expect(toLatinDigits('۱۲۳۴۵')).toBe('12345')
    expect(toLatinDigits('۰۹۱۲')).toBe('0912')
  })

  it('رفت و برگشت تبدیل ارقام نتیجه یکسان می‌دهد', () => {
    const original = '09123456789'
    expect(toLatinDigits(toPersianDigits(original))).toBe(original)
  })
})

describe('قالب‌بندی عدد و قیمت', () => {
  it('جداکننده هزارگان را با ارقام فارسی اعمال می‌کند', () => {
    expect(formatNumber(25000000)).toBe('۲۵٬۰۰۰٬۰۰۰')
  })

  it('قیمت را با واحد تومان برمی‌گرداند', () => {
    expect(formatPrice(89000000)).toBe('۸۹٬۰۰۰٬۰۰۰ تومان')
  })

  it('برای قیمت صفر پیام تماس بگیرید نمایش می‌دهد', () => {
    expect(formatPrice(0)).toBe('تماس بگیرید')
  })
})

describe('محاسبه درصد تخفیف', () => {
  it('درصد صحیح را محاسبه می‌کند', () => {
    expect(discountPercent(80, 100)).toBe(20)
  })

  it('بدون تخفیف مقدار null برمی‌گرداند', () => {
    expect(discountPercent(100, null)).toBeNull()
    expect(discountPercent(100, 100)).toBeNull()
    expect(discountPercent(100, 90)).toBeNull()
  })
})

describe('تاریخ شمسی', () => {
  it('تاریخ میلادی را به شمسی خوانا تبدیل می‌کند', () => {
    const result = formatJalaliDate('2026-06-18T12:00:00Z')
    // ۱۸ ژوئن ۲۰۲۶ برابر است با ۲۸ خرداد ۱۴۰۵
    expect(result).toBe('۲۸ خرداد ۱۴۰۵')
  })

  it('برای تاریخ نامعتبر رشته خالی برمی‌گرداند', () => {
    expect(formatJalaliDate('تاریخ-نامعتبر')).toBe('')
  })

  it('فاصله زمانی نسبی را درست برای بازه‌های مختلف نمایش می‌دهد', () => {
    const now = new Date('2026-09-01T12:00:00Z')
    expect(formatRelativeTime('2026-09-01T08:00:00Z', now)).toBe('امروز')
    expect(formatRelativeTime('2026-08-31T08:00:00Z', now)).toBe('دیروز')
    expect(formatRelativeTime('2026-08-27T08:00:00Z', now)).toBe('۵ روز پیش')
  })
})

describe('نرمال‌سازی متن جستجو', () => {
  it('ی و ک عربی را به فارسی تبدیل می‌کند', () => {
    expect(normalizeSearchText('يخچال')).toBe(normalizeSearchText('یخچال'))
    expect(normalizeSearchText('كولر')).toBe(normalizeSearchText('کولر'))
  })

  it('حروف بزرگ لاتین را کوچک می‌کند', () => {
    expect(normalizeSearchText('LED')).toBe('led')
  })
})

describe('تبدیل امتیاز به ستاره', () => {
  it('امتیاز کامل را درست می‌شکند', () => {
    expect(ratingToStars(4.5)).toEqual({ full: 4, half: true, empty: 0 })
    expect(ratingToStars(5)).toEqual({ full: 5, half: false, empty: 0 })
  })

  it('امتیاز خارج از بازه را محدود می‌کند', () => {
    expect(ratingToStars(-1)).toEqual({ full: 0, half: false, empty: 5 })
    expect(ratingToStars(9)).toEqual({ full: 5, half: false, empty: 0 })
  })
})
