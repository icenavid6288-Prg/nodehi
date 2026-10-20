/**
 * داده ناوبری مشترک هدر.
 *
 * چرا این فایل جدا است؟ هم مگامنوی دسکتاپ و هم کشوی موبایل از همین فهرست‌ها
 * تغذیه می‌شوند. اگر هر کدام فهرست خودش را داشت، افزودن یک مقصد به یکی و
 * فراموش‌کردن دیگری حتمی بود.
 */

export interface NavLink {
  href: string
  label: string
}

/** میان‌برهای پرتکرار — ستون کناری مگامنو و بخش «دسترسی سریع» موبایل */
export const menuShortcuts: NavLink[] = [
  { href: '/shop?discounted=1', label: 'کالاهای تخفیف‌دار' },
  { href: '/ready-to-ship', label: 'آماده ارسال امروز' },
  { href: '/brands', label: 'همه برندها' },
  { href: '/shop?installmentOnly=1', label: 'خرید اقساطی' },
  { href: '/loyalty', label: 'باشگاه مشتریان' },
  { href: '/track', label: 'پیگیری سفارش' },
  { href: '/guides', label: 'راهنمای خرید' },
]

/** نوار ناوبری اصلی */
export const primaryNav: NavLink[] = [
  { href: '/shop', label: 'فروشگاه' },
  { href: '/shop?sort=newest', label: 'جدیدترین‌ها' },
  { href: '/shop?discounted=1', label: 'تخفیف‌ها' },
  { href: '/ready-to-ship', label: 'آماده ارسال' },
  { href: '/brands', label: 'برندها' },
  { href: '/compare', label: 'مقایسه' },
  { href: '/guides', label: 'راهنمای خرید' },
  { href: '/blog', label: 'مقالات' },
  { href: '/loyalty', label: 'باشگاه مشتریان' },
  { href: '/contact', label: 'تماس با ما' },
]
