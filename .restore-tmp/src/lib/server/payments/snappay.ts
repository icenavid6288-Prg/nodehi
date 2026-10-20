/**
 * درگاه پرداخت اعتباری اسنپ‌پی (BNPL).
 *
 * ── چرا ماژول جدا؟ ──
 * همان قاعده زرین‌پال: هیچ کامپوننت یا API Route‌ای نباید مستقیم با اسنپ‌پی
 * حرف بزند. پروتکل این‌جاست، سیاست سفارش در `./snappay-flow`.
 *
 * ── تفاوت با زرین‌پال ──
 * اسنپ‌پی OAuth2 می‌خواهد (Basic token برای گرفتن Bearer) و به‌جای «مبلغ +
 * authority»، سبد خرید با اقلام می‌گیرد و `paymentToken` برمی‌گرداند.
 * کاربر روی صفحه اسنپ‌پی اقساط‌بندی را انتخاب می‌کند و به `returnURL`
 * ما برمی‌گردد؛ آن‌جا verify و سپس settle می‌شود.
 *
 * ── احترام به پنل مدیریت ──
 * کلید فعال‌سازی و اعتبارنامه‌ها از جدول `Setting` خوانده می‌شوند (پنل
 * `/admin/integrations`). فعال‌نبودن کلید یا خالی‌بودن هر یک از چهار
 * اعتبارنامه یعنی روش پرداخت در تسویه اصلاً ظاهر نمی‌شود.
 *
 * ── واحد پول ──
 * قیمت‌های نودهی تومان است؛ API اسنپ‌پی ریال می‌گیرد. تبدیل با همان
 * `toRial` زرین‌پال انجام می‌شود — تنها نقطه تبدیل کل پروژه.
 *
 * ── آزمون‌پذیری ──
 * `parse*` و `resolveSnappayConfig` خالص‌اند؛ توابع شبکه‌ای `fetch` را
 * تزریقی می‌پذیرند تا پاسخ واقعی درگاه شبیه‌سازی شود.
 */

import { prisma } from '@/lib/db'
import { getBooleanSetting, getSetting } from '@/lib/server/settings'
import { toRial } from './zarinpal'

/** کلید گروه تنظیمات اسنپ‌پی — با `/admin/integrations` یکی است */
export const SNAPPAY_SETTING_GROUP = 'snappay'

export const SNAPPAY_ENDPOINTS = {
  live: {
    /** پایه API پذیرندگان — مسیرها به آن می‌چسبند */
    api: 'https://api.snapppay.ir',
    /** صفحه اقساط‌بندی مشتری؛ paymentToken به ته آن می‌چسبد */
    shop: 'https://snapppay.ir/shop',
  },
  sandbox: {
    api: 'https://sandbox.redemo.snapppay.ir',
    shop: 'https://sandbox.redemo.snapppay.ir/shop',
  },
} as const

/** مسیرهای API نسبت به پایه — از مستندات رسمی اسنپ‌پی */
export const SNAPPAY_PATHS = {
  token: 'api/online/v1/oauth/token',
  payment: 'api/online/payment/v1/token',
  verify: 'api/online/payment/v1/verify',
  settle: 'api/online/payment/v1/settle',
  revert: 'api/online/payment/v1/revert',
} as const

// ─────────────────────────────────────────────────────────────
//  پیکربندی
// ─────────────────────────────────────────────────────────────

export interface SnappayCredentials {
  enabled: boolean
  sandbox: boolean
  username: string | null
  password: string | null
  clientId: string | null
  clientSecret: string | null
}

export interface SnappayConfig {
  /** آیا امکان شروع پرداخت تازه هست؟ (فعال در پنل + هر ۴ اعتبارنامه) */
  ready: boolean
  /** آیا تأیید تراکنشی که قبلاً آغاز شده ممکن است؟ */
  verifyReady: boolean
  /** یکپارچه‌سازی در پنل خاموش است (ولی ممکن است تراکنش باز داشته باشیم) */
  disabled: boolean
  reason: string | null
  sandbox: boolean
  baseUrl: string
  shopBaseUrl: string
  credentials: SnappayCredentials
}

