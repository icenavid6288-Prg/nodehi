import { jsonOk } from '@/lib/server/http'
import { getPublicSettings } from '@/lib/server/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * تنظیمات عمومی سایت — بدون احراز هویت.
 * GET /api/settings/public
 *
 * ── چرا این مسیر لازم است؟ ──
 * نوار اعلان در هدر سایت زندگی می‌کند و هدر در چیدمان ریشه است. اگر مقدار
 * اعلان را در چیدمان ریشه از دیتابیس می‌خواندیم، **همه صفحه‌های سایت** از
 * حالت ایستا خارج و در هر درخواست رندر می‌شدند. با این مسیر، فقط نوار اعلان
 * در مرورگر مقدارش را می‌گیرد و بقیه سایت ایستا می‌ماند.
 *
 * ⚠️ فقط کلیدهایی با `public: true` و غیرحساس برمی‌گردند؛ فهرست در
 * `lib/server/settings.ts` تعیین می‌شود، نه با فیلتر نام در اینجا.
 */
export async function GET() {
  const settings = await getPublicSettings()
  return jsonOk({ settings })
}
