/**
 * ابزارهای مشترک پاسخ HTTP برای API routes.
 * قالب پاسخ‌ها یکسان است تا کلاینت‌ها (و n8n) بتوانند به‌صورت یکنواخت
 * خطاها را تشخیص دهند: { ok: false, error: { code, message, fields? } }
 */

import { NextResponse } from 'next/server'

/** پاسخ موفق با پاکت استاندارد */
export function jsonOk<T extends object>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status })
}

export interface ApiErrorBody {
  code: string
  message: string
  /** خطاهای فیلد‌به‌فیلد برای فرم‌ها */
  fields?: Record<string, string>
}

/** پاسخ خطا با پاکت استاندارد */
export function jsonError(status: number, error: ApiErrorBody): NextResponse {
  return NextResponse.json(
    { ok: false, error },
    {
      status,
      headers: {
        // از کش‌شدن پاسخ‌های خطا جلوگیری می‌کنیم
        'Cache-Control': 'no-store',
      },
    },
  )
}

/** خطای ۴۰۰ برای ورودی نامعتبر */
export function badRequest(message: string, fields?: Record<string, string>): NextResponse {
  return jsonError(400, { code: 'invalid_input', message, fields })
}

/** خطای ۴۰۵ برای محدودیت نرخ درخواست */
export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: 'rate_limited',
        message: 'تعداد درخواست‌های شما بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
      },
    },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterSeconds))) } },
  )
}

/**
 * استخراج IP کاربر.
 * روی پراکسی (لیارا/آروان/کلودفلر) از هدرهای استاندارد خوانده می‌شود و
 * در نهایت به یک مقدار ثابت برمی‌گردد تا محدودیت نرخ هرگز بی‌اثر نشود.
 */
export function clientIp(request: Request): string {
  const headers = request.headers
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return (
    headers.get('x-real-ip') ??
    headers.get('cf-connecting-ip') ??
    headers.get('x-vercel-forwarded-for') ??
    'unknown'
  )
}
