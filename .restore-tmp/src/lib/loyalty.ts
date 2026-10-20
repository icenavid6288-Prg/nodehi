/**
 * قواعد باشگاه مشتریان.
 * در یک فایل نگه داشته می‌شود تا پیشخوان، صفحه باشگاه و هر جای دیگر
 * یکسان درباره سطح کاربر قضاوت کنند.
 */

export interface LoyaltyTier {
  name: string
  /** حداقل امتیاز برای رسیدن به این سطح */
  min: number
  /** درصد تخفیف وفاداری این سطح */
  discountPercent: number
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  { name: 'برنزی', min: 0, discountPercent: 0 },
  { name: 'نقره‌ای', min: 1000, discountPercent: 3 },
  { name: 'طلایی', min: 2500, discountPercent: 6 },
  { name: 'الماسی', min: 5000, discountPercent: 10 },
]

/** سطح مربوط به یک مقدار امتیاز */
export function tierForPoints(points: number): LoyaltyTier {
  let current = LOYALTY_TIERS[0]
  for (const tier of LOYALTY_TIERS) {
    if (points >= tier.min) current = tier
  }
  return current
}

/** سطح بعدی؛ اگر کاربر در بالاترین سطح باشد null */
export function nextTierForPoints(points: number): LoyaltyTier | null {
  return LOYALTY_TIERS.find((tier) => tier.min > points) ?? null
}

export interface LoyaltyProgress {
  current: LoyaltyTier
  next: LoyaltyTier | null
  /** امتیاز باقی‌مانده تا سطح بعدی */
  pointsToNext: number
  /** درصد پیشرفت در بازه سطح فعلی (۰ تا ۱۰۰) */
  progressPercent: number
}

/** محاسبه پیشرفت کاربر در باشگاه */
export function loyaltyProgress(points: number): LoyaltyProgress {
  const current = tierForPoints(points)
  const next = nextTierForPoints(points)

  if (!next) {
    return { current, next: null, pointsToNext: 0, progressPercent: 100 }
  }

  const span = next.min - current.min
  const gained = points - current.min
  return {
    current,
    next,
    pointsToNext: next.min - points,
    progressPercent: span > 0 ? Math.min(100, Math.round((gained / span) * 100)) : 0,
  }
}

/** امتیاز کسب‌شده از یک خرید — به ازای هر ۱۰۰٬۰۰۰ تومان یک امتیاز */
export function pointsForPurchase(amount: number): number {
  return Math.floor(Math.max(0, amount) / 100_000)
}