/**
 * تعیین پیکربندی از تنظیمات پنل + متغیرهای محیطی (تابع خالص).
 *
 * `SNAPPAY_BASE_URL` و `SNAPPAY_SHOP_BASE` برای آزمون محلی با یک شبیه‌ساز
 * رویکرد `ZARINPAL_API_BASE` دارند: مقدار محیطی endpoint را بازنویسی می‌کند.
 *
 * تفاوت `ready` و `verifyReady` عمدی است (همان استدلال زرین‌پال): خاموش‌کردن
 * یکپارچه‌سازی باید جلوی پرداخت تازه را بگیرد ولی تأیید تراکنشی که مشتری
 * پیش از خاموش‌شدن داده نباید مسدود شود.
 */
export function resolveSnappayConfig(input: {
  credentials: SnappayCredentials
  env?: Record<string, string | undefined>
}): SnappayConfig {
  const env = input.env ?? {}
  const c = input.credentials
  const endpoints = c.sandbox ? SNAPPAY_ENDPOINTS.sandbox : SNAPPAY_ENDPOINTS.live

  const baseUrl = env.SNAPPAY_BASE_URL?.trim() || endpoints.api
  const shopBaseUrl = env.SNAPPAY_SHOP_BASE?.trim() || endpoints.shop

  const missing = (
    [
      ['نام کاربری', c.username],
      ['رمز عبور', c.password],
      ['Client ID', c.clientId],
      ['Client Secret', c.clientSecret],
    ] as const
  ).filter(([, value]) => !value?.trim())

  const base: SnappayConfig = {
    ready: false,
    verifyReady: false,
    disabled: !c.enabled,
    reason: null,
    sandbox: c.sandbox,
    baseUrl,
    shopBaseUrl,
    credentials: c,
  }

  if (!c.enabled) {
    return { ...base, verifyReady: true, reason: 'پرداخت اعتباری اسنپ‌پی در پنل یکپارچه‌سازی‌ها غیرفعال است.' }
  }
  if (missing.length > 0) {
    return {
      ...base,
      reason: `اعتبارنامه اسنپ‌پی کامل نیست: ${missing.map(([label]) => label).join('، ')} در پنل ثبت نشده است.`,
    }
  }

  return { ...base, ready: true, verifyReady: true }
}

/** خواندن پیکربندی از دیتابیس و محیط — در زمان پرداخت صدا زده می‌شود */
export async function loadSnappayConfig(env: Record<string, string | undefined> = process.env): Promise<SnappayConfig> {
  const [enabled, sandbox, username, password, clientId, clientSecret] = await Promise.all([
    getBooleanSetting('integration.snappay.enabled'),
    getBooleanSetting('integration.snappay.sandbox'),
    getSetting('integration.snappay.username'),
    getSetting('integration.snappay.password'),
    getSetting('integration.snappay.clientId'),
    getSetting('integration.snappay.clientSecret'),
  ])

  return resolveSnappayConfig({
    credentials: { enabled, sandbox, username, password, clientId, clientSecret },
    env,
  })
}

// ─────────────────────────────────────────────────────────────
//  سبد خرید سفارش نودهی → قالب cartList اسنپ‌پی
// ─────────────────────────────────────────────────────────────

export interface SnappayOrderItem {
  name: string
  unitPrice: number
  quantity: number
  categorySlug: string | null
}

export interface SnappayOrderInput {
  orderNumber: string
  subtotal: number
  discount: number
  shipping: number
  total: number
  customerPhone: string
  items: SnappayOrderItem[]
}

/**
 * بدنه کامل درخواست `payment/v1/token`.
 *
 * مبلغ‌ها همه ریال‌اند. `amount` مبلغ قابل‌پرداخت (پس از تخفیف) است و
 * `cartList[0].totalAmount` جمع سبد پیش از تخفیف؛ اختلافشان در
 * `discountAmount` می‌رود — دقیقاً مطابق الگوی پلاگین مرجع.
 * `transactionId` شماره سفارش ماست تا در پنل اسنپ‌پی قابل ردیابی باشد.
 */
