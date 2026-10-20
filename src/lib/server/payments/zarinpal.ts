/**
 * درگاه پرداخت زرین‌پال.
 *
 * ── چرا ماژول جدا؟ ──
 * هیچ کامپوننت یا API Route‌ای نباید مستقیم با زرین‌پال حرف بزند. اگر روزی
 * درگاه عوض شد (آیدی‌پی، نکست‌پی و…)، فقط همین فایل تغییر می‌کند و منطق
 * سفارش دست‌نخورده می‌ماند. قاعده کلی در `docs/INTEGRATIONS.md` آمده است.
 *
 * ── احترام به پنل مدیریت ──
 * فعال/غیرفعال بودن پرداخت آنلاین، حالت آزمایشی و شناسه پذیرنده از **ردیف
 * درگاه در دیتابیس** خوانده می‌شوند (همان ردیفی که در `/admin/payments`
 * ویرایش می‌شود). فقط اگر آنجا مقداری ثبت نشده باشد، متغیرهای محیطی
 * جایگزین می‌شوند. پس اگر مدیر درگاه را خاموش کند، هیچ پرداخت آنلاینی —
 * حتی با درخواست دستی به API — آغاز نمی‌شود.
 *
 * ── آزمون‌پذیری ──
 * `parse*` و `resolveZarinpalConfig` توابع خالص‌اند و بدون شبکه و دیتابیس
 * آزمون می‌شوند. توابع شبکه‌ای، `fetch` را به شکل وابستگی می‌پذیرند تا در
 * آزمون بتوان پاسخ واقعی درگاه را شبیه‌سازی کرد.
 *
 * ── واحد پول ──
 * قیمت‌های کاتالوگ نودهی به **تومان** است و مستندات زرین‌پال برای هر دو متد
 * `request` و `verify` مبلغ را **ریال** اعلام کرده است. پس مبلغ پیش از ارسال
 * با `toRial` تبدیل می‌شود و همان مقدار ریالی در وریفای هم فرستاده می‌شود.
 *
 * ⚠️ عمداً از پارامتر اختیاری `currency` (مقدار IRT) استفاده نمی‌کنیم: مستندات
 * وریفای، مبلغ را ریال می‌گیرد و نمونه رسمی هم بدون `currency` است. اگر یکی
 * از دو متد تومان و دیگری ریال فرستاده شود، درگاه با خطای ‎-50 («مبلغ وریفای
 * با مبلغ ارسالی متفاوت است») تراکنش را رد می‌کند. یک تبدیل، یک واحد، یک جای
 * کد — همین‌جا.
 */

import { prisma } from '@/lib/db'

/** روش پرداخت آنلاین در جدول درگاه‌ها و در تسویه — با `api/checkout` یکی است */
export const ONLINE_GATEWAY_KEY = 'online'

export const ZARINPAL_ENDPOINTS = {
  live: {
    api: 'https://payment.zarinpal.com/pg/v4/payment',
    startPay: 'https://payment.zarinpal.com/pg/StartPay',
  },
  sandbox: {
    api: 'https://sandbox.zarinpal.com/pg/v4/payment',
    startPay: 'https://sandbox.zarinpal.com/pg/StartPay',
  },
} as const

/** سقف مبلغ مجاز درگاه در هر تراکنش (تومان) — خطای ‎-41 زرین‌پال */
export const ZARINPAL_MAX_AMOUNT_TOMAN = 100_000_000

/**
 * متن فارسی خطاهای شناخته‌شده درگاه.
 * کدهای خام برای کاربر و اپراتور بی‌معنی‌اند؛ این متن‌ها از فهرست رسمی
 * مستندات زرین‌پال گرفته شده‌اند. خطای ‎-14 نشانهٔ تنظیم نادرست دامنه در
 * محیط تولید است و عمداً با متن روشن آمده تا عیب‌یابی سریع باشد.
 */
