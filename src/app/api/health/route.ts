import { brand } from '@/config/brand'
import { getCatalog } from '@/lib/server/catalog'
import { jsonOk } from '@/lib/server/http'

/** این مسیر هرگز کش نمی‌شود تا سلامت لحظه‌ای را گزارش کند */
export const dynamic = 'force-dynamic'

/**
 * بررسی سلامت سرویس — برای مانیتورینگ، Load Balancer و بررسی استقرار.
 * GET /api/health
 */
export async function GET() {
  // حجم کاتالوگ از دیتابیس خوانده می‌شود؛ این عدد سريعترین نشانهٔ سالم بودن
  // اتصال دیتابیس در پایش است
  const catalog = await getCatalog()

  return jsonOk({
    status: 'healthy',
    service: brand.nameEn,
    version: process.env.APP_VERSION ?? '1.0.0',
    environment: process.env.NODE_ENV ?? 'development',
    catalogSize: catalog.products.length,
    timestamp: new Date().toISOString(),
  })
}
