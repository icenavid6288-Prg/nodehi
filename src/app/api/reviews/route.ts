import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getProduct } from '@/lib/server/catalog'
import { getCurrentUser } from '@/lib/server/auth/session'
import { badRequest, clientIp, jsonError, jsonOk, tooManyRequests } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'
import { writeAuditLog } from '@/lib/server/orders'
import { cleanText, readJson, toPositiveInt } from '@/lib/server/validation'
import { dispatchAutomationEvent } from '@/lib/server/automation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIN_RATING = 1
const MAX_RATING = 5

/**
 * نظرات تأییدشده یک محصول.
 * GET /api/reviews?slug=...
 *
 * چرا از سرور و بعد از بارگذاری؟ صفحه محصول به‌صورت ثابت (SSG) ساخته
 * می‌شود تا سریع و سئوپذیر بماند. اگر نظرها را در همان رندر می‌خواندیم، صفحه
 * با هر نظر تازه باید از نو ساخته می‌شد. با این تفکیک: نظرهای کاتالوگ داخل
 * HTML می‌مانند (برای موتور جستجو) و نظرهای واقعی کاربران به‌صورت زنده اضافه
 * می‌شوند.
 */
export async function GET(request: Request) {
  const ip = clientIp(request)
  const limited = rateLimit(`reviews-read:${ip}`, { limit: 60, windowMs: 60_000 })
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const slug = cleanText(new URL(request.url).searchParams.get('slug'), 120)
  if (!slug || !(await getProduct(slug))) {
    return badRequest('نامک محصول معتبر نیست.')
  }

  const rows = await prisma.review.findMany({
    // فقط تأییدشده‌ها عمومی می‌شوند؛ نظر در انتظار یا ردشده نباید بیرون بیاید
    where: { productSlug: slug, status: 'approved' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, author: true, rating: true, title: true, body: true, createdAt: true },
  })

  return jsonOk({
    reviews: rows.map((row) => ({
      id: row.id,
      author: row.author,
      rating: row.rating,
      title: row.title,
      body: row.body,
      date: row.createdAt.toISOString(),
      verified: true,
      helpfulCount: 0,
    })),
  })
}

/**
 * ثبت نظر تازه.
 * POST /api/reviews   { slug, rating, title, body }
 *
 * نظر تازه با وضعیت `pending` ذخیره می‌شود و تا تأیید کارشناس روی صفحه
 * محصول دیده نمی‌شود. ورود کاربر الزامی است؛ دلیلش دو چیز است: جلوگیری از
 * نظر انبوه ناشناس، و امکان تشخیص «خرید تأییدشده».
 */
export async function POST(request: Request) {
  const ip = clientIp(request)
  const limited = rateLimit(`reviews-write:${ip}`, { limit: 5, windowMs: 30 * 60_000 })
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const user = await getCurrentUser()
  if (!user) {
    return jsonError(401, { code: 'unauthorized', message: 'برای ثبت نظر ابتدا با شماره همراه وارد شوید.' })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const slug = cleanText(body.slug, 120)
  const title = cleanText(body.title, 120)
  const text = cleanText(body.body, 2000)
  const rating = toPositiveInt(body.rating)

  const fields: Record<string, string> = {}
  if (!slug || !(await getProduct(slug))) {
    return jsonError(404, { code: 'not_found', message: 'محصول مورد نظر یافت نشد.' })
  }
  if (rating === null || rating < MIN_RATING || rating > MAX_RATING) {
    fields.rating = 'امتیاز باید بین ۱ تا ۵ ستاره باشد.'
  }
  if (title.length < 3) fields.title = 'عنوان نظر را کامل‌تر بنویسید.'
  if (text.length < 10) fields.body = 'متن نظر باید دست‌کم ۱۰ نویسه باشد.'

  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات نظر کامل نیست.', fields)
  }

  // نام نمایشی همان لحظه ثبت کپی می‌شود تا تغییر بعدی نام کاربر، نظرهای
  // قدیمی را عوض نکند.
  const author = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'کاربر نودهی'

  try {
    const created = await prisma.review.create({
      data: {
        productSlug: slug,
        userId: user.id,
        author,
        rating: rating as number,
        title,
        body: text,
        status: 'pending',
      },
      select: { id: true, status: true },
    })

    await writeAuditLog({
      actorId: user.id,
      action: 'review.submitted',
      entity: 'Review',
      entityId: created.id,
      metadata: { productSlug: slug, rating },
      ip,
      userAgent: request.headers.get('user-agent'),
    })

    void dispatchAutomationEvent({
      event: 'review.submitted',
      occurredAt: new Date().toISOString(),
      data: { reviewId: created.id, productSlug: slug, rating, author },
    })

    return jsonOk({ review: created }, 201)
  } catch (error) {
    // قید یکتایی (کاربر + محصول): هر کاربر برای هر کالا فقط یک نظر
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError(409, {
        code: 'already_reviewed',
        message: 'شما قبلاً برای این کالا نظر ثبت کرده‌اید. هر کاربر برای هر کالا یک نظر می‌تواند بنویسد.',
      })
    }
    throw error
  }
}
