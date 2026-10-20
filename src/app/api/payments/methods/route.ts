import { enabledPaymentMethods } from '@/lib/server/gateways'
import { jsonOk } from '@/lib/server/http'
import { isSnappayAvailable } from '@/lib/server/payments/snappay-flow'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * روش‌های پرداخت موجود در تسویه.
 * GET /api/payments/methods
 *
 * صفحه تسویه این را می‌خواند تا فقط روش‌هایی را نشان دهد که **سرور** واقعاً
 * قبول می‌کند — نه لیست ثابت کلاینت. بدون این، کاربر «اسنپ‌پی» را می‌دید،
 * انتخاب می‌کرد و در ثبت سفارش خطای «فعال نیست» می‌گرفت؛ یا برعکس، روشی که
 * پنل خاموشش کرده در فهرست می‌ماند.
 *
 * عمومی است (بدون احراز هویت) چون صفحه تسویه مهمان هم می‌خواند و فقط نام
 * کلیدها را برمی‌گرداند — هیچ داده حساسی ندارد.
 */
export async function GET() {
  const [base, snappayAvailable] = await Promise.all([enabledPaymentMethods(), isSnappayAvailable()])

  const methods = base.filter((key) => key !== 'snappay')
  if (snappayAvailable) methods.push('snappay')

  return jsonOk({ methods })
}
