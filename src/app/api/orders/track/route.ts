import { badRequest, clientIp, jsonError, jsonOk, tooManyRequests } from '@/lib/server/http'
import { findOrderForTracking } from '@/lib/server/orders'
import { rateLimit } from '@/lib/server/rate-limit'
import { cleanText, isIranianMobile, normalizeIranianMobile, readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * پیگیری سفارش برای مهمان.
 * POST /api/orders/track   { orderNumber, phone }
 *
 * دو محافظت لازم است:
 *  • شماره سفارش + شماره همراه باید هر دو بخوانند، وگرنه هر کسی می‌توانست
 *    سفارش دیگران را با حدس شماره ۶ رقمی ببیند.
 *  • محدودیت نرخ، تا شماره‌ها قابل جست‌وجوی انبوه نباشند.
 */
export async function POST(request: Request) {
  const ip = clientIp(request)
  const limited = rateLimit(`track:${ip}`, { limit: 15, windowMs: 10 * 60_000 })
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const orderNumber = cleanText(body.orderNumber, 32).toUpperCase()
  const phone = normalizeIranianMobile(body.phone)

  const fields: Record<string, string> = {}
  if (!/^ND-\d{6,}$/.test(orderNumber)) {
    fields.orderNumber = 'شماره سفارش با ND- شروع می‌شود و ۶ رقم دارد.'
  }
  if (!isIranianMobile(phone)) {
    fields.phone = 'شماره همراهی که با آن سفارش ثبت شده را وارد کنید.'
  }

  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات پیگیری کامل نیست.', fields)
  }

  const order = await findOrderForTracking(orderNumber, phone)

  // پیام یکسان برای «سفارش ناموجود» و «شماره همراه نامطابق» — تا کسی نتواند
  // با پاسخ‌های متفاوت، وجود یک شماره سفارش را کشف کند.
  if (!order) {
    return jsonError(404, {
      code: 'not_found',
      message: 'سفارشی با این شماره سفارش و شماره همراه پیدا نشد. اطلاعات را بررسی کنید.',
    })
  }

  return jsonOk({ order })
}
