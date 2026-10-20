import { computeTotals, resolveShippingMethod } from '@/lib/commerce'
import { productIndex } from '@/lib/server/catalog'
import { getCurrentUser } from '@/lib/server/auth/session'
import { isPaymentMethodEnabled } from '@/lib/server/gateways'
import { COUPON_REJECTION_MESSAGES, resolveCoupon } from '@/lib/server/coupons'
import { badRequest, clientIp, jsonError, jsonOk, tooManyRequests } from '@/lib/server/http'
import { createOrder, generateOrderNumber, writeAuditLog } from '@/lib/server/orders'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/server/rate-limit'
import {
  cleanText,
  isEmail,
  isIranianMobile,
  isIranianPostalCode,
  normalizeIranianMobile,
  readJson,
  toPositiveInt,
} from '@/lib/server/validation'
import { dispatchAutomationEvent } from '@/lib/server/automation'
import { startOnlinePayment } from '@/lib/server/payments/flow'
import { isSnappayAvailable, startSnappayPayment } from '@/lib/server/payments/snappay-flow'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** روش‌های پرداخت پشتیبانی‌شده */
const PAYMENT_METHODS = ['online', 'cod', 'installment', 'snappay'] as const
type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/** حداقل مبلغ سفارش برای خرید اقساطی */
const INSTALLMENT_MIN_TOTAL = 30_000_000

const MAX_LINES = 20
const MAX_QUANTITY_PER_LINE = 10

interface CheckoutLine {
  slug: string
  quantity: number
}

/**
 * بدنه پاسخ مربوط به پرداخت.
 *
 * برای پرداخت آنلاین، همین‌جا از درگاه authority گرفته می‌شود. اگر درگاه در
 * دسترس نباشد (`redirectUrl` تهی)، متن دقیق دلیل برگردانده می‌شود تا کاربر
 * به‌جای «خطای نامشخص» بداند مشکل کجاست؛ سفارش در هر حال ثبت شده است.
 * این تابع در مسیر تکراری هم صدا زده می‌شود: اگر کاربر دو بار روی «ثبت سفارش»
 * بزند، بار دوم همان لینک درگاه را می‌گیرد، نه یک پیام گمراه‌کننده.
 */
async function paymentEnvelope(method: string, orderId: string) {
  if (method === 'snappay') {
    const started = await startSnappayPayment({ orderId })
    return started.ok
      ? { gateway: 'snappay', redirectUrl: started.redirectUrl, sandbox: started.sandbox, note: null }
      : { gateway: 'snappay', redirectUrl: null, sandbox: null, note: started.message }
  }

  if (method !== 'online') {
    return {
      gateway: method === 'cod' ? 'cod' : 'installment',
      redirectUrl: null,
      sandbox: null,
      note: null,
    }
  }

  const started = await startOnlinePayment({ orderId })
  return started.ok
    ? { gateway: 'zarinpal', redirectUrl: started.redirectUrl, sandbox: started.sandbox, note: null }
    : { gateway: 'zarinpal', redirectUrl: null, sandbox: null, note: started.message }
}

/**
 * تسویه حساب و ثبت سفارش.
 * POST /api/checkout
 *
 * اصل امنیتی: قیمت هرگز از مرورگر پذیرفته نمی‌شود. کلاینت فقط نامک محصول و
 * تعداد می‌فرستد؛ سرور قیمت را از کاتالوگ می‌خواند، کد تخفیف را از دیتابیس
 * اعتبارسنجی می‌کند و مبلغ نهایی را حساب می‌کند. هر فیلد قیمتی در بدنه
 * (مثل price یا lineTotal) کاملاً نادیده گرفته می‌شود.
 *
 * اگر کاربر وارد شده باشد، سفارش به حسابش متصل می‌شود و در پنل کاربری
 * دیده می‌شود؛ در غیر این صورت سفارش مهمان ثبت می‌گردد.
 */
