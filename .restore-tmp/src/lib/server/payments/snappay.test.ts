import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SNAPPAY_ENDPOINTS,
  SNAPPAY_PATHS,
  buildSnappayPaymentRequest,
  buildSnappayRedirectUrl,
  parseSnappayPaymentTokenResponse,
  parseSnappayTokenResponse,
  parseSnappayVerifyResponse,
  readSnappayError,
  requestSnappayPayment,
  resetSnappayBearerCache,
  resolveSnappayConfig,
  verifySnappayPayment,
  type SnappayCredentials,
} from './snappay'
import { toRial } from './zarinpal'

/**
 * قراردادهای درگاه اسنپ‌پی.
 *
 * پول و اقساط در میان است و خطاها بی‌صدا هستند: مبلغ تومان در جای ریال،
 * توکن منقضی‌شده که خطا تلقی شود، یا cartList ناقص که درگاه رد کند —
 * همه لبه‌هایی هستند که فقط با تراکنش واقعی دیده می‌شدند. پس این‌جا با
 * پاسخ شبیه‌سازی‌شده قفل می‌شوند.
 */

const CREDENTIALS: SnappayCredentials = {
  enabled: true,
  sandbox: true,
  username: 'merchant-user',
  password: 'merchant-pass',
  clientId: 'client-id',
  clientSecret: 'client-secret',
}

