/**
 * چرخه واقعی پرداخت آنلاین.
 *
 * این ماژول «سیاست» پرداخت است و ماژول `./zarinpal` «مکانیزم» آن. هر چیز
 * مربوط به پروتکل درگاه (endpoint، پارامتر، تفسیر کد) آنجاست و هر چیز مربوط
 * به سفارش نودهی (کدام سفارش، چه زمانی paid شود، چه رویدادی اعلام شود)
 * اینجا. با این تفکیک، آزمون سیاست نیازی به شبکه ندارد و آزمون پروتکل
 * نیازی به دیتابیس.
 *
 * ── دو عملیات ──
 *  ۱) `startOnlinePayment` — پیش از هدایت کاربر به درگاه. سفارش را می‌گیرد،
 *     از درگاه authority می‌خواهد و آن را روی سفارش ذخیره می‌کند.
 *  ۲) `settleOnlinePayment` — پس از بازگشت کاربر از درگاه. authority را به
 *     سفارش نگاشت می‌کند، از درگاه تأیید می‌گیرد و سفارش را paid می‌کند.
 *
 * ── چرا ذخیره authority روی سفارش؟ ──
 * بازگشت از درگاه فقط `Authority` را با خود دارد، نه شماره سفارش. اگر
 * نگاشت authority→سفارش را جایی نگه نداریم، هیچ راه مطمئنی برای فهمیدن
 * «این پرداخت مربوط به کدام سفارش است» نمی‌ماند. این ستون همچنین یکتاست،
 * پس پاسخ بازگشتی هرگز به سفارش دیگری نمی‌چسبد.
 *
 * ── idempotency (مهم‌ترین بخش) ──
 * اگر کاربر صفحه تأیید را رفرش کند، همین درخواست دوباره می‌آید. سه لایه
 * محافظت هست:
 *   • سفارشی که paid شده دیگر وریفای نمی‌شود (بدون تماس با شبکه).
 *   • به‌روزرسانی وضعیت با شرط `status = 'pending'` انجام می‌شود، پس دو
 *     درخواست هم‌زمان فقط یکی اثر می‌گذارد.
 *   • کد ۱۰۱ زرین‌پال («قبلاً تأیید شده») موفق تلقی می‌شود، نه خطا؛ وگرنه
 *     مشتری پول داده بود ولی سفارش pending می‌ماند.
 */

import { prisma } from '@/lib/db'
import { dispatchAutomationEvent } from '@/lib/server/automation'
import { writeAuditLog } from '@/lib/server/orders'
import {
  buildStartPayUrl,
  loadZarinpalConfig,
  maskCardPan,
  requestZarinpalPayment,
  toRial,
  verifyZarinpalPayment,
} from './zarinpal'

/** وضعیت‌هایی که یعنی «پول رسیده است»؛ از این نقطه به بعد دوباره وریفای نمی‌کنیم */
const SETTLED_STATUSES = ['paid', 'processing', 'shipped', 'delivered']

function isSettled(status: string): boolean {
  return SETTLED_STATUSES.includes(status)
}

/**
 * آدرس بازگشت از درگاه.
 *
 * زرین‌پال این آدرس را با دامنهٔ ثبت‌شدهٔ پذیرنده مقایسه می‌کند، پس در تولید
 * باید از یک متغیر محیطی صریح بیاید (خطای ‎-14 نتیجهٔ اشتباه بودن همین است).
 * اگر تنظیم نشده باشد، از آدرس سایت ساخته می‌شود تا محیط توسعه بدون تنظیم
 * اضافه کار کند.
 */
export function resolveCallbackUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.ZARINPAL_CALLBACK_URL?.trim()
  if (explicit) return explicit

  const site = env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000'
  return `${site.replace(/\/+$/, '')}/api/payments/zarinpal/callback`
}

// ─────────────────────────────────────────────────────────────
//  ۱) آغاز پرداخت — پیش از هدایت به درگاه
// ─────────────────────────────────────────────────────────────

export type StartPaymentFailure =
  | 'order_not_found'
  | 'not_online'
  | 'already_paid'
  | 'gateway_unavailable'
  | 'gateway_error'

export type StartOnlinePaymentResult =
  | { ok: true; authority: string; redirectUrl: string; sandbox: boolean; reused: boolean }
  | { ok: false; reason: StartPaymentFailure; message: string; retryable: boolean }

/**
 * درخواست پرداخت برای یک سفارش و برگرداندن آدرس درگاه.
 *
 * `orderId` شناسه دیتابیسی سفارش است (نه شماره سفارش)، چون دقیقاً همان چیزی
 * است که بلافاصله پس از `createOrder` در دسترس است.
 */
