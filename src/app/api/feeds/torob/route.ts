import { prisma } from '@/lib/db'
import { getBooleanSetting, getSetting } from '@/lib/server/settings'
import { jsonError, jsonOk } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * فید کالاها برای مقایسه‌گر قیمت ترب.
 *
 * ── چرا تا وقتی خاموش است ۴۰۴ می‌دهد؟ ──
 * یکپارچه‌سازی به‌صورت پیش‌فرض غیرفعال است و تنظیم آن تنها از پنل مدیریت
 * (فقط مدیر کل) انجام می‌شود. با پاسخ ۴۰۴، وجود چنین مسیری از بیرون معلوم
 * نیست — همان قاعده‌ای که برای مسیرهای پنل هم داریم. تازگی: پاسخ کش نمی‌شود
 * تا قیمت و موجودی همیشه از دیتابیس فعلی بیاید.
 *
 * فرمت: آرایه‌ای از کالاها با شناسه (نامک)، عنوان، قیمت تومان، موجودی و
 * آدرس مطلق صفحه محصول — قابل ثبت در پنل ترب.
 */
export async function GET(request: Request) {
  if (!(await getBooleanSetting('integration.torob.enabled'))) {
    return jsonError(404, { code: 'not_found', message: 'چنین مسیری وجود ندارد.' })
  }

  const [storeName, products] = await Promise.all([
    getSetting('integration.torob.storeName'),
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, name: true, price: true, compareAtPrice: true, stock: true, images: true },
      orderBy: { price: 'desc' },
    }),
  ])

  const origin = new URL(request.url).origin

  return jsonOk({
    store: storeName ?? null,
    items: products.map((product) => {
      let imageUrl: string | null = null
      try {
        const images = JSON.parse(product.images) as unknown
        if (Array.isArray(images) && typeof images[0] === 'string' && images[0].length > 0) {
          imageUrl = images[0]
        }
      } catch {
        // آرایه تصاویر خراب است؛ فید نباید به‌خاطرش بشکند
        imageUrl = null
      }

      return {
        pid: product.slug,
        title: product.name,
        price: product.price,
        old_price: product.compareAtPrice,
        availability: product.stock > 0,
        url: `${origin}/product/${product.slug}`,
        image_url: imageUrl,
      }
    }),
  })
}