export function buildSnappayPaymentRequest(order: SnappayOrderInput): Record<string, unknown> {
  const cartItems = order.items.map((item, index) => ({
    id: index + 1,
    name: item.name,
    count: item.quantity,
    amount: toRial(item.unitPrice),
    category: item.categorySlug ?? 'other',
    commissionType: 'CREDIT',
  }))

  return {
    amount: toRial(order.total),
    paymentMethodTypeDto: 'INSTALLMENT',
    transactionId: order.orderNumber,
    externalSourceAmount: 0,
    mobile: order.customerPhone,
    discountAmount: toRial(order.discount),
    cartList: [
      {
        cartId: 1,
        totalAmount: toRial(order.subtotal),
        shippingAmount: toRial(order.shipping),
        isShipmentIncluded: true,
        taxAmount: 0,
        isTaxIncluded: false,
        cartItems,
      },
    ],
  }
}

/** صفحه اقساط‌بندی مشتری از روی paymentToken */
export function buildSnappayRedirectUrl(paymentToken: string, shopBaseUrl: string): string {
  return `${shopBaseUrl.replace(/\/+$/, '')}/${encodeURIComponent(paymentToken)}`
}

// ─────────────────────────────────────────────────────────────
//  تفسیر پاسخ درگاه
// ─────────────────────────────────────────────────────────────

export interface SnappayFailure {
  ok: false
  /** شناسه متنی خطا — اسنپ‌پی کد عددی مستقل نمی‌دهد */
  code: string | null
  message: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim()
  if (typeof value === 'number') return String(value)
  return null
}

/**
 * استخراج پیام خطا از بدنه پاسخ اسنپ‌پی.
 * پاسخ خطا معمولاً `{"status": "error", "message": ...}` یا `{"error": ...}`
 * است؛ هر دو حالت پوشش داده می‌شود.
 */
export function readSnappayError(payload: unknown): { code: string | null; message: string | null } {
  const record = asRecord(payload)
  if (!record) return { code: null, message: null }

  const status = asText(record.status)
  const message = asText(record.message) ?? asText(record.error_description) ?? asText(record.error)

  if (typeof record.error === 'string' || typeof record.error === 'number') {
    return { code: String(record.error), message }
  }
  if (status && status.toLowerCase() === 'error') {
    return { code: status, message }
  }
  return { code: null, message }
}

export type SnappayTokenParsed = { ok: true; accessToken: string; expiresInSec: number } | SnappayFailure

/** تفسیر پاسخ OAuth — تنها فیلد موفقیت وجود access_token است */
export function parseSnappayTokenResponse(payload: unknown): SnappayTokenParsed {
  const record = asRecord(payload)
  const accessToken = record ? asText(record.access_token) : null

  if (accessToken) {
    const expiresIn = record && typeof record.expires_in === 'number' ? record.expires_in : 3600
    return { ok: true, accessToken, expiresInSec: expiresIn }
  }

  const error = readSnappayError(payload)
  return {
    ok: false,
    code: error.code,
    message: error.message ?? 'دریافت توکن احراز هویت از اسنپ‌پی ناموفق بود.',
  }
}

export type SnappayPaymentTokenParsed = { ok: true; paymentToken: string } | SnappayFailure

/** تفسیر پاسخ ساخت تراکنش — paymentToken ممکن است در ریشه یا زیر data بیاید */
export function parseSnappayPaymentTokenResponse(payload: unknown): SnappayPaymentTokenParsed {
  const record = asRecord(payload)
  const data = record ? asRecord(record.data) : null
  const paymentToken = record ? asText(record.paymentToken) ?? (data ? asText(data.paymentToken) : null) : null

  if (paymentToken) return { ok: true, paymentToken }

  const error = readSnappayError(payload)
  return {
    ok: false,
    code: error.code,
    message: error.message ?? 'اسنپ‌پی شناسه تراکنش برنگرداند.',
  }
}

export type SnappayVerifyParsed = { ok: true; refId: string | null; amountRial: number | null } | SnappayFailure

/**
 * تفسیر پاسخ verify.
 *
 * اسنپ‌پی در موفقیت ۲۰۰ می‌دهد و مشخصات تراکنش را برمی‌گرداند؛ شکست یا با
 * `status: error` یا با کد HTTP غیر ۲۰۰ می‌آید. اگر `amount` در پاسخ باشد
 * با مبلغ سفارش مقایسه می‌شود تا مثل محافظت ‎-50 زرین‌پال، مبلغ دست‌کاری‌شده
 * سفارش را paid نکند.
 */
