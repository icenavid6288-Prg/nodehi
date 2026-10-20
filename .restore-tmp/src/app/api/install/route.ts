import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { InstallError, getInstallState, runInstall } from '@/lib/server/install'
import { badRequest, clientIp, jsonError, jsonOk, tooManyRequests } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'
import { isIranianMobile, normalizeIranianMobile, readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * API نصب خودکار سایت.
 *
 * GET  — وضعیت نصب (بدون افشای هیچ رازی) برای رندر صفحه /install.
 * POST — اجرای واقعی نصب: مهاجرت جداول + داده اولیه با شماره مدیر دلخواه.
 *
 * قفل: پس از کامل‌شدن نصب (ساخته‌شدن حساب مدیر) هر دو مسیر ۴۰۴ می‌شوند تا
 * مسیر نصب برای همیشه بسته شود. اگر INSTALL_TOKEN تنظیم شده باشد، POST
 * آن مقدار را هم می‌خواهد — روی هاست عمومی پیش از انتشار حتماً تنظیم شود.
 *
 * محدودیت نرخ: ۵ اجرا در هر ۱۰ دقیقه برای هر IP — تا مسیر نصب شکنجه‌پذیر نباشد.
 */

/** مقایسه امن توکن — طول و محتوا بدون نشت زمان بررسی می‌شود */
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function GET() {
  const state = await getInstallState()
  // نصب‌شده؟ مسیر نصب دیگر وجود ندارد
  if (state.installed) {
    return jsonError(404, { code: 'not_found', message: 'درخواست نامعتبر است.' })
  }
  return jsonOk({ state })
}

export async function POST(request: Request) {
  // نصب‌شده؟ پیش از هر بررسی دیگری ۴۰۴ — قفل دائمی
  const state = await getInstallState()
  if (state.installed) {
    return jsonError(404, { code: 'not_found', message: 'درخواست نامعتبر است.' })
  }

  const limit = rateLimit(`install:${clientIp(request)}`, { limit: 5, windowMs: 600_000 })
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds)

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست معتبر نیست.')

  // توکن نصب — فقط وقتی در محیط تعریف شده باشد اجباری است
  const expectedToken = process.env.INSTALL_TOKEN?.trim()
  if (expectedToken) {
    const provided = typeof body.token === 'string' ? body.token : ''
    if (!tokenMatches(provided, expectedToken)) {
      return jsonError(403, {
        code: 'invalid_token',
        message: 'توکن نصب معتبر نیست. مقدار INSTALL_TOKEN را در تنظیمات محیطی سرور وارد کنید.',
      })
    }
  }

  // شماره مدیر — همان شماره‌ای که با آن وارد پنل می‌شوید
  const rawPhone = typeof body.adminPhone === 'string' ? body.adminPhone : ''
  if (!isIranianMobile(rawPhone)) {
    return badRequest('شماره همراه مدیر معتبر نیست.', {
      adminPhone: 'شماره را با ۰۹ و ۱۱ رقم وارد کنید.',
    })
  }
  const adminPhone = normalizeIranianMobile(rawPhone)

  try {
    const steps = await runInstall({ adminPhone })
    return jsonOk({ steps, adminPhone })
  } catch (error) {
    if (error instanceof InstallError) {
      // لاگ هر گام تا نقطه خطا برمی‌گردد تا عیب‌یابی از همان صفحه ممکن باشد
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'install_failed', message: error.message },
          steps: error.steps,
        },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    return jsonError(500, {
      code: 'install_failed',
      message: 'خطای غیرمنتظره در نصب. لاگ سرور را ببینید.',
    })
  }
}
