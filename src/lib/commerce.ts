/**
 * ─────────────────────────────────────────────────────────────
 *  قواعد تجاری مشترک بین کلاینت و سرور
 * ─────────────────────────────────────────────────────────────
 *  این فایل تنها منبع حقیقت برای هزینه ارسال، آستانه ارسال رایگان و
 *  کدهای تخفیف است. صفحه سبد خرید و API تسویه حساب هر دو از همین‌جا
 *  می‌خوانند تا قیمت نمایش‌داده‌شده با قیمت نهایی یکی باشد.
 *
 *  ⚠️ نکته امنیتی: محاسبه نهایی قیمت همیشه روی سرور انجام می‌شود؛
 *  مقدارهای قیمتِ آمده از مرورگر هرگز مبنای پرداخت نیستند.
 */

import couponData from '@/lib/data/coupons.json'
import { toLatinDigits } from '@/lib/utils/format'

/** سقف ارسال رایگان — با سیاست واقعی فروشگاه هم‌تراز می‌شود */
export const FREE_SHIPPING_THRESHOLD = 50_000_000

/** هزینه ارسال پایه — همان هزینه «ارسال همان‌روز» است */
export const SHIPPING_COST = 59_000

export interface ShippingMethod {
  id: string
  /** برچسب قابل نمایش — سرور همین را روی فاکتور ذخیره می‌کند */
  label: string
  description: string
  cost: number
}

/**
 * روش‌های ارسال.
 *
 * ⚠️ این تنها منبع حقیقت است. رابط کاربری تسویه حساب و سرور هر دو از همین
 * آرایه می‌خوانند. دلیلش یک باگ واقعی بود: قبلاً صفحه تسویه، هزینه هر روش را
 * نمایش می‌داد ولی فقط شناسه/متن آن را می‌فرستاد و سرور هزینه ثابت حساب
 * می‌کرد؛ یعنی «مبلغ نمایش‌داده‌شده» با «مبلغ پرداخت‌شده» یکی نبود.
 * حالا سرور هزینه را از همین شناسه استخراج می‌کند و متن فاکتور هم از سرور
 * می‌آید، نه از مرورگر.
 */
export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'express',
    label: 'ارسال همان‌روز (تهران و کرج)',
    description: 'سفارش تا ساعت ۱۴ ثبت و همان روز تحویل داده می‌شود.',
    cost: SHIPPING_COST,
  },
  {
    id: 'tipax',
    label: 'تیپاکس — سراسر کشور',
    description: 'تحویل ۲ تا ۳ روز کاری با امکان پیگیری مرسوله.',
    cost: 129_000,
  },
  {
    id: 'freight',
    label: 'باربری — کالاهای حجیم',
    description: 'مناسب یخچال و لباسشویی؛ تحویل ۳ تا ۵ روز کاری.',
    cost: 390_000,
  },
]

export const DEFAULT_SHIPPING_METHOD_ID = 'express'

/** روش ارسال با شناسه داده‌شده؛ در صورت نامعتبر بودن، روش پیش‌فرض */
export function resolveShippingMethod(id: unknown): ShippingMethod {
  const found = SHIPPING_METHODS.find((method) => method.id === id)
  return found ?? SHIPPING_METHODS[0]!
}

export interface CouponDefinition {
  /** درصد تخفیف */
  percent: number
  /** برچسب قابل نمایش */
  label: string
  /** حداقل مبلغ سبد برای اعتبار کد */
  minSubtotal?: number
}

/**
 * کدهای تخفیف.
 *
 * منبع داده فایل `lib/data/coupons.json` است تا سه مصرف‌کننده از یک جا بخوانند:
 *   • رابط کاربری سبد خرید (پیش‌نمایش فوری تخفیف، بدون رفت‌وبرگشت شبکه)
 *   • اسکریپت seed دیتابیس (`prisma/seed.mjs`)
 *   • سرور، که در نهایت اعتبارسنجی معتبر را از جدول Coupon انجام می‌دهد
 * یک منبع واحد یعنی پیش‌نمایش کلاینت هرگز با حکم سرور اختلاف پیدا نمی‌کند.
 */
export const COUPONS: Record<string, CouponDefinition> = couponData as Record<string, CouponDefinition>

/** یکسان‌سازی کد تخفیف: ارقام فارسی به لاتین، حذف فاصله، بزرگ‌کردن حروف */
export function normalizeCouponCode(input: string): string {
  return toLatinDigits(input).replace(/\s+/g, '').toUpperCase()
}

/** جستجوی کد تخفیف؛ در صورت نبود یا عدم احراز حداقل مبلغ، null برمی‌گرداند */
export function lookupCoupon(code: string, subtotal = Number.POSITIVE_INFINITY): (CouponDefinition & { code: string }) | null {
  const normalized = normalizeCouponCode(code)
  if (!normalized) return null
  const found = COUPONS[normalized]
  if (!found) return null
  if (found.minSubtotal !== undefined && subtotal < found.minSubtotal) return null
  return { code: normalized, ...found }
}

export interface OrderTotals {
  subtotal: number
  discount: number
  shipping: number
  total: number
  coupon: { code: string; percent: number; label: string } | null
}

/** کد تخفیفی که اعتبارش تعیین شده — از هر منبعی که آمده باشد */
export interface ResolvedCoupon {
  code: string
  percent: number
  label: string
}

/**
 * محاسبه مبلغ نهایی سفارش از روی تخفیف «تأییدشده».
 * ترتیب محاسبه: جمع کالاها → تخفیف → هزینه ارسال (بر پایه مبلغ پس از تخفیف).
 * این ترتیب باعث می‌شود تخفیف بزرگ، کاربر را از آستانه ارسال رایگان خارج نکند.
 *
 * این تابع تنها جای پیاده‌سازی این قاعده است؛ هم پیش‌نمایش کلاینت و هم
 * تسویه روی سرور از همین تابع استفاده می‌کنند.
 *
 * `shippingMethodId` شناسه روش ارسال است (نه هزینه). هزینه هرگز از ورودی
 * کاربر خوانده نمی‌شود؛ خودِ ماژول آن را به شناسه نگاشت می‌کند.
 */
export function computeTotals(
  subtotal: number,
  coupon: ResolvedCoupon | null,
  shippingMethodId: string = DEFAULT_SHIPPING_METHOD_ID,
): OrderTotals {
  const discount = coupon ? Math.round((subtotal * coupon.percent) / 100) : 0
  const payableAfterDiscount = Math.max(0, subtotal - discount)
  // ارسال رایگان بر همه روش‌ها حاکم است؛ بالای آستانه، هزینه روش بی‌اثر می‌شود
  const shipping =
    payableAfterDiscount >= FREE_SHIPPING_THRESHOLD || subtotal === 0
      ? 0
      : resolveShippingMethod(shippingMethodId).cost

  return {
    subtotal,
    discount,
    shipping,
    total: payableAfterDiscount + shipping,
    coupon: coupon ? { code: coupon.code, percent: coupon.percent, label: coupon.label } : null,
  }
}

/**
 * پیش‌نمایش مبلغ با کد تخفیف متنی.
 * برای رابط کاربری سبد خرید که به دیتابیس دسترسی ندارد. سرور در نهایت کد را
 * از جدول Coupon اعتبارسنجی می‌کند و همان `computeTotals` را صدا می‌زند.
 */
export function computeOrderTotals(
  subtotal: number,
  couponCode?: string | null,
  shippingMethodId?: string,
): OrderTotals {
  const coupon = couponCode ? lookupCoupon(couponCode, subtotal) : null
  return computeTotals(subtotal, coupon, shippingMethodId)
}