export function parseSnappayVerifyResponse(payload: unknown): SnappayVerifyParsed {
  const record = asRecord(payload)
  if (!record) {
    return { ok: false, code: null, message: 'پاسخ تأیید اسنپ‌پی قابل خواندن نبود.' }
  }

  const error = readSnappayError(payload)
  if (error.code) {
    return {
      ok: false,
      code: error.code,
      message: error.message ?? 'تأیید پرداخت از سوی اسنپ‌پی انجام نشد.',
    }
  }

  const status = asText(record.status)
  if (status && !['paid', 'success', 'verified', 'ok', 'settle_ready'].includes(status.toLowerCase())) {
    return { ok: false, code: status, message: 'تراکنش در اسنپ‌پی در وضعیت موفق نیست.' }
  }

  const rawAmount = record.amount
  const amountRial = typeof rawAmount === 'number' && Number.isFinite(rawAmount) ? rawAmount : null

  return {
    ok: true,
    refId: asText(record.transactionId) ?? asText(record.referenceNumber) ?? asText(record.id),
    amountRial,
  }
}

// ─────────────────────────────────────────────────────────────
//  فراخوانی شبکه‌ای
// ─────────────────────────────────────────────────────────────

export interface SnappayFetchDeps {
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 9000

async function snappayFetch(
  url: string,
  init: RequestInit,
  deps: SnappayFetchDeps,
): Promise<{ ok: true; status: number; payload: unknown } | SnappayFailure> {
  const fetchImpl = deps.fetchImpl ?? fetch
  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    })
    const payload = await response.json().catch(() => null)
    return { ok: true, status: response.status, payload }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطای نامشخص'
    return {
      ok: false,
      code: null,
      message: `ارتباط با اسنپ‌پی برقرار نشد (${message}).`,
    }
  }
}

/** توکن Bearer به‌صورت درون‌حافظه‌ای کش می‌شود تا هر تراکنش یک OAuth نزند */
let bearerCache: { token: string; expiresAtMs: number } | null = null

/** پاک‌کردن کش توکن — برای آزمون‌ها و پس از خطای ۴۰۱ */
export function resetSnappayBearerCache(): void {
  bearerCache = null
}

