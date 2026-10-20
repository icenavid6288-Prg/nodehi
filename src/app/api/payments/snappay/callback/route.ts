import { NextResponse } from 'next/server'
import { settleSnappayFlow } from '@/lib/server/payments/snappay-flow'
import { clientIp } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * بازگشت کاربر از صفحه اقساط‌بندی اسنپ‌پی.
 * GET /api/payments/snappay/callback?paymentToken=...
 *
 * امنیت همان الگوی کال‌بک زرین‌پال است: به هیچ پارامتری جز شناسه تراکنش
 * اعتماد نمی‌شود و وضعیت نهایی همیشه از پاسخ verify می‌آید. `paymentToken`
 * در ستون یکتای `paymentAuthority` ذخیره شده، پس نگاشت بازگشت→سفارش امن است.
 *
 * پاسخ همیشه ریدایرکت به صفحه نتیجه است، نه JSON.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)

  // اسنپ‌پی نام پارامتر را در نسخه‌های مختلف paymentToken یا token فرستاده است
  const paymentToken = (
    url.searchParams.get('paymentToken') ??
    url.searchParams.get('token') ??
    ''
  ).trim()

  const limited = rateLimit(`snappay:callback:${clientIp(request)}`, {
    limit: 60,
    windowMs: 60_000,
  })
  if (!limited.ok) {
    return redirectToResult(url.origin, { state: 'unknown', orderNumber: null })
  }

  const result = await settleSnappayFlow({ paymentToken })

  return redirectToResult(url.origin, {
    state: result.state,
    orderNumber: result.orderNumber,
  })
}

/**
 * ریدایرکت ۳۰۳ به صفحه نتیجه.
 * کدهای خطای اسنپ‌پی متنی‌اند (نه عددی) و در آدرس منتقل نمی‌شوند؛ صفحه نتیجه
 * فقط state را می‌شناسد — همان قاعده ضد جعل query زرین‌پال.
 */
function redirectToResult(
  origin: string,
  input: { state: string; orderNumber: string | null },
): NextResponse {
  const params = new URLSearchParams()
  params.set('state', input.state)
  if (input.orderNumber) params.set('order', input.orderNumber)
  params.set('gateway', 'snappay')

  return NextResponse.redirect(new URL(`/checkout/result?${params.toString()}`, origin), 303)
}
