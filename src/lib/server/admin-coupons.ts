/**
 * تفسیر ویرایش کد تخفیف از پنل مدیریت.
 *
 * کد تخفیف مستقیماً روی مبلغی که مشتری می‌پردازد اثر می‌گذارد، پس اعتبارسنجی
 * اینجا آخرین سد پیش از ذخیره است. جدا بودن از route، آزمون‌پذیری مستقل
 * (بدون دیتابیس و بدون Next) می‌دهد.
 */

import type { Prisma } from '@prisma/client'
import { cleanText, toPositiveInt } from '@/lib/server/validation'
import { toLatinDigits } from '@/lib/utils/format'

/** مقادیر موجود کمپین که برای تشخیص «تغییر واقعی» لازم است */
export interface ExistingCouponValues {
  label: string
  percent: number
  minSubtotal: number | null
  maxUses: number | null
  usedCount: number
  startsAt: Date | null
  expiresAt: Date | null
  isActive: boolean
}

export interface ParsedCouponUpdate {
  fields: Record<string, string>
  data: Prisma.CouponUpdateInput
  /** فیلدهای تغییرکرده — برای لاگ حسابرسی */
  changed: Record<string, unknown>
}

/** خالی بودن یک مقدار عددی: null، رشته خالی، یا «۰» با ارقام فارسی یا لاتین */
function isBlankNumber(value: unknown): boolean {
  if (value === null) return true
  const normalized = toLatinDigits(String(value)).trim()
  return normalized === '' || /^0+$/.test(normalized)
}

/** تفسیر تاریخ ورودی؛ رشته خالی یا null یعنی «پاک کن» */
function parseDate(value: unknown): { ok: true; date: Date | null } | { ok: false } {
  if (value === null || value === '') return { ok: true, date: null }
  if (typeof value !== 'string') return { ok: false }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return { ok: false }
  return { ok: true, date: parsed }
}

/**
 * تفسیر بدنه PATCH کمپین.
 *
 * قواعد مهم:
 *  • کد (`code`) تغییرناپذیر است — مشتری آن را دیده و عوض‌کردنش کمپین فعلی را
 *    بی‌اثر می‌کند؛ برای کد تازه، کمپین تازه ساخته می‌شود.
 *  • سقف استفاده نمی‌تواند کمتر از تعداد مصرف‌شده شود، وگرنه کد در عمل مرده است.
 *  • انقضا باید بعد از شروع باشد.
 */
export function parseCouponUpdate(
  input: Record<string, unknown>,
  existing: ExistingCouponValues,
): ParsedCouponUpdate {
  const fields: Record<string, string> = {}
  const data: Prisma.CouponUpdateInput = {}
  const changed: Record<string, unknown> = {}

  if (input.label !== undefined) {
    const label = cleanText(input.label, 120)
    if (label.length < 3) fields.label = 'توضیح کد را کامل‌تر وارد کنید.'
    else if (label !== existing.label) {
      data.label = label
      changed.label = label
    }
  }

  if (input.percent !== undefined) {
    const percent = toPositiveInt(input.percent)
    if (percent === null || percent > 90) fields.percent = 'درصد تخفیف باید بین ۱ تا ۹۰ باشد.'
    else if (percent !== existing.percent) {
      data.percent = percent
      changed.percent = percent
    }
  }

  if (input.minSubtotal !== undefined) {
    const minSubtotal = isBlankNumber(input.minSubtotal) ? null : toPositiveInt(input.minSubtotal)
    if (!isBlankNumber(input.minSubtotal) && minSubtotal === null) {
      fields.minSubtotal = 'حداقل سبد نامعتبر است.'
    } else if (minSubtotal !== existing.minSubtotal) {
      data.minSubtotal = minSubtotal
      changed.minSubtotal = minSubtotal
    }
  }

  if (input.maxUses !== undefined) {
    if (isBlankNumber(input.maxUses)) {
      if (existing.maxUses !== null) {
        data.maxUses = null
        changed.maxUses = null
      }
    } else {
      const maxUses = toPositiveInt(input.maxUses)
      if (maxUses === null) {
        fields.maxUses = 'سقف استفاده باید عددی مثبت باشد یا خالی بماند.'
      } else if (maxUses < existing.usedCount) {
        fields.maxUses = `این کد تا کنون ${existing.usedCount} بار استفاده شده است؛ سقف نمی‌تواند کمتر باشد.`
      } else if (maxUses !== existing.maxUses) {
        data.maxUses = maxUses
        changed.maxUses = maxUses
      }
    }
  }

  let nextStartsAt: Date | null = existing.startsAt
  if (input.startsAt !== undefined) {
    const parsed = parseDate(input.startsAt)
    if (!parsed.ok) {
      fields.startsAt = 'تاریخ شروع معتبر نیست.'
    } else {
      nextStartsAt = parsed.date
      if (parsed.date?.getTime() !== existing.startsAt?.getTime()) {
        data.startsAt = parsed.date
        changed.startsAt = parsed.date?.toISOString() ?? null
      }
    }
  }

  if (input.expiresAt !== undefined) {
    const parsed = parseDate(input.expiresAt)
    if (!parsed.ok) {
      fields.expiresAt = 'تاریخ انقضا معتبر نیست.'
    } else if (parsed.date && nextStartsAt && parsed.date.getTime() <= nextStartsAt.getTime()) {
      fields.expiresAt = 'تاریخ انقضا باید بعد از تاریخ شروع باشد.'
    } else if (parsed.date?.getTime() !== existing.expiresAt?.getTime()) {
      data.expiresAt = parsed.date
      changed.expiresAt = parsed.date?.toISOString() ?? null
    }
  }

  if (input.isActive !== undefined) {
    if (typeof input.isActive !== 'boolean') {
      fields.isActive = 'مقدار isActive باید منطقی (true/false) باشد.'
    } else if (input.isActive !== existing.isActive) {
      data.isActive = input.isActive
      changed.isActive = input.isActive
    }
  }

  return { fields, data, changed }
}

/** نام کنش حسابرسی بر پایه نوع تغییر؛ تغییر خالصِ فعال/غیرفعال نام جداگانه می‌گیرد */
export function couponAuditAction(changed: Record<string, unknown>): string {
  const keys = Object.keys(changed)
  if (keys.length === 1 && keys[0] === 'isActive') {
    return changed.isActive ? 'coupon.activated' : 'coupon.deactivated'
  }
  return 'coupon.updated'
}