export async function startOnlinePayment(input: {
  orderId: string
  callbackUrl?: string
  env?: Record<string, string | undefined>
}): Promise<StartOnlinePaymentResult> {
  const order = await prisma.order.findUnique({ where: { id: input.orderId } })
  if (!order) {
    return {
      ok: false,
      reason: 'order_not_found',
      message: 'سفارش یافت نشد.',
      retryable: false,
    }
  }

  if (order.paymentMethod !== 'online') {
    return {
      ok: false,
      reason: 'not_online',
      message: 'این سفارش با روش پرداخت آنلاین ثبت نشده است.',
      retryable: false,
    }
  }

  if (isSettled(order.status)) {
    return {
      ok: false,
      reason: 'already_paid',
      message: 'پرداخت این سفارش قبلاً انجام شده است.',
      retryable: false,
    }
  }

  const config = await loadZarinpalConfig()
  // خاموش بودن درگاه یا نبود شناسه پذیرنده هر دو یک پیام دارند: پرداخت
  // آنلاین در دسترس نیست. متن دقیق دلیل از خود پیکربندی می‌آید.
  if (!config.ready || !config.merchantId) {
    return {
      ok: false,
      reason: 'gateway_unavailable',
      message: config.reason ?? 'درگاه پرداخت آنلاین در حال حاضر در دسترس نیست.',
      retryable: false,
    }
  }

  // اگر همین سفارش قبلاً authority گرفته، همان برگردانده می‌شود. ساخت
  // تراکنش تازه در ازای هر کلیک، در پنل زرین‌پال انبوهی از تراکنش‌های
  // بی‌استفاده می‌سازد و می‌تواند به خطای ‎-12 (تعداد زیاد درخواست) بخورد.
  if (order.paymentAuthority) {
    return {
      ok: true,
      authority: order.paymentAuthority,
      redirectUrl: buildStartPayUrl(order.paymentAuthority, config.startPayBase),
      sandbox: config.sandbox,
      reused: true,
    }
  }

  const amountRial = toRial(order.total)
  const requested = await requestZarinpalPayment({
    config,
    amountRial,
    description: `پرداخت سفارش ${order.orderNumber} — فروشگاه نودهی`,
    callbackUrl: input.callbackUrl ?? resolveCallbackUrl(input.env),
    mobile: order.customerPhone,
    email: order.customerEmail,
    orderId: order.orderNumber,
  })

  if (!requested.ok) {
    await writeAuditLog({
      actorId: order.userId,
      action: 'payment.request_failed',
      entity: 'Order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, code: requested.code, message: requested.message },
    })
    return {
      ok: false,
      reason: 'gateway_error',
      message: requested.message,
      // خطای شبکه/تایم‌اوت با تلاش دوباره حل می‌شود؛ خطای خود درگاه نه لزوماً
      retryable: requested.code === null,
    }
  }

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentAuthority: requested.authority },
    })
  } catch {
    // برخورد یکتایی یعنی این authority به سفارش دیگری گره خورده است؛ ادامه
    // دادن یعنی هدایت کاربر به درگاهی که تسویه‌اش به سفارش دیگری می‌چسبد.
    return {
      ok: false,
      reason: 'gateway_error',
      message: 'ثبت شناسه تراکنش درگاه ممکن نشد. دوباره تلاش کنید.',
      retryable: true,
    }
  }

  await writeAuditLog({
    actorId: order.userId,
    action: 'payment.initiated',
    entity: 'Order',
    entityId: order.id,
    metadata: {
      orderNumber: order.orderNumber,
      amountRial,
      sandbox: config.sandbox,
      authority: requested.authority,
    },
  })

  await dispatchAutomationEvent({
    event: 'payment.initiated',
    occurredAt: new Date().toISOString(),
    data: {
      orderId: order.orderNumber,
      amountRial,
      sandbox: config.sandbox,
      customerPhone: order.customerPhone,
    },
  })

  return {
    ok: true,
    authority: requested.authority,
    redirectUrl: requested.redirectUrl,
    sandbox: config.sandbox,
    reused: false,
  }
}

// ─────────────────────────────────────────────────────────────
//  ۲) تأیید بازگشت — پس از بازگشت از درگاه
// ─────────────────────────────────────────────────────────────

/** حالتی که صفحه نتیجه بر پایه آن متن و رنگ مناسب را انتخاب می‌کند */
export type SettleOnlinePaymentResult =
  | {
      ok: true
      state: 'paid' | 'already_paid'
      orderNumber: string
      total: number
      refId: string | null
      cardPan: string | null
    }
  | {
      ok: false
      state: 'failed' | 'unverifiable' | 'unknown'
      orderNumber: string | null
      /** کد خطای درگاه (در صورت وجود) — برای نمایش متن دقیق فارسی */
      code: number | null
      message: string
    }

/**
 * تأیید پرداخت با authority بازگشتی از درگاه.
 *
 * `gatewayStatus` مقدار `Status` در بازگشت است (`OK` یا `NOK`). تصمیم نهایی
 * به آن واگذار نمی‌شود و **همیشه** وریفای صدا زده می‌شود: تنها منبع حقیقت
 * «آیا پول رسیده؟» پاسخ متد verify است. اگر به `Status` تکیه می‌کردیم، یک
 * بازگشت دست‌کاری‌شده می‌توانست سفارش را paid کند.
 */
