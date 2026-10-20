/**
 * چرخه پرداخت اعتباری اسنپ‌پی — لایه سیاست.
 *
 * «مکانیزم» در `./snappay` است و «سیاست» این‌جا؛ همان تفکیک زرین‌پال
 * (`./zarinpal` و `./flow`). هر سه محافظت idempotency زرین‌پال این‌جا هم
 * هست: سفارش paid دوباره وریفای نمی‌شود، به‌روزرسانی وضعیت با شرط
 * `status='pending'` انجام می‌شود و بازگشت رفرش‌شده خطا نیست.
 *
 * ── تفاوت اصلی با زرین‌پال: نگاشت بازگشت ──
 * اسنپ‌پی به `returnURL` ما `paymentToken` را برمی‌گرداند (نه مبلغ و نه
 * شماره سفارش). ستون `paymentAuthority` یکتاست، پس paymentToken در همان
 * ستون ذخیره می‌شود تا نگاشت بازگشت→سفارش با همان کوئری یکتا و امن باشد.
 * نام ستون «authority» است ولی محتوایش برای سفارش‌های اسنپ‌پی paymentToken
 * است؛ این در کامنت‌ها و لاگ‌ها صریح شده تا اپراتور گیج نشود.
 *
 * ── مبلغ ──
 * verify اسنپ‌پی مبلغ تراکنش را هم برمی‌گرداند؛ با `total` سفارش مقایسه
 * می‌شود و نابرابری یعنی دست‌کاری — سفارش paid نمی‌شود (معادل محافظت
 * ‎-50 زرین‌پال). مبلغ اسنپ‌پی ریال است، پس با `toRial(total)` مقایسه می‌شود.
 */

import { prisma } from '@/lib/db'
import { dispatchAutomationEvent } from '@/lib/server/automation'
import { writeAuditLog } from '@/lib/server/orders'
import {
  buildSnappayPaymentRequest,
  loadSnappayConfig,
  resetSnappayBearerCache,
  settleSnappayPayment,
  verifySnappayPayment,
  type SnappayOrderItem,
} from './snappay'
import { toRial } from './zarinpal'

/** وضعیت‌هایی که یعنی «پول رسیده است» — یکسان با flow.ts */
const SETTLED_STATUSES = ['paid', 'processing', 'shipped', 'delivered']

function isSettled(status: string): boolean {
  return SETTLED_STATUSES.includes(status)
}

/** روش پرداخت اسنپ‌پی در ستون `paymentMethod` سفارش */
export const SNAPPAY_PAYMENT_METHOD = 'snappay'

/**
 * آدرس بازگشت از اسنپ‌پی.
 * با `resolveCallbackUrl` زرین‌پال یکی است تا دامنه از یک متغیر بیاید؛
 * فقط پسوند مسیر فرق دارد.
 */
export function resolveSnappayCallbackUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.ZARINPAL_CALLBACK_URL?.trim()
  if (explicit) return explicit

  const site = env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000'
  return `${site.replace(/\/+$/, '')}/api/payments/snappay/callback`
}

/** آیا روش پرداخت اسنپ‌پی در تسویه نمایش داده شود؟ */
export async function isSnappayAvailable(): Promise<boolean> {
  const config = await loadSnappayConfig()
  return config.ready
}

// ─────────────────────────────────────────────────────────────
//  ۱) آغاز پرداخت — پیش از هدایت به اسنپ‌پی
// ─────────────────────────────────────────────────────────────

export type StartSnappayFailure =
  | 'order_not_found'
  | 'not_snappay'
  | 'already_paid'
  | 'gateway_unavailable'
  | 'gateway_error'

export type StartSnappayResult =
  | { ok: true; paymentToken: string; redirectUrl: string; sandbox: boolean; reused: boolean }
  | { ok: false; reason: StartSnappayFailure; message: string; retryable: boolean }

/**
 * ساخت تراکنش اقساطی برای سفارش و برگرداندن آدرس صفحه اسنپ‌پی.
 *
 * اقلام سفارش از ردیف‌های `OrderItem` می‌آیند (قیمت لحظه ثبت سفارش، نه
 * قیمت فعلی کاتالوگ) تا مبلغ ارسالی با مبلغ فاکتور یکی باشد.
 */
