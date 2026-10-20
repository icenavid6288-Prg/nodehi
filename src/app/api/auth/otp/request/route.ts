import { issueOtp } from '@/lib/server/auth/otp'
import { isOtpDevMode, sendOtpSms } from '@/lib/server/auth/sms'
import { badRequest, clientIp, jsonOk, tooManyRequests } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'
import { isIranianMobile, normalizeIranianMobile, readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * درخواست کد ورود.
 * POST /api/auth/otp/request   { "phone": "09120000000" }
 *
 * دو لایه محدودیت نرخ دارد چون این مسیر پیامک واقعی می‌فرستد:
 *  • هر شماره: ۳ درخواست در ۲ دقیقه — مانع «بمباران پیامکی» یک قربانی
 *  • هر IP: ۱۰ درخواست در یک ساعت — مانع سوءاستفاده انبوه
 *
 * پاسخ عمداً نمی‌گوید شماره از قبل ثبت شده یا نه (جلوگیری از شمارش شماره‌ها).
 */
export async function POST(request: Request) {
  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const phone = normalizeIranianMobile(body.phone)
  if (!isIranianMobile(phone)) {
    return badRequest('شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.', {
      phone: 'شماره همراه معتبر وارد کنید.',
    })
  }

  const ip = clientIp(request)

  const perPhone = rateLimit(`otp:req:phone:${phone}`, { limit: 3, windowMs: 2 * 60_000 })
  if (!perPhone.ok) return tooManyRequests(perPhone.retryAfterSeconds)

  const perIp = rateLimit(`otp:req:ip:${ip}`, { limit: 10, windowMs: 60 * 60_000 })
  if (!perIp.ok) return tooManyRequests(perIp.retryAfterSeconds)

  const issued = await issueOtp(phone)
  if (!issued) {
    return badRequest('شماره همراه معتبر نیست.', { phone: 'شماره همراه معتبر وارد کنید.' })
  }

  const sms = await sendOtpSms(issued.phone, issued.code)

  return jsonOk({
    sent: true,
    phone: issued.phone,
    expiresIn: issued.ttlSeconds,
    /**
     * کد فقط در حالت توسعه برگردانده می‌شود، و آن هم تنها وقتی پیامک واقعی
     * نرفته باشد. `isOtpDevMode` در تولید همیشه false است، پس این فیلد در
     * محیط واقعی هرگز پر نمی‌شود — حتی اگر ارسال پیامک خطا بدهد.
     */
    devCode: isOtpDevMode() && !sms.delivered ? issued.code : undefined,
    /** اگر پیامک واقعی نرفت، به کاربر بگویید دوباره تلاش کند */
    smsDelivered: sms.delivered,
    ...(sms.error ? { smsError: sms.error } : {}),
  })
}