export async function POST(request: Request) {
  const ip = clientIp(request)
  const limited = rateLimit(`checkout:${ip}`, { limit: 10, windowMs: 10 * 60_000 })
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست باید یک شیء JSON معتبر باشد.')

  // ── ۰) جلوگیری از ثبت تکراری ──
  // اگر همین کلید قبلاً سفارش ساخته باشد، همان سفارش برگردانده می‌شود.
  const idempotencyKey = cleanText(request.headers.get('idempotency-key'), 100) || null
  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey },
      include: { items: true },
    })
    if (existing) {
      return jsonOk({
        order: {
          id: existing.orderNumber,
          status: existing.status,
          createdAt: existing.createdAt.toISOString(),
          totals: {
            subtotal: existing.subtotal,
            discount: existing.discount,
            shipping: existing.shipping,
            total: existing.total,
          },
        },
        payment: await paymentEnvelope(existing.paymentMethod, existing.id),
        duplicate: true,
      })
    }
  }

  const fields: Record<string, string> = {}

  // ── ۱) اعتبارسنجی اقلام ──
  const rawItems = Array.isArray(body.items) ? body.items : []
  if (rawItems.length === 0) {
    return badRequest('سبد خرید خالی است.', { items: 'سبد خرید خالی است.' })
  }
  if (rawItems.length > MAX_LINES) {
    return badRequest(`تعداد اقلام سفارش نمی‌تواند بیش از ${MAX_LINES} باشد.`, {
      items: 'تعداد اقلام بیش از حد مجاز است.',
    })
  }

  // کاتالوگ یک‌بار خوانده می‌شود، نه در هر قلم سفارش
  const catalogIndex = await productIndex(
    rawItems.map((entry) =>
      entry && typeof entry === 'object'
        ? cleanText((entry as Record<string, unknown>).slug, 120)
        : '',
    ),
  )

  const lines: CheckoutLine[] = []
  for (const entry of rawItems) {
    if (!entry || typeof entry !== 'object') return badRequest('یکی از اقلام سفارش نامعتبر است.')
    const record = entry as Record<string, unknown>
    const slug = cleanText(record.slug, 120)
    const quantity = toPositiveInt(record.quantity)

    if (!slug || !catalogIndex[slug]) {
      return badRequest('یکی از محصولات سفارش در فروشگاه یافت نشد.', {
        items: `محصول «${slug || 'نامشخص'}» در کاتالوگ موجود نیست.`,
      })
    }
    if (quantity === null || quantity > MAX_QUANTITY_PER_LINE) {
      return badRequest(`تعداد هر قلم باید بین ۱ تا ${MAX_QUANTITY_PER_LINE} باشد.`, {
        items: 'تعداد انتخابی نامعتبر است.',
      })
    }
    if (lines.some((line) => line.slug === slug)) {
      return badRequest('یک محصول نمی‌تواند دو بار در سفارش باشد.', {
        items: 'اقلام سبد تکراری هستند.',
      })
    }
    lines.push({ slug, quantity })
  }

  // ── ۲) بررسی موجودی و قیمت‌گذاری از منبع معتبر ──
  const pricedItems = []
  let subtotal = 0

  for (const line of lines) {
    const product = catalogIndex[line.slug]
    if (!product) {
      return jsonError(409, {
        code: 'product_unavailable',
        message: 'یکی از کالاهای سبد در فروشگاه موجود نیست.',
        fields: { items: 'یکی از کالاهای سبد حذف شده است.' },
      })
    }
    if (product.stock <= 0) {
      return jsonError(409, {
        code: 'out_of_stock',
        message: `«${product.name}» در حال حاضر موجود نیست.`,
        fields: { items: 'یکی از کالاهای سبد ناموجود شده است.' },
      })
    }
    if (line.quantity > product.stock) {
      return jsonError(409, {
        code: 'insufficient_stock',
        message: `از «${product.name}» تنها ${product.stock} عدد موجود است.`,
        fields: { items: 'موجودی کافی نیست.' },
      })
    }

    subtotal += product.price * line.quantity
    pricedItems.push({
      productSlug: product.slug,
      productName: product.name,
      unitPrice: product.price,
      quantity: line.quantity,
    })
  }

  // ── ۳) روش پرداخت ──
  const paymentMethodRaw = cleanText(body.paymentMethod, 20)
  if (!(PAYMENT_METHODS as readonly string[]).includes(paymentMethodRaw)) {
    return badRequest('روش پرداخت انتخابی پشتیبانی نمی‌شود.', {
      paymentMethod: 'روش پرداخت را دوباره انتخاب کنید.',
    })
  }
  const paymentMethod = paymentMethodRaw as PaymentMethod

  // روش پرداخت باید در پنل مدیریت فعال باشد. اگر هیچ درگاهی تنظیم نشده باشد،
  // `isPaymentMethodEnabled` اجازه می‌دهد تا نصب تازه بدون تنظیم اضافه کار کند.
  if (!(await isPaymentMethodEnabled(paymentMethod))) {
    return badRequest('این روش پرداخت در حال حاضر فعال نیست.', {
      paymentMethod: 'روش پرداخت دیگری انتخاب کنید.',
    })
  }

  // اسنپ‌پی علاوه بر فعال‌بودن، به اعتبارنامه کامل هم نیاز دارد؛ درخواست
  // دستی به API هم نمی‌تواند از این قفل عبور کند.
  if (paymentMethod === 'snappay' && !(await isSnappayAvailable())) {
    return badRequest('پرداخت اعتباری اسنپ‌پی در حال حاضر در دسترس نیست.', {
      paymentMethod: 'روش پرداخت دیگری انتخاب کنید.',
    })
  }

  // ── ۴) اطلاعات گیرنده ──
  const customerRaw =
    body.customer && typeof body.customer === 'object'
      ? (body.customer as Record<string, unknown>)
      : {}
  const firstName = cleanText(customerRaw.firstName, 60)
  const lastName = cleanText(customerRaw.lastName, 60)
  const phone = normalizeIranianMobile(customerRaw.phone)
  const email = cleanText(customerRaw.email, 254)
  const province = cleanText(customerRaw.province, 60)
  const city = cleanText(customerRaw.city, 60)
  const line = cleanText(customerRaw.line, 300)
  const postalCode = cleanText(customerRaw.postalCode, 20)

  if (firstName.length < 2) fields.firstName = 'نام را کامل وارد کنید.'
  if (lastName.length < 2) fields.lastName = 'نام خانوادگی را کامل وارد کنید.'
  if (!isIranianMobile(phone)) fields.phone = 'شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.'
  if (email && !isEmail(email)) fields.email = 'قالب ایمیل درست نیست.'
  if (province.length < 2) fields.province = 'استان را وارد کنید.'
  if (city.length < 2) fields.city = 'شهر را وارد کنید.'
  if (line.length < 10) fields.line = 'نشانی را کامل‌تر وارد کنید.'
  if (postalCode && !isIranianPostalCode(postalCode)) fields.postalCode = 'کد پستی باید ۱۰ رقم باشد.'

  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات ارسال سفارش کامل نیست.', fields)
  }

  // ── ۵) اعتبارسنجی کد تخفیف از دیتابیس (حکم نهایی) ──
  const couponCodeRaw = cleanText(body.couponCode, 40)
  let resolvedCoupon = null
  if (couponCodeRaw) {
    const result = await resolveCoupon(couponCodeRaw, subtotal)
    if (!result.ok) {
      const message = COUPON_REJECTION_MESSAGES[result.reason]
      return badRequest(message, { couponCode: 'این کد تخفیف پذیرفته نشد.' })
    }
    resolvedCoupon = result.coupon
  }

  // ── ۵.۵) روش ارسال ──
  // فقط شناسه روش از مرورگر می‌آید؛ هزینه و برچسب فاکتور از همین ماژول
  // خوانده می‌شود تا مبلغ نمایش‌داده‌شده در تسویه با مبلغ ذخیره‌شده یکی باشد.
  const shipping = resolveShippingMethod(body.shippingMethod)

  // ── ۶) محاسبه مبلغ نهایی ──
  const totals = computeTotals(subtotal, resolvedCoupon, shipping.id)

  if (paymentMethod === 'installment' && totals.total < INSTALLMENT_MIN_TOTAL) {
    return badRequest('برای خرید اقساطی، مبلغ سفارش باید بیشتر باشد.', {
      paymentMethod: 'این سفارش شرایط خرید اقساطی را ندارد.',
    })
  }

  // ── ۷) ثبت سفارش در دیتابیس ──
  const user = await getCurrentUser()
  const orderNumber = await generateOrderNumber()

  const created = await createOrder({
    userId: user?.id ?? null,
    orderNumber,
    status: paymentMethod === 'cod' ? 'processing' : 'pending',
    paymentMethod,
    shippingMethod: shipping.label,
    couponCode: resolvedCoupon?.code ?? null,
    subtotal: totals.subtotal,
    discount: totals.discount,
    shipping: totals.shipping,
    total: totals.total,
    customer: {
      firstName,
      lastName,
      phone,
      email: email || null,
      province,
      city,
      line,
      postalCode: postalCode || null,
    },
    items: pricedItems,
    idempotencyKey,
    note: cleanText(body.note, 500) || null,
  })

  // ── ۸) لاگ حسابرسی ──
  await writeAuditLog({
    actorId: user?.id ?? null,
    action: 'order.created',
    entity: 'Order',
    entityId: created.id,
    metadata: { orderNumber, total: totals.total, paymentMethod, itemCount: pricedItems.length },
    ip,
    userAgent: request.headers.get('user-agent'),
  })

  // ── ۹) اعلام رویداد به اتوماسیون (ایمیل، پیامک، انبار) ──
  void dispatchAutomationEvent({
    event: 'order.created',
    occurredAt: created.createdAt.toISOString(),
    data: {
      orderId: orderNumber,
      paymentMethod,
      total: totals.total,
      discount: totals.discount,
      shipping: totals.shipping,
      coupon: resolvedCoupon?.code ?? null,
      customerPhone: phone,
      itemCount: pricedItems.length,
      items: pricedItems.map((item) => ({ slug: item.productSlug, quantity: item.quantity })),
    },
  })

  // ── ۱۰) آغاز پرداخت آنلاین ──
  // سفارش همین حالا ثبت شده است؛ حالا از درگاه authority می‌گیریم و کاربر
  // به صفحه بانک هدایت می‌شود. اگر درگاه در دسترس نباشد، سفارش pending
  // می‌ماند و دلیل دقیق به کاربر برگردانده می‌شود.
  const payment = await paymentEnvelope(paymentMethod, created.id)

  return jsonOk(
    {
      order: {
        id: created.orderNumber,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
        items: created.items.map((item) => ({
          slug: item.productSlug,
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
        totals,
      },
      customer: { firstName, lastName, phone },
      payment,
    },
    201,
  )
}
