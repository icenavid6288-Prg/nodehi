/**
 * تفسیر تغییر کاربر از پنل مدیریت.
 *
 * چرا جدا از route؟ این تابع «آخرین سد» پیش از تغییر نقش و وضعیت کاربر است.
 * اگر اینجا باگی بماند، می‌تواند سامانه را قفل کند (هیچ مدیر کلِ فعالی نماند)
 * یا دسترسی کسی را بی‌سر‌و‌صدا بالا ببرد. جدا بودن، آزمون‌پذیری مستقل از
 * دیتابیس و Next می‌دهد.
 */

import type { Prisma } from '@prisma/client'
import { tierForPoints } from '@/lib/loyalty'
import { isAssignableRole } from '@/lib/roles'
import { toLatinDigits } from '@/lib/utils/format'

/** سقف امتیاز باشگاه — بالاتر از این عملاً بی‌معناست و احتمال ورودی اشتباه را می‌رساند */
const MAX_LOYALTY_POINTS = 10_000_000

/** مقادیر فعلی کاربر که برای تشخیص «تغییر واقعی» لازم است */
export interface ExistingUserValues {
  id: string
  phone: string
  role: string
  isActive: boolean
  loyaltyPoints: number
}

/** زمینه‌ای که فقط از دیتابیس می‌آید و برای محافظت از آخرین مدیر کل لازم است */
export interface UserUpdateContext {
  /** کاربری که درخواست را می‌فرستد */
  actorId: string
  /** تعداد مدیران کلِ **فعال** سامانه، پیش از اعمال تغییر */
  activeAdminCount: number
}

export interface UserAuditEntry {
  action: string
  metadata: Record<string, unknown>
}

export interface ParsedUserUpdate {
  fields: Record<string, string>
  data: Prisma.UserUpdateInput
  audit: UserAuditEntry[]
  /** آیا درخواست اصلاً فیلد شناخته‌شده‌ای داشت؟ */
  requested: boolean
}

/** تبدیل ورودی به عدد صحیح نامنفی؛ در صورت نامعتبر بودن null (صفر معتبر است) */
function toNonNegativeInt(value: unknown): number | null {
  const raw = toLatinDigits(String(value ?? '')).trim()
  // علامت منفی صریحاً رد می‌شود؛ حذف ساده نویسه‌های غیررقمی، «-۴» را به ۴ تبدیل می‌کرد
  if (raw.startsWith('-') || raw.startsWith('\u2212')) return null
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null
  const parsed = Number.parseInt(digits, 10)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * تفسیر بدنه PATCH کاربر.
 *
 * قواعد مهم:
 *  • هرگز نمی‌توان نقش یا وضعیت **حساب خودت** را عوض کرد؛ نتیجه‌اش قفل‌شدن
 *    مدیر بیرون از پنل است.
 *  • «آخرین مدیر کل فعال» محافظت می‌شود: نه تنزلش ممکن است و نه غیرفعال‌کردنش.
 *    بررسی یک بار و بعد از محاسبه نتیجه نهایی انجام می‌شود تا حالت ترکیبی
 *    (تنزل + غیرفعال در یک درخواست) هم پوشش داده شود.
 *  • سطح باشگاه از روی امتیاز محاسبه می‌شود، نه از ورودی کاربر.
 */
export function parseUserUpdate(
  input: Record<string, unknown>,
  existing: ExistingUserValues,
  context: UserUpdateContext,
): ParsedUserUpdate {
  const fields: Record<string, string> = {}
  const data: Prisma.UserUpdateInput = {}
  const audit: UserAuditEntry[] = []

  const requested =
    input.role !== undefined || input.isActive !== undefined || input.loyaltyPoints !== undefined

  const isSelf = existing.id === context.actorId

  // ── ۱) نقش ──
  let nextRole = existing.role
  if (input.role !== undefined) {
    if (!isAssignableRole(input.role)) {
      fields.role = 'نقش انتخابی معتبر نیست.'
    } else if (isSelf) {
      fields.role = 'نمی‌توانید نقش حساب خودتان را تغییر دهید.'
    } else {
      nextRole = input.role
    }
  }

  // ── ۲) وضعیت حساب ──
  let nextIsActive = existing.isActive
  if (input.isActive !== undefined) {
    if (typeof input.isActive !== 'boolean') {
      fields.isActive = 'مقدار isActive باید منطقی (true/false) باشد.'
    } else if (input.isActive === false && isSelf) {
      fields.isActive = 'نمی‌توانید حساب خودتان را غیرفعال کنید.'
    } else {
      nextIsActive = input.isActive
    }
  }

  // ── ۳) امتیاز باشگاه ──
  let nextPoints: number | undefined
  if (input.loyaltyPoints !== undefined) {
    const points = toNonNegativeInt(input.loyaltyPoints)
    if (points === null || points > MAX_LOYALTY_POINTS) {
      fields.loyaltyPoints = 'امتیاز باید عددی بین ۰ تا ۱۰٬۰۰۰٬۰۰۰ باشد.'
    } else if (points !== existing.loyaltyPoints) {
      nextPoints = points
    }
  }

  // ── ۴) محافظت از آخرین مدیر کل فعال ──
  // نتیجه را با هم می‌سنجیم، نه فیلد‌به‌فیلد، تا حالت ترکیبی هم درست پوشش داده شود.
  const wasActiveAdmin = existing.role === 'admin' && existing.isActive
  const willBeActiveAdmin = nextRole === 'admin' && nextIsActive
  if (wasActiveAdmin && !willBeActiveAdmin && context.activeAdminCount <= 1) {
    const message =
      'این تنها مدیر کلِ فعال سامانه است و نمی‌توان آن را تنزل داد یا غیرفعال کرد. نخست مدیر کل دیگری بسازید.'
    // خطا روی همان فیلدی می‌نشیند که کاربر عوض کرده تا پیام در جای درست دیده شود
    if (nextRole !== existing.role) fields.role = message
    else fields.isActive = message
  }

  if (Object.keys(fields).length > 0) {
    return { fields, data: {}, audit, requested }
  }

  // ── ۵) ساخت تغییرها و رکوردهای حسابرسی ──
  if (nextRole !== existing.role) {
    data.role = nextRole
    audit.push({
      action: 'user.role_changed',
      metadata: { phone: existing.phone, from: existing.role, to: nextRole },
    })
  }

  if (nextIsActive !== existing.isActive) {
    data.isActive = nextIsActive
    audit.push({
      action: 'user.status_changed',
      metadata: { phone: existing.phone, from: existing.isActive, to: nextIsActive },
    })
  }

  if (nextPoints !== undefined) {
    data.loyaltyPoints = nextPoints
    data.loyaltyTier = tierForPoints(nextPoints).name
    audit.push({
      action: 'user.loyalty_changed',
      metadata: { phone: existing.phone, from: existing.loyaltyPoints, to: nextPoints },
    })
  }

  return { fields, data, audit, requested }
}