export async function startSnappayPayment(input: {
  orderId: string
  callbackUrl?: string
  env?: Record<string, string | undefined>
}): Promise<StartSnappayResult> {
  const order = await prisma.order.findUnique({ where: { id: input.orderId }, include: { items: true } })
  if (!order) {
    return { ok: false, reason: 'order_not_found', message: 'سفارش یافت نشد.', retryable: false }
  }

  if (order.paymentMethod !== SNAPPAY_PAYMENT_METHOD) {
    return {
      ok: false,
      reason: 'not_snappay',
      message: 'این سفارش با روش پرداخت اسنپ‌پی ثبت نشده است.',
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

  const config = await loadSnappayConfig(input.env)
  if (!config.ready) {
    return {
      ok: false,
      reason: 'gateway_unavailable',
      message: config.reason ?? 'پرداخت اعتباری اسنپ‌پی در حال حاضر در دسترس نیست.',
      retryable: false,
    }
  }

  // همان سفارش قبلاً paymentToken گرفته — همان برگردانده می‌شود
  if (order.paymentAuthority) {
    return {
      ok: true,
      paymentToken: order.paymentAuthority,
      redirectUrl: order.paymentRedirectUrl ?? '',
      sandbox: config.sandbox,
      reused: true,
    }
  }

  const items: SnappayOrderItem[] = order.items.map((item) => ({
    name: item.productName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    categorySlug: null,
  }))

  const request = buildSnappayPaymentRequest({
    orderNumber: order.orderNumber,
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
    total: order.total,
    customerPhone: order.customerPhone,
    items,
  })

  const started = await import('./snappay').then((module) =>
    module.requestSnappayPayment({
      config,
      order: {
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        discount: order.discount,
        shipping: order.shipping,
        total: order.total,
        customerPhone: order.customerPhone,
        items,
      },
      callbackUrl: input.callbackUrl ?? resolveSnappayCallbackUrl(input.env),
    }),
  )

  if (!started.ok) {
    await writeAuditLog({
      actorId: order.userId,
      action: 'payment.request_failed',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        gateway: SNAPPAY_PAYMENT_METHOD,
        code: started.code,
        message: started.message,
      },
    })
    return {
      ok: false,
      reason: 'gateway_error',
      message: started.message,
      retryable: started.code === null,
    }
  }

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentAuthority: started.paymentToken,
        paymentRedirectUrl: started.redirectUrl,
      },
    })
  } catch {
    resetSnappayBearerCache()
    return {
      ok: false,
      reason: 'gateway_error',
      message: 'ثبت شناسه تراکنش اسنپ‌پی ممکن نشد. دوباره تلاش کنید.',
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
      gateway: SNAPPAY_PAYMENT_METHOD,
      amountRial: toRial(order.total),
      sandbox: config.sandbox,
      paymentToken: started.paymentToken,
    },
  })

  await dispatchAutomationEvent({
    event: 'payment.initiated',
    occurredAt: new Date().toISOString(),
    data: {
      orderId: order.orderNumber,
      amountRial: toRial(order.total),
      gateway: SNAPPAY_PAYMENT_METHOD,
      sandbox: config.sandbox,
      customerPhone: order.customerPhone,
    },
  })

  return {
    ok: true,
    paymentToken: started.paymentToken,
    redirectUrl: started.redirectUrl,
    sandbox: config.sandbox,
    reused: false,
  }
}

// ─────────────────────────────────────────────────────────────
//  ۲) تأیید بازگشت — پس از بازگشت کاربر از اسنپ‌پی
// ─────────────────────────────────────────────────────────────

export type SettleSnappayFlowResult =
  | {
      ok: true
      state: 'paid' | 'already_paid'
      orderNumber: string
      total: number
      refId: string | null
    }
  | {
      ok: false
      state: 'failed' | 'unverifiable' | 'unknown'
      orderNumber: string | null
      code: string | null
      message: string
    }

/**
 * تأیید پرداخت با paymentToken بازگشتی.
 *
 * به هیچ پارامتر دیگری از query اعتماد نمی‌شود؛ وضعیت نهایی همیشه از
 * پاسخ verify می‌آید. اگر مبلغ پاسخ با فاکتور نخواند، سفارش paid نمی‌شود
 * و برای بررسی دستی علامت می‌خورد.
 */
