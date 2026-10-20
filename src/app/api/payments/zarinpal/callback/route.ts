import { NextResponse } from 'next/server'
import { settleOnlinePayment } from '@/lib/server/payments/flow'
import { clientIp } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * بازگشت کاربر از درگاه زرین‌پال.
 * GET /api/payments/zarinpal/callback?Authority=...&Status=OK|NOK
 *
 * ── چرا این مسیر جدا از `api/webhooks/order-paid` است؟ ──
 * آن مسیر برای رویدادهای «ماشینی» اتوماسیون است و با امضای HMAC محافظت
 * می‌شود. بازگشت مرورگر کاربر امضا ندارد و نمی‌تواند داشته باشد؛ پس باید
 * بی‌نیاز از امضا و امن به‌تنهایی باشد. امنیتش از دو چیز می‌آید:
 *  ۱) `authority` یک راز یکتای ۳۶ کاراکتری است که فقط درگاه می‌داند.
 *  ۲) به `Status` بازگشتی اعتماد نمی‌شود؛ همیشه متد verify صدا زده می‌شود.
 * پس حتی اگر کسی این آدرس را با authority حدسی باز کند، تا وقتی تراکنش در
 * زرین‌پال واقعاً تأیید نشود هیچ سفارشی paid نمی‌شود.
 *
 * پاسخ این مسیر همیشه یک ریدایرکت به صفحه نتیجه است، نه JSON: کاربر با
 * مرورگر به اینجا آمده است و باید صفحه‌ای ببیند که وضعیت را توضیح دهد.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)

  // زرین‌پال پارامترها را با حرف بزرگ اول می‌فرستد؛ هر دو حالت پذیرفته می‌شود.
  const authority = (
    url.searchParams.get('Authority') ??
    url.searchParams.get('authority') ??
    ''
  ).trim()
  const gatewayStatus = url.searchParams.get('Status') ?? url.searchParams.get('status')

  const limited = rateLimit(`zarinpal:callback:${clientIp(request)}`, {
    limit: 60,
    windowMs: 60_000,
  })
  if (!limited.ok) {
    return redirectToResult(url.origin, { state: 'unknown', orderNumber: null, code: null })
  }

  const result = await settleOnlinePayment({ authority, gatewayStatus })

  return redirectToResult(url.origin, {
    state: result.state,
    orderNumber: result.orderNumber,
    code: result.ok ? null : result.code,
  })
}

/**
 * ریدایرکت ۳۰۳ به صفحه نتیجه.
 *
 * متن خطا از دیتابیس/درگاه **در آدرس منتقل نمی‌شود**؛ فقط کد و وضعیت
 * می‌رود و صفحه نتیجه متن فارسی را از همان جدول ترجمه درگاه می‌سازد. اگر
 * متن خام را در query می‌فرستادیم، هر کسی می‌توانست با ساختن لینک، صفحه
 * سایت را با پیام دلخواه خودش نشان دهد.
 */
function redirectToResult(
  origin: string,
  input: { state: string; orderNumber: string | null; code: number | null },
): NextResponse {
  const params = new URLSearchParams()
  params.set('state', input.state)
  if (input.orderNumber) params.set('order', input.orderNumber)
  if (input.code !== null) params.set('code', String(input.code))

  return NextResponse.redirect(new URL(`/checkout/result?${params.toString()}`, origin), 303)
}