export async function settleOnlinePayment(input: {
  authority: string
  gatewayStatus?: string | null
}): Promise<SettleOnlinePaymentResult> {
  const authority = input.authority.trim()
  if (!authority) {
    return {
      ok: false,
      state: 'unknown',
      orderNumber: null,
      code: null,
      message: 'شناسه تراکنش در بازگشت از درگاه یافت نشد.',
    }
  }

  const order = await prisma.order.findUnique({ where: { paymentAuthority: authority } })
  if (!order) {
    return {
      ok: false,
      state: 'unknown',
      orderNumber: null,
      code: null,
      message: 'سفارشی با این شناسه تراکنش ثبت نشده است.',
    }
  }

  // مسیر سریع: سفارشی که پیش‌تر paid شده نیازی به تماس دوباره با درگاه ندارد
  if (isSettled(order.status)) {
    return {
      ok: true,
      state: 'already_paid',
      orderNumber: order.orderNumber,
      total: order.total,
      refId: order.paymentRefId,
      cardPan: order.paymentCardPan,
    }
  }

  const config = await loadZarinpalConfig()
  if (!config.verifyReady || !config.merchantId) {
    return {
      ok: false,
      state: 'unverifiable',
      orderNumber: order.orderNumber,
      code: null,
      message: config.reason ?? 'تأیید پرداخت در حال حاضر ممکن نیست.',
    }
  }

  const verified = await verifyZarinpalPayment({
    config,
    amountRial: toRial(order.total),
    authority,
  })

  if (!verified.ok) {
    // خطای «قطعی» درگاه یعنی این authority مرده است و باید آزاد شود تا
    // مشتری بتواند تراکنش تازه‌ای شروع کند. ولی خطای ارتباطی (کد تهی) را
    // قطعی نمی‌گیریم: ممکن است پول رسیده باشد و فقط پاسخ به ما نرسیده؛
    // پاک کردن authority در آن حالت یعنی گم‌کردن رد پول مشتری.
    const definitive = verified.code !== null

    if (definitive) {
      await prisma.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { paymentAuthority: null },
      })
    }

    await writeAuditLog({
      actorId: order.userId,
      action: 'payment.failed',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        authority,
        status: input.gatewayStatus ?? null,
        code: verified.code,
        definitive,
        message: verified.message,
      },
    })

    await dispatchAutomationEvent({
      event: 'payment.failed',
      occurredAt: new Date().toISOString(),
      data: {
        orderId: order.orderNumber,
        code: verified.code,
        status: input.gatewayStatus ?? null,
        customerPhone: order.customerPhone,
      },
    })

    return {
      ok: false,
      state: definitive ? 'failed' : 'unverifiable',
      orderNumber: order.orderNumber,
      code: verified.code,
      message: verified.message,
    }
  }

  const paidAt = new Date()
  const cardPan = maskCardPan(verified.cardPan)

  // شرط وضعیت در خود کوئری، مسابقه دو بازگشت هم‌زمان را خنثی می‌کند: فقط
  // یکی از آن‌ها رکورد را از pending به paid می‌برد و بقیه count=0 می‌گیرند.
  const applied = await prisma.order.updateMany({
    where: { id: order.id, status: 'pending' },
    data: {
      status: 'paid',
      paidAt,
      paymentRefId: verified.refId,
      paymentCardPan: cardPan,
    },
  })

  if (applied.count === 0) {
    // در همین فاصله درخواست دیگری تسویه را انجام داده است
    const latest = await prisma.order.findUnique({ where: { id: order.id } })
    return {
      ok: true,
      state: 'already_paid',
      orderNumber: order.orderNumber,
      total: order.total,
      refId: latest?.paymentRefId ?? verified.refId,
      cardPan: latest?.paymentCardPan ?? cardPan,
    }
  }

  await writeAuditLog({
    actorId: order.userId,
    action: 'order.paid',
    entity: 'Order',
    entityId: order.id,
    metadata: {
      orderNumber: order.orderNumber,
      amountRial: toRial(order.total),
      refId: verified.refId,
      cardPan,
      sandbox: config.sandbox,
      alreadyVerified: verified.alreadyVerified,
    },
  })

  await dispatchAutomationEvent({
    event: 'order.paid',
    occurredAt: paidAt.toISOString(),
    data: {
      orderId: order.orderNumber,
      total: order.total,
      refId: verified.refId,
      paymentMethod: 'online',
      customerPhone: order.customerPhone,
    },
  })

  return {
    ok: true,
    state: 'paid',
    orderNumber: order.orderNumber,
    total: order.total,
    refId: verified.refId,
    cardPan,
  }
}
