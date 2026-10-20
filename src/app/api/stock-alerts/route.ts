import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getProduct } from '@/lib/server/catalog'
import { getCurrentUser } from '@/lib/server/auth/session'
import { badRequest, clientIp, jsonError, jsonOk, tooManyRequests } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'
import {
  cleanText,
  isEmail,
  isIranianMobile,
  normalizeIranianMobile,
  readJson,
} from '@/lib/server/validation'
import { dispatchAutomationEvent } from '@/lib/server/automation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ثبت درخواست «خبرم کن موجود شد».
 * POST /api/stock-alerts  { slug, phone, email? }
 *
 * کاربرد: محصول ناموجود است و کاربر می‌خواهد با موجود شدن مطلع شود.
 * رویداد به اتوماسیون فرستاده می‌شود تا هنگام شارژ موجودی، پیامک/ایمیل
 * اطلاع‌رسانی خودکار ارسال گردد.
 *
 * کلید یکتایی (محصول + شماره همراه) در دیتابیس تعریف شده است، پس ثبت دوباره
 * همان کاربر برای همان کالا، رکورد تازه نمی‌سازد و پیامک تکراری نمی‌فرستد.
 * کانال اصلی اطلاع‌رسانی پیامک است، بنابراین شماره همراه الزامی است و ایمیل
 * فقط مکمل اختیاری است.
 */
export async function POST(request: Request) {
  const ip = clientIp(request)
  const limited = rateLimit(`stock-alert:${ip}`, { limit: 10, windowMs: 60 * 60_000 })
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const slug = cleanText(body.slug, 120)
  const phone = normalizeIranianMobile(body.phone)
  const email = cleanText(body.email, 254)

  const product = await getProduct(slug)
  if (!product) {
    return jsonError(404, { code: 'not_found', message: 'محصول مورد نظر یافت نشد.' })
  }

  const fields: Record<string, string> = {}
  if (!isIranianMobile(phone)) {
    fields.phone = 'برای اطلاع‌رسانی پیامکی، شماره همراه معتبر وارد کنید.'
  }
  if (email && !isEmail(email)) fields.email = 'قالب ایمیل درست نیست.'
  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات تماس معتبر نیست.', fields)
  }

  // اگر کالا موجود است، ثبت هشدار معنا ندارد و به کاربر اطلاع می‌دهیم.
  if (product.stock > 0) {
    return jsonOk({ alreadyAvailable: true, productName: product.name, subscribed: false })
  }

  const existing = await prisma.stockAlert.findUnique({
    where: { productSlug_phone: { productSlug: slug, phone } },
  })

  const user = await getCurrentUser()

  // اگر قبلاً ثبت شده و هنوز اطلاع نداده‌ایم، دوباره پیام نمی‌فرستیم.
  if (existing) {
    return jsonOk({
      subscribed: true,
      alreadySubscribed: true,
      subscriptionId: existing.id,
      productName: product.name,
    })
  }

  try {
    const created = await prisma.stockAlert.create({
      data: {
        productSlug: slug,
        phone,
        email: email || null,
        userId: user?.id ?? null,
      },
      select: { id: true, createdAt: true },
    })

    void dispatchAutomationEvent({
      event: 'stock_alert.created',
      occurredAt: created.createdAt.toISOString(),
      data: {
        subscriptionId: created.id,
        slug,
        productName: product.name,
        phone,
        email: email || null,
      },
    })

    return jsonOk(
      { subscribed: true, alreadySubscribed: false, subscriptionId: created.id, productName: product.name },
      201,
    )
  } catch (error) {
    // دو درخواست هم‌زمان: یکی برنده می‌شود و دیگری به قید یکتایی می‌خورد.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonOk({
        subscribed: true,
        alreadySubscribed: true,
        subscriptionId: null,
        productName: product.name,
      })
    }
    throw error
  }
}
