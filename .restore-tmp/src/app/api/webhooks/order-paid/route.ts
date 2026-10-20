import { clientIp, jsonError, jsonOk, tooManyRequests } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'
import { SIGNATURE_HEADER, verifySignature } from '@/lib/server/webhook'
import { cleanText } from '@/lib/server/validation'

/** به node:crypto برای HMAC نیاز داریم، پس صریحاً رانتایم Node را انتخاب می‌کنیم */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * دریافت رویداد پرداخت موفق از درگاه یا از اتوماسیون (n8n / Make).
 * POST /api/webhooks/order-paid
 *
 * امنیت این مسیر حیاتی است، چون می‌تواند وضعیت سفارش را تغییر دهد:
 *  ۱) امضای HMAC-SHA256 روی بدنه خام بررسی می‌شود (مقایسه زمان‌ثابت).
 *  ۲) بدون تنظیم NODEHI_WEBHOOK_SECRET مسیر با ۵۰۳ بسته می‌شود تا
 *     هرگز در حالت «بدون محافظت» اجرا نشود.
 *  ۳) محدودیت نرخ برای جلوگیری از حمله Brute Force روی امضا.
 *  ۴) پاسخ ۲۰۲ برای رویداد تکراری برمی‌گردد تا پردازش idempotent بماند.
 */
export async function POST(request: Request) {
  const secret = process.env.NODEHI_WEBHOOK_SECRET
  if (!secret) {
    return jsonError(503, {
      code: 'webhook_disabled',
      message: 'دریافت وبهوک فعال نیست: متغیر محیطی NODEHI_WEBHOOK_SECRET تنظیم نشده است.',
    })
  }

  const ip = clientIp(request)
  const limited = rateLimit(`webhook:order-paid:${ip}`, { limit: 60, windowMs: 60_000 })
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  // امضا روی بدنه «خام» محاسبه می‌شود، پس باید متن را دست‌نخورده بخوانیم.
  const rawBody = await request.text()
  if (rawBody.length > 100_000) {
    return jsonError(413, { code: 'payload_too_large', message: 'حجم بدنه درخواست بیش از حد مجاز است.' })
  }

  const signature = request.headers.get(SIGNATURE_HEADER)
  if (!verifySignature(rawBody, signature, secret)) {
    return jsonError(401, {
      code: 'invalid_signature',
      message: 'امضای وبهوک معتبر نیست.',
    })
  }

  let payload: Record<string, unknown>
  try {
    const parsed = JSON.parse(rawBody)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid')
    payload = parsed as Record<string, unknown>
  } catch {
    return jsonError(400, { code: 'invalid_json', message: 'بدنه وبهوک JSON معتبر نیست.' })
  }

  const orderId = cleanText(payload.orderId ?? payload.order_id, 60)
  const status = cleanText(payload.status, 40) || 'paid'
  const transactionId = cleanText(payload.transactionId ?? payload.transaction_id, 120)

  if (!orderId) {
    return jsonError(400, {
      code: 'missing_order_id',
      message: 'شناسه سفارش (orderId) در بدنه وبهوک یافت نشد.',
    })
  }

  // TODO(db): به‌روزرسانی وضعیت سفارش در یک تراکنش، ثبت تراکنش پرداخت و
  // اطمینان از idempotency با قید یکتایی روی (orderId, transactionId).
  // سپس اعلام رویداد order.paid برای زنجیره ارسال و پیامک.

  return jsonOk(
    {
      received: true,
      orderId,
      status,
      transactionId: transactionId || null,
      processedAt: new Date().toISOString(),
    },
    202,
  )
}
