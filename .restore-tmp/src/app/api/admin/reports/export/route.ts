import { getStaffUser } from '@/lib/server/admin'
import { badRequest, jsonError } from '@/lib/server/http'
import {
  buildInventoryCsv,
  buildOrdersCsv,
  buildSalesCsv,
  getSalesReport,
  parseRange,
  toInputDate,
} from '@/lib/server/reports'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * خروجی CSV گزارش‌ها.
 * GET /api/admin/reports/export?type=sales&range=30d
 *   type=sales      گزارش جمعی (خلاصه، روزانه، وضعیت، پرداخت، پرفروش‌ها)
 *   type=orders     یک ردیف برای هر سفارش — مناسب حسابداری
 *   type=inventory  موجودی و وضعیت انبار
 *
 * حسابدار هم می‌تواند فایل بگیرد، چون این مسیر فقط خواندن است.
 * پیشوند BOM در همهٔ فایل‌ها هست تا اکسل فارسی متن را درست بخواند.
 */
export async function GET(request: Request) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get('type') ?? 'sales'
  if (!['sales', 'orders', 'inventory'].includes(type)) {
    return badRequest('نوع گزارش معتبر نیست.')
  }

  const range = parseRange({
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    range: url.searchParams.get('range') ?? undefined,
  })

  let csv: string
  if (type === 'orders') csv = await buildOrdersCsv(range)
  else if (type === 'inventory') csv = await buildInventoryCsv()
  else csv = buildSalesCsv(await getSalesReport(range))

  // در بازهٔ سرتاسری، مرز شروع «ابتدای زمان» است و تاریخ ۱۹۷۰ در نام فایل بی‌معنی می‌شود
  const stamp = range.allTime
    ? 'all-time'
    : `${toInputDate(range.from)}_${toInputDate(range.to)}`
  // نام فایل لاتین می‌ماند: نام فارسی در هدر Content-Disposition نیاز به
  // کدگذاری RFC 5987 دارد و مرورگرهای قدیمی‌تر آن را خراب نشان می‌دهند
  const filename = `nodehi-${type}-${stamp}.csv`

  return new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}
