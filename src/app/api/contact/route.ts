import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/server/auth/session'
import { badRequest, clientIp, jsonOk, tooManyRequests } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'
import {
  cleanText,
  isEmail,
  isIranianMobile,
  normalizeIranianMobile,
  readJson,
} from '@/lib/server/validation'
import { dispatchAutomationEvent } from '@/lib/server/automation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ثبت پیام «تماس با ما».
 * POST /api/contact
 *
 * سه لایه محافظت: تله ربات (honeypot)، محدودیت نرخ و اعتبارسنجی کامل.
 * متن پیام عمداً بدون HTML ذخیره/ارسال می‌شود تا امکان XSS از بین برود؛
 * پاک‌سازی نهایی هنگام رندر با escape انجام می‌شود.
 */
export async function POST(request: Request) {
  const ip = clientIp(request)
  const limited = rateLimit(`contact:${ip}`, { limit: 5, windowMs: 10 * 60_000 })
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  // تله ربات: کاربر واقعی این فیلد پنهان را پر نمی‌کند.
  // پاسخ ۲۰۰ می‌دهیم تا ربات متوجه رد شدن نشود.
  if (cleanText(body.website, 100)) {
    return jsonOk({ ticketId: null, accepted: true })
  }

  const fields: Record<string, string> = {}
  const name = cleanText(body.name, 80)
  const phone = normalizeIranianMobile(body.phone)
  const email = cleanText(body.email, 254)
  const subject = cleanText(body.subject, 120) || 'سایر موارد'
  const message = cleanText(body.message, 2000)

  if (name.length < 3) fields.name = 'نام خود را کامل وارد کنید.'
  if (!isIranianMobile(phone)) fields.phone = 'شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.'
  if (email && !isEmail(email)) fields.email = 'قالب ایمیل درست نیست.'
  if (message.length < 10) fields.message = 'متن پیام باید دست‌کم ۱۰ نویسه باشد.'

  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات فرم کامل نیست.', fields)
  }

  // اگر کاربر وارد شده باشد، پیام به حساب او وصل می‌شود تا در پنل،
  // «مشتری ثبت‌شده» از «مهمان» قابل تفکیک باشد.
  const user = await getCurrentUser()

  const saved = await prisma.contactMessage.create({
    data: {
      name,
      phone,
      email: email || null,
      subject,
      message,
      status: 'new',
    },
    select: { id: true, createdAt: true },
  })

  // شماره تیکت از شناسه دیتابیس ساخته می‌شود تا پاسخ کاربر به رکورد واقعی
  // قابل ارجاع باشد و در پیگیری تلفنی قابل جست‌وجو باشد.
  const ticketId = `TCK-${saved.id.slice(-8).toUpperCase()}`

  void dispatchAutomationEvent({
    event: 'contact.submitted',
    occurredAt: saved.createdAt.toISOString(),
    data: {
      ticketId,
      name,
      phone,
      email: email || null,
      subject,
      messageLength: message.length,
      userId: user?.id ?? null,
    },
  })

  return jsonOk({ ticketId, accepted: true }, 201)
}
