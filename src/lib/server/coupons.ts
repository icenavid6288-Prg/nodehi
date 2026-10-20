/**
 * اعتبارسنجی کد تخفیف روی سرور.
 *
 * رابط کاربری فقط «پیش‌نمایش» می‌دهد؛ حکم نهایی اینجاست. کد از جدول Coupon
 * خوانده می‌شود و همه قیدها بررسی می‌شوند: فعال بودن، بازه تاریخ، حداقل
 * مبلغ سبد و سقف استفاده. اگر فقط به فهرست کلاینت اتکا می‌کردیم، کاربر
 * می‌توانست کد منقضی یا تمام‌شده را با دستکاری جاوااسکریپت اعمال کند.
 */

import { prisma } from '@/lib/db'
import { normalizeCouponCode, type ResolvedCoupon } from '@/lib/commerce'

export type CouponRejection =
  | 'not_found'
  | 'inactive'
  | 'expired'
  | 'not_started'
  | 'limit_reached'
  | 'below_minimum'

export type CouponResult =
  | { ok: true; coupon: ResolvedCoupon }
  | { ok: false; reason: CouponRejection }

/** پیام فارسی هر دلیل رد شدن کد تخفیف */
export const COUPON_REJECTION_MESSAGES: Record<CouponRejection, string> = {
  not_found: 'این کد تخفیف وجود ندارد.',
  inactive: 'این کد تخفیف غیرفعال شده است.',
  expired: 'این کد تخفیف منقضی شده است.',
  not_started: 'زمان استفاده از این کد تخفیف هنوز نرسیده است.',
  limit_reached: 'سقف استفاده از این کد تخفیف تکمیل شده است.',
  below_minimum: 'مبلغ سبد شما برای استفاده از این کد کافی نیست.',
}

/**
 * بررسی کد تخفیف.
 * @param codeRaw کد وارد‌شده توسط کاربر (با ارقام فارسی و فاصله هم پذیرفته می‌شود)
 * @param subtotal جمع کالاها پیش از تخفیف
 */
export async function resolveCoupon(codeRaw: string, subtotal: number): Promise<CouponResult> {
  const code = normalizeCouponCode(codeRaw)
  if (!code) return { ok: false, reason: 'not_found' }

  const coupon = await prisma.coupon.findUnique({ where: { code } })
  if (!coupon) return { ok: false, reason: 'not_found' }
  if (!coupon.isActive) return { ok: false, reason: 'inactive' }

  const now = new Date()
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, reason: 'not_started' }
  if (coupon.expiresAt && coupon.expiresAt < now) return { ok: false, reason: 'expired' }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, reason: 'limit_reached' }
  }
  if (coupon.minSubtotal !== null && subtotal < coupon.minSubtotal) {
    return { ok: false, reason: 'below_minimum' }
  }

  return {
    ok: true,
    coupon: { code: coupon.code, percent: coupon.percent, label: coupon.label },
  }
}
