/**
 * محدودکننده نرخ درخواست (Rate Limiter) در حافظه.
 *
 * چرا در حافظه؟ برای اجرای بدون زیرساخت اضافه. در محیط تولید چندنمونه‌ای
 * (multi-instance) این ماژول باید با Redis جایگزین شود تا شمارش بین
 * نمونه‌ها مشترک باشد — رابط توابع همان می‌ماند.
 *
 * الگوریتم: پنجره لغزان سادهشده (fixed window با بازنشانی) که برای
 * محافظت در برابر Brute Force و سوءاستفاده از فرم‌ها کافی است.
 */

interface Bucket {
  count: number
  /** زمان پایان پنجره به میلی‌ثانیه */
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/** پاک‌سازی دوره‌ای برای جلوگیری از رشد بی‌پایان حافظه */
let lastSweep = 0
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitOptions {
  /** تعداد مجاز درخواست در هر پنجره */
  limit: number
  /** طول پنجره به میلی‌ثانیه */
  windowMs: number
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  /** ثانیه‌های باقی‌مانده تا آزاد شدن ظرفیت */
  retryAfterSeconds: number
}

/**
 * بررسی و مصرف یک واحد از سهمیه.
 * @param key معمولاً ترکیب نام مسیر و IP کاربر
 */
export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return { ok: true, remaining: options.limit - 1, retryAfterSeconds: 0 }
  }

  if (existing.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: (existing.resetAt - now) / 1000,
    }
  }

  existing.count += 1
  return { ok: true, remaining: options.limit - existing.count, retryAfterSeconds: 0 }
}

/** ریست کامل — تنها برای تست‌ها */
export function resetRateLimits(): void {
  buckets.clear()
  lastSweep = 0
}
