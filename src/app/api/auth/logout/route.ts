import { destroyCurrentSession } from '@/lib/server/auth/session'
import { jsonOk } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * خروج از حساب کاربری.
 * POST /api/auth/logout
 *
 * رکورد نشست از دیتابیس حذف و کوکی پاک می‌شود. چون توکن در سرور باطل
 * می‌گردد، حتی اگر کسی کوکی را کپی کرده باشد دیگر کار نمی‌کند.
 */
export async function POST() {
  await destroyCurrentSession()
  return jsonOk({ loggedOut: true })
}