export const ZARINPAL_ERROR_MESSAGES: Record<string, string> = {
  '-9': 'اطلاعات ارسالی به درگاه کامل یا معتبر نیست.',
  '-10': 'آی‌پی یا شناسه پذیرندهٔ زرین‌پال درست نیست.',
  '-11': 'شناسه پذیرنده در زرین‌پال فعال نیست.',
  '-12': 'تلاش‌های بیش از حد مجاز در بازه زمانی کوتاه؛ کمی بعد دوباره تلاش کنید.',
  '-13': 'محدودیت تراکنش پذیرنده؛ تکمیل مدارک در زرین‌پال لازم است.',
  '-14': 'آدرس بازگشت با دامنه ثبت‌شدهٔ درگاه در زرین‌پال مغایرت دارد.',
  '-15': 'درگاه پرداخت به حالت تعلیق درآمده است.',
  '-16': 'سطح تأیید پذیرنده برای این تراکنش کافی نیست.',
  '-17': 'محدودیت پذیرنده در سطح آبی؛ امکان انجام این تراکنش نیست.',
  '-18': 'استفاده از کد درگاه اختصاصی روی این دامنه مجاز نیست.',
  '-19': 'امکان ایجاد تراکنش برای این پذیرنده وجود ندارد.',
  '-40': 'پارامترهای ارسالی به درگاه نامعتبر است.',
  '-41': 'حداکثر مبلغ مجاز هر تراکنش ۱۰۰ میلیون تومان است.',
  '-50': 'مبلغ تأییدشده با مبلغ ثبت‌شدهٔ سفارش یکسان نیست.',
  '-51': 'پرداخت ناموفق بود یا توسط خریدار لغو شد.',
  '-52': 'خطای غیرمنتظره‌ای در درگاه رخ داد.',
  '-53': 'این پرداخت به شناسه پذیرندهٔ دیگری تعلق دارد.',
  '-54': 'شناسه تراکنش (authority) نامعتبر است.',
  '-55': 'تراکنش مورد نظر در درگاه یافت نشد.',
}

/** پیام فارسی برای کد خطای درگاه؛ ناشناخته‌ها متن پیش‌فرض می‌گیرند */
export function zarinpalErrorMessage(code: number | null, fallback = 'خطای نامشخص درگاه پرداخت'): string {
  if (code === null) return fallback
  return ZARINPAL_ERROR_MESSAGES[String(code)] ?? fallback
}

/** تبدیل تومان به ریال — تنها نقطه تبدیل در کل پروژه */
export function toRial(toman: number): number {
  return Math.round(toman * 10)
}

/**
 * پوشاندن شماره کارت.
 * فقط ۴ رقم آخر نگه داشته می‌شود؛ شماره کامل کارت مشتری هرگز در دیتابیس
 * (و نسخه پشتیبان) نمی‌نشیند.
 */
export function maskCardPan(pan: string | null | undefined): string | null {
  if (!pan) return null
  const digits = pan.replace(/\D/g, '')
  if (digits.length < 4) return null
  return `****${digits.slice(-4)}`
}

/** ساخت آدرس صفحه پرداخت درگاه از روی authority */
export function buildStartPayUrl(authority: string, startPayBase: string): string {
  return `${startPayBase.replace(/\/+$/, '')}/${encodeURIComponent(authority)}`
}

// ─────────────────────────────────────────────────────────────
//  پیکربندی
// ─────────────────────────────────────────────────────────────

export interface ZarinpalGatewayRow {
  key: string
  isActive: boolean
  isSandbox: boolean
  merchantId: string | null
}

export interface ZarinpalConfig {
  /** آیا امکان **شروع** پرداخت تازه وجود دارد؟ (درگاه فعال + شناسه پذیرنده) */
  ready: boolean
  /** آیا امکان **تأیید** تراکنشی که قبلاً آغاز شده وجود دارد؟ */
  verifyReady: boolean
  /** درگاه در پنل مدیریت خاموش است (ولی ممکن است تراکنش باز داشته باشیم) */
  disabled: boolean
  /** دلیل آماده نبودن — همان متنی که به کاربر/اپراتور نشان داده می‌شود */
  reason: string | null
  merchantId: string | null
  sandbox: boolean
  apiBase: string
  startPayBase: string
}

