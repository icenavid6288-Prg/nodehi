const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

/** تبدیل رقم‌های لاتین به فارسی برای نمایش. */
export function toFa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)])
}

/** قیمت تومانی با جداکننده هزارگان و رقم فارسی. */
export function price(value: number): string {
  return toFa(value.toLocaleString('en-US'))
}

export function percent(value: number): string {
  return `${toFa(value)}٪`
}

/** تاریخ میلادی ISO را به تاریخ شمسی خوانا تبدیل می‌کند. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

export const FREE_SHIPPING_THRESHOLD = 20_000_000
export const SHIPPING_COST = 450_000