export async function settleSnappayFlow(input: { paymentToken: string }): Promise<SettleSnappayFlowResult> {
  const paymentToken = input.paymentToken.trim()
  if (!paymentToken) {
    return {
      ok: false,
      state: 'unknown',
      orderNumber: null,
      code: null,
      message: 'شناسه تراکنش در بازگشت از اسنپ‌پی یافت نشد.',
    }
  }

  const order = await prisma.order.findUnique({ where: { paymentAuthority: paymentToken } })
  if (!order) {
    return {
      ok: false,
      state: 'unknown',
      orderNumber: null,
      code: null,
      message: 'سفارشی با این شناسه تراکنش ثبت نشده است.',
    }
  }

  if (isSettled(order.status)) {
    return {
      ok: true,
      state: 'already_paid',
      orderNumber: order.orderNumber,
      total: order.total,
      refId: order.paymentRefId,
    }
  }

  const config = await loadSnappayConfig()
  if (!config.verifyReady) {
    return {
      ok: false,
      state: 'unverifiable',
      orderNumber: order.orderNumber,
      code: null,
      message: config.reason ?? 'تأیید پرداخت در حال حاضر ممکن نیست.',
    }
  }

  const verified = await verifySnappayPayment({ config, paymentToken })

  if (!verified.ok) {
    await writeAuditLog({
      actorId: order.userId,
      action: 'payment.failed',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        gateway: SNAPPAY_PAYMENT_METHOD,
        paymentToken,
        code: verified.code,
        message: verified.message,
      },
    })
    await dispatchAutomationEvent({
      event: 'payment.failed',
      occurredAt: new Date().toISOString(),
      data: {
        orderId: order.orderNumber,
        gateway: SNAPPAY_PAYMENT_METHOD,
        code: verified.code,
        customerPhone: order.customerPhone,
      },
    })
    return {
      ok: false,
      // خطای اعتبارنامه/۴۰۱ قطعی است؛ خطای شبکه (کد تهی) قطعی نیست
      state: verified.code !== null ? 'failed' : 'unverifiable',
      orderNumber: order.orderNumber,
      code: verified.code,
      message: verified.message,
    }
  }

  // مقایسه مبلغ: پاسخ اسنپ‌پی ریال است. اگر مبلغ برنگشت، verify را می‌پذیریم
  // (اسنپ‌پی خودش مبلغ را قفل می‌کند) ولی ناهمخوانیِ صریح = دست‌کاری.
  if (verified.amountRial !== null && verified.amountRial !== toRial(order.total)) {
    await writeAuditLog({
      actorId: order.userId,
      action: 'payment.amount_mismatch',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        gateway: SNAPPAY_PAYMENT_METHOD,
        expectedRial: toRial(order.total),
        receivedRial: verified.amountRial,
      },
    })
    return {
      ok: false,
      state: 'failed',
      orderNumber: order.orderNumber,
      code: 'amount_mismatch',
      message: 'مبلغ تأییدشده با مبلغ سفارش یکسان نیست. سفارش پرداخت نشده در نظر گرفته شد.',
    }
  }

  const paidAt = new Date()
  const applied = await prisma.order.updateMany({
    where: { id: order.id, status: 'pending' },
    data: {
      status: 'paid',
      paidAt,
      paymentRefId: verified.refId,
    },
  })

  if (applied.count === 0) {
    const latest = await prisma.order.findUnique({ where: { id: order.id } })
    return {
      ok: true,
      state: 'already_paid',
      orderNumber: order.orderNumber,
      total: order.total,
      refId: latest?.paymentRefId ?? verified.refId,
    }
  }

  // settle نزد اسنپ‌پی — شکستش سفارش را عوض نمی‌کند؛ پول تأیید شده است.
  const settled = await settleSnappayPayment({ config, paymentToken })
  if (!settled.ok) {
    await writeAuditLog({
      actorId: order.userId,
      action: 'payment.settle_failed',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        gateway: SNAPPAY_PAYMENT_METHOD,
        paymentToken,
        code: settled.code,
        message: settled.message,
      },
    })
  }

  await writeAuditLog({
    actorId: order.userId,
    action: 'order.paid',
    entity: 'Order',
    entityId: order.id,
    metadata: {
      orderNumber: order.orderNumber,
      gateway: SNAPPAY_PAYMENT_METHOD,
      amountRial: toRial(order.total),
      refId: verified.refId,
      sandbox: config.sandbox,
      settled: settled.ok,
    },
  })

  await dispatchAutomationEvent({
    event: 'order.paid',
    occurredAt: paidAt.toISOString(),
    data: {
      orderId: order.orderNumber,
      total: order.total,
      refId: verified.refId,
      gateway: SNAPPAY_PAYMENT_METHOD,
      paymentMethod: SNAPPAY_PAYMENT_METHOD,
      customerPhone: order.customerPhone,
    },
  })

  return {
    ok: true,
    state: 'paid',
    orderNumber: order.orderNumber,
    total: order.total,
    refId: verified.refId,
  }
}
