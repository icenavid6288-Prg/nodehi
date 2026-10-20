/**
 * ابزارهای بومی‌سازی فارسی.
 * عمداً بدون وابستگی خارجی نوشته شده‌اند: تبدیل تقویم شمسی با Intl داخلی
 * جاوااسکریپت انجام می‌شود (`fa-IR-u-ca-persian`) تا حجم باندل بالا نرود.
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

/** تبدیل ارقام لاتین یک رشته به ارقام فارسی */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)])
}

/** تبدیل ارقام فارسی/عربی به لاتین (برای پردازش ورودی کاربر) */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

/**
 * جداکننده هزارگان با ارقام فارسی.
 * از جداکننده هزارگان فارسی (٬) استفاده می‌کنیم نه کاما لاتین، چون ترکیب
 * کاما با ارقام فارسی در متن راست‌به‌چپ ناهمخوان به نظر می‌رسد.
 */
export function formatNumber(value: number): string {
  return toPersianDigits(Math.round(value).toLocaleString('en-US')).replace(/,/g, '٬')
}

/** قیمت به تومان — مثال: ۲۴٬۵۰۰٬۰۰۰ تومان */
export function formatPrice(value: number): string {
  if (!value) return 'تماس بگیرید'
  return `${formatNumber(value)} تومان`
}

/** قیمت خلاصه بدون واحد — برای جدول‌های فشرده */
export function formatPriceShort(value: number): string {
  if (!value) return '—'
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    const rounded = Number.isInteger(millions) ? millions : Number(millions.toFixed(1))
    return `${toPersianDigits(rounded)} میلیون`
  }
  return formatNumber(value)
}

/** درصد تخفیف؛ اگر تخفیفی نباشد null برمی‌گرداند */
export function discountPercent(price: number, compareAtPrice: number | null): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
}

const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const jalaliDateTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** تاریخ شمسی خوانا — مثال: ۵ مهر ۱۴۰۵ */
export function formatJalaliDate(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return ''
  return jalaliDate.format(date)
}

/** تاریخ و ساعت شمسی */
export function formatJalaliDateTime(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return ''
  return jalaliDateTime.format(date)
}

/** فاصله زمانی نسبی («۳ روز پیش») با تقویم شمسی */
export function formatRelativeTime(input: string | Date, now: Date = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return ''
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)

  if (diffDays <= 0) return 'امروز'
  if (diffDays === 1) return 'دیروز'
  if (diffDays < 30) return `${toPersianDigits(diffDays)} روز پیش`
  if (diffDays < 365) return `${toPersianDigits(Math.floor(diffDays / 30))} ماه پیش`
  return formatJalaliDate(date)
}

/** درصد امتیاز به ستاره (برای رندر نیم‌ستاره) */
export function ratingToStars(rating: number): { full: number; half: boolean; empty: number } {
  const clamped = Math.max(0, Math.min(5, rating))
  const full = Math.floor(clamped)
  const half = clamped - full >= 0.5
  return { full, half, empty: 5 - full - (half ? 1 : 0) }
}

/** پاک‌سازی متن جستجو: یکسان‌سازی ی/ک عربی و حذف نیم‌فاصله اضافه */
export function normalizeSearchText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[ىي]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200f\u200e]+$/g, '')
    .replace(/[ًٌٍَُِّْ]/g, '')
}
