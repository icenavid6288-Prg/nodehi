/**
 * کد یک‌بارمصرف (OTP) برای ورود با شماره تلفن.
 *
 * تصمیم‌های امنیتی:
 *  ۱. کد خام هرگز در دیتابیس ذخیره نمی‌شود؛ فقط هش SHA-256 آن همراه با
 *     شماره (به‌عنوان نمک) نگه داشته می‌شود. لو رفتن دیتابیس، کد فعال نمی‌سازد.
 *  ۲. مقایسه هش با `timingSafeEqual` انجام می‌شود تا زمان پاسخ، طول عمر
 *     کد را افشا نکند.
 *  ۳. تعداد تلاش‌ها محدود است؛ بدون آن، کد ۵ رقمی با brute force در چند
 *     دقیقه شکسته می‌شود.
 *  ۴. با صدور کد جدید، کدهای قبلی همان شماره باطل می‌شوند تا فقط آخرین
 *     پیامک معتبر باشد.
 */

import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { prisma } from '@/lib/db'
import { isIranianMobile, normalizeIranianMobile } from '@/lib/server/validation'
import { toLatinDigits } from '@/lib/utils/format'

/** سقف تلاش برای تأیید یک کد */
const MAX_ATTEMPTS = 5

/** طول کد یک‌بارمصرف */
export const OTP_LENGTH = 5

/** هش کد — شماره تلفن به‌عنوان نمک تا هش دو کاربر یکسان نباشد */
export function hashOtp(phone: string, code: string): string {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex')
}

/** تولید کد ۵ رقمی با مولد تصادفی امن رمزنگاری */
function generateCode(): string {
  return String(randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH))
}

export interface IssuedOtp {
  phone: string
  code: string
  expiresAt: Date
  ttlSeconds: number
}

/** صدور کد تازه برای یک شماره همراه */
export async function issueOtp(phoneRaw: string): Promise<IssuedOtp | null> {
  const phone = normalizeIranianMobile(phoneRaw)
  if (!isIranianMobile(phone)) return null

  const ttlSeconds = Number(process.env.AUTH_OTP_TTL_SECONDS ?? 120)
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
  const code = generateCode()

  // کدهای فعال قبلی همان شماره باطل می‌شوند
  await prisma.otpCode.updateMany({
    where: { phone, purpose: 'login', consumedAt: null },
    data: { consumedAt: new Date() },
  })

  await prisma.otpCode.create({
    data: { phone, codeHash: hashOtp(phone, code), purpose: 'login', expiresAt },
  })

  return { phone, code, expiresAt, ttlSeconds }
}

export type OtpFailureReason = 'invalid_input' | 'not_found' | 'expired' | 'too_many_attempts' | 'mismatch'

export type OtpVerifyResult = { ok: true; phone: string } | { ok: false; reason: OtpFailureReason }

/** تأیید کد وارد‌شده توسط کاربر */
export async function verifyOtp(phoneRaw: string, codeRaw: string): Promise<OtpVerifyResult> {
  const phone = normalizeIranianMobile(phoneRaw)
  const code = toLatinDigits(String(codeRaw ?? '')).replace(/\D/g, '')

  if (!isIranianMobile(phone) || code.length !== OTP_LENGTH) {
    return { ok: false, reason: 'invalid_input' }
  }

  const record = await prisma.otpCode.findFirst({
    where: { phone, purpose: 'login', consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) return { ok: false, reason: 'not_found' }
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: 'expired' }
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' }

  const expected = Buffer.from(record.codeHash, 'hex')
  const provided = Buffer.from(hashOtp(phone, code), 'hex')
  const matches = expected.length === provided.length && timingSafeEqual(expected, provided)

  if (!matches) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    return { ok: false, reason: 'mismatch' }
  }

  // کد مصرف‌شده دیگر قابل استفاده نیست (یک‌بارمصرف بودن واقعی)
  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } })
  return { ok: true, phone }
}

/** پاک‌سازی کدهای منقضی — قابل فراخوانی از یک کار زمان‌بندی‌شده */
export async function pruneExpiredOtps(): Promise<number> {
  const result = await prisma.otpCode.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } },
  })
  return result.count
}