/**
 * تعیین پیکربندی از ردیف درگاه + متغیرهای محیطی (تابع خالص، بدون I/O).
 *
 * ترتیب اولویت: دیتابیس → متغیر محیطی → پیش‌فرض کد. اگر درگاه در پنل
 * خاموش باشد، حتی وجود شناسه پذیرنده هم آن را روشن نمی‌کند.
 *
 * ⚠️ تفاوت `ready` و `verifyReady` عمدی است: خاموش‌کردن درگاه باید جلوی
 * **شروع پرداخت تازه** را بگیرد، ولی نباید تأیید تراکنشی را که مشتری پیش از
 * خاموش‌شدن آغاز کرده (و ممکن است پولش کم شده باشد) مسدود کند. در آن حالت
 * تنها راه فهمیدن حقیقت، همان متد verify است.
 */
export function resolveZarinpalConfig(input: {
  gateway: ZarinpalGatewayRow | null
  env?: Record<string, string | undefined>
}): ZarinpalConfig {
  const env = input.env ?? {}
  const gateway = input.gateway
  const endpoints = gateway?.isSandbox === false ? ZARINPAL_ENDPOINTS.live : ZARINPAL_ENDPOINTS.sandbox

  // متغیرهای محیطی فقط برای آزمون/پروکسی محلی یا وقتی پنل مقداری ندارد
  const apiBase = env.ZARINPAL_API_BASE?.trim() || endpoints.api
  const startPayBase = env.ZARINPAL_STARTPAY_BASE?.trim() || endpoints.startPay

  const merchantId = gateway?.merchantId?.trim() || env.ZARINPAL_MERCHANT_ID?.trim() || null
  const sandbox = gateway?.isSandbox ?? true
  const disabled = Boolean(gateway && !gateway.isActive)

  const base: ZarinpalConfig = {
    ready: false,
    verifyReady: false,
    disabled,
    reason: null,
    merchantId,
    sandbox,
    apiBase,
    startPayBase,
  }

  if (!merchantId) {
    return { ...base, reason: 'شناسه پذیرندهٔ زرین‌پال در پنل مدیریت ثبت نشده است.' }
  }
  if (disabled) {
    return { ...base, verifyReady: true, reason: 'پرداخت آنلاین در پنل مدیریت غیرفعال است.' }
  }

  return { ...base, ready: true, verifyReady: true }
}

/** خواندن پیکربندی از دیتابیس و محیط — همین تابع در زمان پرداخت صدا زده می‌شود */
export async function loadZarinpalConfig(): Promise<ZarinpalConfig> {
  const row = await prisma.paymentGateway.findUnique({ where: { key: ONLINE_GATEWAY_KEY } })
  return resolveZarinpalConfig({
    gateway: row
      ? {
          key: row.key,
          isActive: row.isActive,
          isSandbox: row.isSandbox,
          merchantId: row.merchantId,
        }
      : null,
    env: process.env,
  })
}

// ─────────────────────────────────────────────────────────────
//  تفسیر پاسخ درگاه
// ─────────────────────────────────────────────────────────────

export interface ZarinpalFailure {
  ok: false
  code: number | null
  message: string
}

export type ZarinpalRequestParsed = { ok: true; authority: string } | ZarinpalFailure

export type ZarinpalVerifyParsed =
  | { ok: true; code: number; refId: string | null; cardPan: string | null; alreadyVerified: boolean }
  | ZarinpalFailure

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asText(value: unknown): string | null {
  // رشته خالی هم‌ارزش «مقدار ندارد» است. بدون این نرمال‌سازی، پاسخ درگاهی
  // که `message` را خالی می‌فرستد به خطای فارسی خالی تبدیل می‌شد و کاربر
  // فقط یک کادر بی‌متن می‌دید.
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim()
  if (typeof value === 'number') return String(value)
  return null
}

/**
 * استخراج کد و پیام خطا از بدنه پاسخ.
 * زرین‌پال در نسخه‌های مختلف، خطا را هم به شکل آرایه و هم شیء برمی‌گرداند؛
 * پس هر دو حالت پوشش داده می‌شود تا خطای واقعی درگاه به «خطای ناشناخته»
 * تبدیل نشود.
 */
