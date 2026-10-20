import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/server/auth/session'
import { toPublicUser, updateUserProfile } from '@/lib/server/auth/users'
import { badRequest, clientIp, jsonError, jsonOk, tooManyRequests } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'
import { cleanText, isEmail, readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * خواندن کاربر جاری.
 * GET /api/auth/session
 *
 * همیشه ۲۰۰ برمی‌گرداند؛ `user: null` یعنی مهمان هستیم. این کار کلاینت را
 * ساده می‌کند و تفاوت «خطا» با «وارد نشده» را حذف می‌کند.
 */
export async function GET() {
  const user = await getCurrentUser()
  return jsonOk({ user: user ? toPublicUser(user) : null })
}

/**
 * به‌روزرسانی پروفایل کاربر جاری.
 * PATCH /api/auth/session   { "firstName": "...", "lastName": "...", "email": "..." }
 *
 * شماره تلفن قابل تغییر نیست: کلید ورود است و تغییر آن نیازمند تأیید کد
 * روی شماره جدید است (فرایند جداگانه).
 */
export async function PATCH(request: Request) {
  const ip = clientIp(request)
  const limited = rateLimit(`profile:${ip}`, { limit: 20, windowMs: 10 * 60_000 })
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const user = await getCurrentUser()
  if (!user) {
    return jsonError(401, { code: 'unauthenticated', message: 'برای این کار باید وارد حساب خود شوید.' })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const fields: Record<string, string> = {}
  const firstName = cleanText(body.firstName, 60)
  const lastName = cleanText(body.lastName, 60)
  const email = cleanText(body.email, 254)

  if (firstName.length > 0 && firstName.length < 2) fields.firstName = 'نام را کامل وارد کنید.'
  if (lastName.length > 0 && lastName.length < 2) fields.lastName = 'نام خانوادگی را کامل وارد کنید.'
  if (email && !isEmail(email)) fields.email = 'قالب ایمیل درست نیست.'

  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات پروفایل کامل نیست.', fields)
  }

  try {
    const updated = await updateUserProfile(user.id, {
      firstName: firstName || null,
      lastName: lastName || null,
      email: email || null,
    })
    return jsonOk({ user: toPublicUser(updated) })
  } catch (error) {
    // P2002 یعنی قید یکتایی نقض شده — اینجا فقط ایمیل می‌تواند تکراری باشد
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return badRequest('این ایمیل قبلاً برای حساب دیگری ثبت شده است.', {
        email: 'این ایمیل تکراری است.',
      })
    }
    throw error
  }
}