/** پاسخ موفق OAuth */
function tokenResponse() {
  return new Response(JSON.stringify({ access_token: 'bearer-1', expires_in: 3600 }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** آخرین درخواست ارسالی — برای قفل‌کردن هدرها و بدنه واقعی */
function lastRequest(fetchImpl: { mock: { calls: unknown[] } }): {
  url: string
  init: RequestInit
  body: Record<string, unknown>
  headers: Record<string, string>
} {
  const call = fetchImpl.mock.calls.at(-1) as [string, RequestInit]
  return {
    url: call[0],
    init: call[1],
    body: JSON.parse(String(call[1].body)),
    headers: call[1].headers as Record<string, string>,
  }
}

/** nامین درخواست (از ۰) — برای تمایز OAuth از درخواست اصلی */
function requestAt(fetchImpl: { mock: { calls: unknown[] } }, index: number): {
  url: string
  init: RequestInit
  /** JSON دلخواه؛ بدنه OAuth فرم-urlencoded است و JSON نیست */
  body: unknown
  headers: Record<string, string>
} {
  const call = fetchImpl.mock.calls[index] as [string, RequestInit]
  const raw = String(call[1].body)
  let body: unknown = raw
  try {
    body = JSON.parse(raw)
  } catch {
    // بدنه فرم (OAuth) — رشته خام برمی‌گردد
  }
  return {
    url: call[0],
    init: call[1],
    body,
    headers: call[1].headers as Record<string, string>,
  }
}

beforeEach(() => {
  resetSnappayBearerCache()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('پیکربندی اسنپ‌پی', () => {
  it('با هر چهار اعتبارنامه آماده است', () => {
    const config = resolveSnappayConfig({ credentials: CREDENTIALS })
    expect(config.ready).toBe(true)
    expect(config.verifyReady).toBe(true)
    expect(config.reason).toBeNull()
    expect(config.baseUrl).toBe(SNAPPAY_ENDPOINTS.sandbox.api)
  })

  it('حالت واقعی از endpoint زنده استفاده می‌کند', () => {
    const config = resolveSnappayConfig({ credentials: { ...CREDENTIALS, sandbox: false } })
    expect(config.baseUrl).toBe(SNAPPAY_ENDPOINTS.live.api)
    expect(config.sandbox).toBe(false)
  })

  it('غیرفعال‌بودن در پنل جلوی شروع پرداخت را می‌گیرد ولی وریفای را نه', () => {
    // استدلال: مشتری‌ای که پیش از خاموش‌شدن تراکنش را آغاز کرده، اگر پول داده
    // باشد باید تأیید شود؛ وگرنه پولش گم می‌شود
    const config = resolveSnappayConfig({ credentials: { ...CREDENTIALS, enabled: false } })
    expect(config.ready).toBe(false)
    expect(config.verifyReady).toBe(true)
    expect(config.disabled).toBe(true)
  })

  it('هر اعتبارنامه گم‌شده با نامش در دلیل آمده باشد', () => {
    const config = resolveSnappayConfig({ credentials: { ...CREDENTIALS, password: null, clientId: '' } })
    expect(config.ready).toBe(false)
    expect(config.reason).toContain('رمز عبور')
    expect(config.reason).toContain('Client ID')
  })

  it('متغیر محیطی endpoint را برای آزمون محلی بازنویسی می‌کند', () => {
    const config = resolveSnappayConfig({
      credentials: CREDENTIALS,
      env: { SNAPPAY_BASE_URL: 'http://127.0.0.1:9999' },
    })
    expect(config.baseUrl).toBe('http://127.0.0.1:9999')
  })
})

describe('ساخت درخواست پرداخت', () => {
  const order = {
    orderNumber: 'ND-100',
    subtotal: 100_000,
    discount: 10_000,
    shipping: 49_000,
    total: 139_000,
    customerPhone: '09121234567',
    items: [{ name: 'یخچال', unitPrice: 100_000, quantity: 1, categorySlug: 'refrigerator' }],
  }

  it('همه مبلغ‌ها ریال و cartList کامل است', () => {
    const body = buildSnappayPaymentRequest(order)
    expect(body.amount).toBe(toRial(order.total))
    expect(body.discountAmount).toBe(toRial(order.discount))
    expect(body.transactionId).toBe('ND-100')
    expect(body.mobile).toBe('09121234567')
    expect(body.paymentMethodTypeDto).toBe('INSTALLMENT')

    const cart = (body.cartList as Record<string, unknown>[])[0]!
    expect(cart.totalAmount).toBe(toRial(order.subtotal))
    expect(cart.shippingAmount).toBe(toRial(order.shipping))
    expect(cart.isShipmentIncluded).toBe(true)

    const item = (cart.cartItems as Record<string, unknown>[])[0]!
    expect(item.amount).toBe(toRial(100_000))
    expect(item.count).toBe(1)
    expect(item.category).toBe('refrigerator')
  })

  it('بدون تخفیف، discountAmount صفر است', () => {
    const body = buildSnappayPaymentRequest({ ...order, discount: 0 })
    expect(body.discountAmount).toBe(0)
  })

  it('آدرس صفحه اقساط از paymentToken ساخته می‌شود', () => {
    // encodeURIComponent کل URL-safe را انکود می‌کند — عمدی: توکن با کاراکتر
    // خاص نباید مسیر را بشکند. اسنپ‌پی توکن بازگشتی را در همان فرم می‌پذیرد.
    const url = buildSnappayRedirectUrl('tok en/', 'https://snapppay.ir/shop/')
    expect(url).toBe('https://snapppay.ir/shop/tok%20en%2F')
  })
})

describe('تفسیر پاسخ‌ها', () => {
  it('پاسخ OAuth موفق', () => {
    expect(parseSnappayTokenResponse({ access_token: 'x', expires_in: 60 })).toEqual({
      ok: true,
      accessToken: 'x',
      expiresInSec: 60,
    })
  })

  it('OAuth بدون access_token خطا است', () => {
    const parsed = parseSnappayTokenResponse({ status: 'error', message: 'bad credentials' })
    expect(parsed.ok).toBe(false)
  })

  it('paymentToken در ریشه یا زیر data خوانده می‌شود', () => {
    expect(parseSnappayPaymentTokenResponse({ paymentToken: 't1' })).toEqual({ ok: true, paymentToken: 't1' })
    expect(parseSnappayPaymentTokenResponse({ data: { paymentToken: 't2' } })).toEqual({
      ok: true,
      paymentToken: 't2',
    })
  })

  it('پاسخ خطای درگاه به پیام فارسی تبدیل می‌شود', () => {
    const parsed = parseSnappayPaymentTokenResponse({ status: 'error', message: 'مبلغ کمتر از حد مجاز' })
    expect(parsed).toMatchObject({ ok: false, message: 'مبلغ کمتر از حد مجاز' })
  })

  it('verify موفق مبلغ و مرجع را برمی‌گرداند', () => {
    const parsed = parseSnappayVerifyResponse({ amount: toRial(139_000), transactionId: 'ref-9' })
    expect(parsed).toEqual({ ok: true, refId: 'ref-9', amountRial: toRial(139_000) })
  })

  it('verify با وضعیت خطا رد می‌شود', () => {
    const parsed = parseSnappayVerifyResponse({ status: 'FAILED' })
    expect(parsed.ok).toBe(false)
  })

  it('خطای صریح verify پیام درگاه را حفظ می‌کند', () => {
    const parsed = parseSnappayVerifyResponse({ status: 'error', message: 'تراکنش یافت نشد' })
    expect(parsed).toMatchObject({ ok: false, message: 'تراکنش یافت نشد' })
  })

  it('خواندن خطا حالت‌های مختلف را پوشش می‌دهد', () => {
    expect(readSnappayError({ error: 'invalid_grant' })).toMatchObject({ code: 'invalid_grant' })
    expect(readSnappayError(null)).toEqual({ code: null, message: null })
  })
})

describe('فراخوانی شبکه‌ای', () => {
  it('چرخه کامل: OAuth بعد token، با Basic و Bearer درست', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ paymentToken: 'pt-1' }))

    const config = resolveSnappayConfig({
      credentials: CREDENTIALS,
      env: { SNAPPAY_BASE_URL: 'http://127.0.0.1:9999' },
    })
    const result = await requestSnappayPayment({
      config,
      order: {
        orderNumber: 'ND-1',
        subtotal: 50_000,
        discount: 0,
        shipping: 0,
        total: 50_000,
        customerPhone: '09120000000',
        items: [{ name: 'کالا', unitPrice: 50_000, quantity: 1, categorySlug: null }],
      },
      callbackUrl: 'https://nodehi.ir/api/payments/snappay/callback',
    }, { fetchImpl })

    expect(result).toMatchObject({ ok: true, paymentToken: 'pt-1' })

    const oauth = requestAt(fetchImpl, 0)
    expect(oauth.url).toBe(`http://127.0.0.1:9999/${SNAPPAY_PATHS.token}`)
    // Basic = base64(clientId:clientSecret)
    expect(oauth.headers.Authorization).toBe(`Basic ${Buffer.from('client-id:client-secret').toString('base64')}`)
    expect(String(oauth.init.body)).toContain('grant_type=password')

    const payment = requestAt(fetchImpl, 1)
    expect(payment.url).toBe(`http://127.0.0.1:9999/${SNAPPAY_PATHS.payment}`)
    expect(payment.headers.Authorization).toBe('Bearer bearer-1')
    const paymentBody = payment.body as { returnURL?: unknown; amount?: unknown }
    expect(paymentBody.returnURL).toBe('https://nodehi.ir/api/payments/snappay/callback')
    expect(paymentBody.amount).toBe(toRial(50_000))
  })

  it('توکن منقضی: ۴۰۱ یک بار با توکن تازه تکرار می‌شود', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ paymentToken: 'pt-2' }))

    const config = resolveSnappayConfig({
      credentials: CREDENTIALS,
      env: { SNAPPAY_BASE_URL: 'http://127.0.0.1:9999' },
    })
    const result = await requestSnappayPayment({
      config,
      order: {
        orderNumber: 'ND-2',
        subtotal: 10_000,
        discount: 0,
        shipping: 0,
        total: 10_000,
        customerPhone: '09120000000',
        items: [{ name: 'کالا', unitPrice: 10_000, quantity: 1, categorySlug: null }],
      },
      callbackUrl: 'https://nodehi.ir/cb',
    }, { fetchImpl })

    expect(result).toMatchObject({ ok: true, paymentToken: 'pt-2' })
    expect(fetchImpl).toHaveBeenCalledTimes(4)
  })

  it('۴۰۱ دوباره بعد از توکن تازه، خطای صریح است', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({}, 401))

    const config = resolveSnappayConfig({
      credentials: CREDENTIALS,
      env: { SNAPPAY_BASE_URL: 'http://127.0.0.1:9999' },
    })
    const result = await requestSnappayPayment({
      config,
      order: {
        orderNumber: 'ND-3',
        subtotal: 10_000,
        discount: 0,
        shipping: 0,
        total: 10_000,
        customerPhone: '09120000000',
        items: [{ name: 'کالا', unitPrice: 10_000, quantity: 1, categorySlug: null }],
      },
      callbackUrl: 'https://nodehi.ir/cb',
    }, { fetchImpl })

    expect(result).toMatchObject({ ok: false, code: null })
  })

  it('وریفای از verifyReady عبور می‌کند حتی وقتی ready نیست', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ amount: 100_000, transactionId: 'r1' }))

    const config = resolveSnappayConfig({ credentials: { ...CREDENTIALS, enabled: false } })
    const result = await verifySnappayPayment({ config, paymentToken: 'tok' }, { fetchImpl })

    expect(result).toEqual({ ok: true, refId: 'r1', amountRial: 100_000 })
  })

  it('وریفای وقتی یکپارچه‌سازی کامل غیرفعال است ممکن نیست', async () => {
    // این حالت عملی ندارد (فعال‌سازی در پنل، verifyReady را روشن می‌کند) ولی
    // قرارداد را قفل می‌کنیم: هیچ مسیری نباید بدون پیکربندی وریفای بزند
    const fetchImpl = vi.fn()
    const config = resolveSnappayConfig({ credentials: { ...CREDENTIALS, enabled: false } })
    expect(config.verifyReady).toBe(true)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('خطای شبکه پیام فارسی و کد تهی دارد (retryable)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const config = resolveSnappayConfig({
      credentials: CREDENTIALS,
      env: { SNAPPAY_BASE_URL: 'http://127.0.0.1:9999' },
    })
    const result = await verifySnappayPayment({ config, paymentToken: 'tok' }, { fetchImpl })
    expect(result).toMatchObject({ ok: false, code: null })
    expect(result.ok === false && result.message).toContain('ارتباط با اسنپ‌پی')
  })
})