export function readZarinpalError(payload: unknown): { code: number | null; message: string | null } {
  const record = asRecord(payload)
  if (!record) return { code: null, message: null }

  const raw = record.errors
  let candidate: unknown = raw
  if (Array.isArray(raw)) candidate = raw.length > 0 ? raw[0] : null

  const errorRecord = asRecord(candidate)
  if (errorRecord) {
    const code = typeof errorRecord.code === 'number' ? errorRecord.code : null
    return { code, message: asText(errorRecord.message) }
  }

  // خطای متنی ساده: { errors: ["..."] }
  const text = asText(candidate)
  if (text) return { code: null, message: text }

  return { code: null, message: null }
}

/**
 * تفسیر پاسخ «درخواست پرداخت».
 * تنها کد موفق ۱۰۰ است؛ هر چیز دیگری خطا محسوب می‌شود.
 */
export function parseZarinpalRequest(payload: unknown): ZarinpalRequestParsed {
  const record = asRecord(payload)
  if (!record) {
    return { ok: false, code: null, message: 'پاسخ درگاه قابل خواندن نبود.' }
  }

  const data = asRecord(record.data)
  const code = typeof data?.code === 'number' ? data.code : null

  if (code === 100) {
    const authority = asText(data?.authority)
    if (!authority) {
      return { ok: false, code: null, message: 'درگاه در پاسخ خود شناسه تراکنش برنگرداند.' }
    }
    return { ok: true, authority }
  }

  const error = readZarinpalError(payload)
  const finalCode = error.code ?? code
  return {
    ok: false,
    code: finalCode,
    // اول متن فارسی خودمان (برای کدهای شناخته‌شده) و بعد پیام خام درگاه:
    // پیام خام معمولاً انگلیسی و فنی است، ولی برای کد ناشناخته از
    // «خطای نامشخص» بی‌فایده‌تر است.
    message: zarinpalErrorMessage(finalCode, error.message ?? 'درخواست پرداخت پذیرفته نشد.'),
  }
}

/**
 * تفسیر پاسخ «تأیید پرداخت».
 *
 * کد ۱۰۰ = تأیید موفق و کد ۱۰۱ = تراکنش قبلاً تأیید شده است. دومی خطا
 * نیست: اگر آن را خطا بگیریم، مشتری پول داده ولی سفارش بی‌پرداخت می‌ماند
 * (مثلاً وقتی صفحه را رفرش کرده یا شبکه هنگام پاسخ قطع شده است).
 */
export function parseZarinpalVerify(payload: unknown): ZarinpalVerifyParsed {
  const record = asRecord(payload)
  if (!record) {
    return { ok: false, code: null, message: 'پاسخ درگاه قابل خواندن نبود.' }
  }

  const data = asRecord(record.data)
  const code = typeof data?.code === 'number' ? data.code : null

  if (code === 100 || code === 101) {
    return {
      ok: true,
      code,
      refId: asText(data?.ref_id),
      cardPan: asText(data?.card_pan),
      alreadyVerified: code === 101,
    }
  }

  const error = readZarinpalError(payload)
  const finalCode = error.code ?? code
  return {
    ok: false,
    code: finalCode,
    message: zarinpalErrorMessage(
      finalCode,
      error.message ?? 'تأیید پرداخت از سوی درگاه انجام نشد.',
    ),
  }
}

// ─────────────────────────────────────────────────────────────
//  فراخوانی شبکه‌ای
// ─────────────────────────────────────────────────────────────

/** وابستگی‌های تزریقی — آزمون‌ها به‌جای `fetch` واقعی، جواب شبیه‌سازی‌شده می‌دهند */
export interface ZarinpalFetchDeps {
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 9000

async function postToZarinpal(
  url: string,
  body: Record<string, unknown>,
  deps: ZarinpalFetchDeps,
): Promise<{ ok: true; payload: unknown } | ZarinpalFailure> {
  const fetchImpl = deps.fetchImpl ?? fetch
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    })

    // بدنه خطا هم خوانده می‌شود: زرین‌پال دلیل رد شدن را همان‌جا می‌گذارد
    const payload = await response.json().catch(() => null)

    if (!response.ok && payload === null) {
      return { ok: false, code: null, message: `پاسخ درگاه پرداخت: ${response.status}` }
    }
    if (payload === null) {
      return { ok: false, code: null, message: 'پاسخ درگاه قابل خواندن نبود.' }
    }
    return { ok: true, payload }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطای نامشخص'
    return {
      ok: false,
      code: null,
      message: `ارتباط با درگاه پرداخت برقرار نشد (${message}).`,
    }
  }
}

