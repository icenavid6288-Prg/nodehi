import { OTP_LENGTH, verifyOtp } from '@/lib/server/auth/otp'
import { createSession } from '@/lib/server/auth/session'
import { findOrCreateUserByPhone, toPublicUser } from '@/lib/server/auth/users'
import { badRequest, clientIp, jsonError, jsonOk, tooManyRequests } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'
import { readJson } from '@/lib/server/validation'
import { toLatinDigits } from '@/lib/utils/format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** پیام فارسی هر دلیل شکست، بدون افشای جزئیات داخلی */
const FAILURE_MESSAGES: Record<string, string> = {
  invalid_input: 'کد وارد‌شده باید ۵ رقم باشد.',
  not_found: 'کدی برای این شماره صادر نشده است. دوباره درخواست کنید.',
  expired: 'این کد منقضی شده است. کد تازه بگیرید.',
  too_many_attempts: 'تعداد تلاش‌های ناموفق زیاد شد. کد تازه بگیرید.',
  mismatch: 'کد وارد‌شده درست نیست.',
}

/**
 * تأیید کد ورود و ساخت نشست.
 * POST /api/auth/otp/verify   { "phone": "09120000000", "code": "12345" }
 *
 * اگر شماره در سیستم نباشد، حساب خودکار ساخته می‌شود (ثبت‌نام و ورود یکی است).
 * پس از تأیید موفق، کوکی نشست httpOnly در پاسخ ست می‌شود.
 */
export async function POST(request: Request) {
  const ip = clientIp(request)

  // سقف کلی برای تلاش تأیید — بدون آن، حد تلاش هر کد بی‌اثر می‌شد
  const limited = rateLimit(`otp:verify:${ip}`, { limit: 20, windowMs: 10 * 60_000 })
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  // کد به‌صورت رشته ارقام بررسی می‌شود، نه عدد: تبدیل به عدد، کدهای
  // دارای صفر ابتدایی را خراب می‌کرد و طولشان را جابه‌جا می‌کرد.
  const code = toLatinDigits(String(body.code ?? '')).replace(/\D/g, '')
  if (code.length !== OTP_LENGTH) {
    return badRequest(FAILURE_MESSAGES.invalid_input, { code: FAILURE_MESSAGES.invalid_input })
  }

  const result = await verifyOtp(String(body.phone ?? ''), code)

  if (!result.ok) {
    const message = FAILURE_MESSAGES[result.reason] ?? 'تأیید کد ناموفق بود.'
    // کد ناموجود/منقضی/پرتلاش خطای ۴۰۰ است، نه ۴۰۱ — چون کاربر هنوز
    // احراز هویت نشده و مشکل در ورودی است.
    return jsonError(400, { code: `otp_${result.reason}`, message, fields: { code: message } })
  }

  const user = await findOrCreateUserByPhone(result.phone)

  if (!user.isActive) {
    return jsonError(403, {
      code: 'account_disabled',
      message: 'این حساب کاربری غیرفعال شده است. با پشتیبانی تماس بگیرید.',
    })
  }

  await createSession(user.id, {
    userAgent: request.headers.get('user-agent'),
    ip,
  })

  return jsonOk({ user: toPublicUser(user) })
}