async function getBearerToken(
  config: SnappayConfig,
  deps: SnappayFetchDeps,
): Promise<{ ok: true; token: string } | SnappayFailure> {
  const now = Date.now()
  if (bearerCache && bearerCache.expiresAtMs - 60_000 > now) {
    return { ok: true, token: bearerCache.token }
  }

  const c = config.credentials
  const basic = Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64')
  const body = new URLSearchParams({
    grant_type: 'password',
    scope: 'online-merchant',
    username: c.username ?? '',
    password: c.password ?? '',
  })

  const sent = await snappayFetch(
    `${config.baseUrl.replace(/\/+$/, '')}/${SNAPPAY_PATHS.token}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: body.toString(),
    },
    deps,
  )

  if (!sent.ok) return sent
  if (sent.status === 401) {
    return { ok: false, code: 'unauthorized', message: 'اعتبارنامه اسنپ‌پی پذیرفته نشد (۴۰۱).' }
  }

  const parsed = parseSnappayTokenResponse(sent.payload)
  if (!parsed.ok) return parsed

  bearerCache = { token: parsed.accessToken, expiresAtMs: now + parsed.expiresInSec * 1000 }
  return { ok: true, token: parsed.accessToken }
}

/** فراخوانی با Bearer؛ در ۴۰۱ یک بار توکن تازه گرفته و تلاش دوباره می‌شود */
async function snappayBearerFetch(
  config: SnappayConfig,
  path: string,
  body: Record<string, unknown>,
  deps: SnappayFetchDeps,
): Promise<{ ok: true; status: number; payload: unknown } | SnappayFailure> {
  const token = await getBearerToken(config, deps)
  if (!token.ok) return token

  const url = `${config.baseUrl.replace(/\/+$/, '')}/${path}`
  const init: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  }

  let sent = await snappayFetch(url, init, deps)
  // توکن ممکن است وسط کار منقضی شده باشد؛ یک بار با توکن تازه تکرار می‌کنیم
  if (sent.ok && sent.status === 401) {
    resetSnappayBearerCache()
    const refreshed = await getBearerToken(config, deps)
    if (!refreshed.ok) return refreshed
    sent = await snappayFetch(
      url,
      { ...init, headers: { ...init.headers, Authorization: `Bearer ${refreshed.token}` } },
      deps,
    )
  }

  return sent
}

export type RequestSnappayPaymentResult =
  | { ok: true; paymentToken: string; redirectUrl: string }
  | SnappayFailure

/** ساخت تراکنش اقساطی و گرفتن paymentToken */
export async function requestSnappayPayment(
  input: {
    config: SnappayConfig
    order: SnappayOrderInput
    callbackUrl: string
  },
  deps: SnappayFetchDeps = {},
): Promise<RequestSnappayPaymentResult> {
  if (!input.config.ready) {
    return {
      ok: false,
      code: null,
      message: input.config.reason ?? 'پرداخت اعتباری اسنپ‌پی در حال حاضر در دسترس نیست.',
    }
  }

  const body = buildSnappayPaymentRequest(input.order)
  body.returnURL = input.callbackUrl

  const sent = await snappayBearerFetch(input.config, SNAPPAY_PATHS.payment, body, deps)
  if (!sent.ok) return sent
  if (sent.status >= 400) {
    const error = readSnappayError(sent.payload)
    return {
      ok: false,
      code: error.code,
      message: error.message ?? `اسنپ‌پی درخواست پرداخت را نپذیرفت (کد ${sent.status}).`,
    }
  }

  const parsed = parseSnappayPaymentTokenResponse(sent.payload)
  if (!parsed.ok) return parsed

  return {
    ok: true,
    paymentToken: parsed.paymentToken,
    redirectUrl: buildSnappayRedirectUrl(parsed.paymentToken, input.config.shopBaseUrl),
  }
}

export type VerifySnappayResult =
  | { ok: true; refId: string | null; amountRial: number | null }
  | SnappayFailure

/**
 * تأیید تراکنش پس از بازگشت کاربر.
 * عمداً `verifyReady` و نه `ready` — همان استدلال زرین‌پال.
 */
export async function verifySnappayPayment(
  input: { config: SnappayConfig; paymentToken: string },
  deps: SnappayFetchDeps = {},
): Promise<VerifySnappayResult> {
  if (!input.config.verifyReady) {
    return {
      ok: false,
      code: null,
      message: input.config.reason ?? 'تأیید پرداخت اسنپ‌پی ممکن نیست.',
    }
  }

  const sent = await snappayBearerFetch(
    input.config,
    SNAPPAY_PATHS.verify,
    { paymentToken: input.paymentToken },
    deps,
  )
  if (!sent.ok) return sent

  const parsed = parseSnappayVerifyResponse(sent.payload)
  if (!parsed.ok) return parsed
  return { ok: true, refId: parsed.refId, amountRial: parsed.amountRial }
}

export type SettleSnappayResult = { ok: true } | SnappayFailure

/**
 * تسویه تراکنش نزد اسنپ‌پی (پس از verify موفق).
 * شکست settle سفارش را برنمی‌گرداند — پول تأیید شده است؛ فقط در لاگ حسابرسی
 * می‌نشیند تا اپراتور از پنل اسنپ‌پی پیگیری کند.
 */
export async function settleSnappayPayment(
  input: { config: SnappayConfig; paymentToken: string },
  deps: SnappayFetchDeps = {},
): Promise<SettleSnappayResult> {
  if (!input.config.ready) {
    return {
      ok: false,
      code: null,
      message: input.config.reason ?? 'تسویه اسنپ‌پی ممکن نیست؛ یکپارچه‌سازی فعال نیست.',
    }
  }

  const sent = await snappayBearerFetch(
    input.config,
    SNAPPAY_PATHS.settle,
    { paymentToken: input.paymentToken },
    deps,
  )
  if (!sent.ok) return sent
  if (sent.status >= 400) {
    const error = readSnappayError(sent.payload)
    return { ok: false, code: error.code, message: error.message ?? 'تسویه تراکنش در اسنپ‌پی انجام نشد.' }
  }
  return { ok: true }
}

/** شمارش سفارش‌های باز اسنپ‌پی — برای ناوبری پنل */
export async function countOpenSnappayOrders(): Promise<number> {
  return prisma.order.count({ where: { paymentMethod: 'snappay', status: 'pending' } })
}