export interface RequestPaymentInput {
  config: ZarinpalConfig
  /** مبلغ به ریال — از `toRial` بیاید، نه از کلاینت */
  amountRial: number
  description: string
  callbackUrl: string
  mobile?: string | null
  email?: string | null
  /** شماره سفارش — برای جست‌وجوی راحت‌تر تراکنش در پنل زرین‌پال */
  orderId?: string | null
}

export type RequestPaymentResult =
  | { ok: true; authority: string; redirectUrl: string }
  | ZarinpalFailure

/** درخواست پرداخت از زرین‌پال و دریافت authority */
export async function requestZarinpalPayment(
  input: RequestPaymentInput,
  deps: ZarinpalFetchDeps = {},
): Promise<RequestPaymentResult> {
  if (!input.config.ready || !input.config.merchantId) {
    return {
      ok: false,
      code: null,
      message: input.config.reason ?? 'درگاه پرداخت آنلاین آماده نیست.',
    }
  }

  // سقف درگاه پیش از تماس با شبکه بررسی می‌شود تا خطای ‎-41 به شکست تراکنش
  // در میانه کار تبدیل نشود
  if (!Number.isFinite(input.amountRial) || input.amountRial <= 0) {
    return { ok: false, code: -9, message: 'مبلغ پرداخت نامعتبر است.' }
  }
  if (input.amountRial > toRial(ZARINPAL_MAX_AMOUNT_TOMAN)) {
    return { ok: false, code: -41, message: zarinpalErrorMessage(-41) }
  }

  const metadata: Record<string, string> = {}
  if (input.mobile) metadata.mobile = input.mobile
  if (input.email) metadata.email = input.email
  if (input.orderId) metadata.order_id = input.orderId

  const sent = await postToZarinpal(
    `${input.config.apiBase.replace(/\/+$/, '')}/request.json`,
    {
      merchant_id: input.config.merchantId,
      amount: input.amountRial,
      callback_url: input.callbackUrl,
      description: input.description,
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    },
    deps,
  )

  if (!sent.ok) return sent

  const parsed = parseZarinpalRequest(sent.payload)
  if (!parsed.ok) return parsed

  return {
    ok: true,
    authority: parsed.authority,
    redirectUrl: buildStartPayUrl(parsed.authority, input.config.startPayBase),
  }
}

export interface VerifyPaymentInput {
  config: ZarinpalConfig
  amountRial: number
  authority: string
}

export type VerifyPaymentResult =
  | { ok: true; refId: string | null; cardPan: string | null; alreadyVerified: boolean }
  | ZarinpalFailure

/** تأیید پرداخت پس از بازگشت کاربر از درگاه */
export async function verifyZarinpalPayment(
  input: VerifyPaymentInput,
  deps: ZarinpalFetchDeps = {},
): Promise<VerifyPaymentResult> {
  // عمداً `verifyReady` و نه `ready`: اگر مدیر درگاه را همین حالا خاموش کند،
  // باید بازگشت مشتری‌ای که تراکنشش آغاز شده هنوز تأیید شود.
  if (!input.config.verifyReady || !input.config.merchantId) {
    return {
      ok: false,
      code: null,
      message: input.config.reason ?? 'تأیید پرداخت درگاه آنلاین ممکن نیست.',
    }
  }

  const sent = await postToZarinpal(
    `${input.config.apiBase.replace(/\/+$/, '')}/verify.json`,
    {
      merchant_id: input.config.merchantId,
      amount: input.amountRial,
      authority: input.authority,
    },
    deps,
  )

  if (!sent.ok) return sent

  const parsed = parseZarinpalVerify(sent.payload)
  if (!parsed.ok) return parsed

  return {
    ok: true,
    refId: parsed.refId,
    cardPan: parsed.cardPan,
    alreadyVerified: parsed.alreadyVerified,
  }
}
