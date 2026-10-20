import { describe, expect, it, vi } from 'vitest'
import {
  ONLINE_GATEWAY_KEY,
  ZARINPAL_ENDPOINTS,
  ZARINPAL_MAX_AMOUNT_TOMAN,
  buildStartPayUrl,
  maskCardPan,
  parseZarinpalRequest,
  parseZarinpalVerify,
  readZarinpalError,
  requestZarinpalPayment,
  resolveZarinpalConfig,
  toRial,
  verifyZarinpalPayment,
  zarinpalErrorMessage,
  type ZarinpalGatewayRow,
} from './zarinpal'

/**
 * قراردادهای درگاه زرین‌پال.
 *
 * ── چرا این آزمون‌ها مهم‌اند؟ ──
 * اینجا پولی جابه‌جا می‌شود و خطاها بی‌صدا هستند: یک واحد اشتباه (تومان در
 * برابر ریال) یا یک کد موفق که خطا تلقی شود، یعنی مشتری پول داده و سفارشش
 * پرداخت‌نشده مانده است. هیچ‌کدام هم در توسعه دیده نمی‌شوند، چون تراکنش
 * واقعی لازم دارند. پس این لبه‌ها با پاسخ شبیه‌سازی‌شده قفل می‌شوند.
 */

const AUTHORITY = 'A'.repeat(36)

/** ساخت پاسخ شبیه‌سازی‌شده درگاه */
function gatewayResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * آخرین درخواست ارسالی به درگاه.
 * برای قفل‌کردن پارامترهای واقعی فرستاده‌شده لازم است (مبلغ ریالی،
 * callback_url و نبود پارامتر currency)؛ صرف «موفق شد» کافی نیست.
 */
function lastGatewayRequest(fetchImpl: { mock: { calls: unknown[] } }): {
  url: string
  body: Record<string, unknown>
} {
  const [url, init] = fetchImpl.mock.calls.at(-1) as unknown as [string, RequestInit]
  return { url, body: JSON.parse(String(init.body)) as Record<string, unknown> }
}

function gatewayRow(overrides: Partial<ZarinpalGatewayRow> = {}): ZarinpalGatewayRow {
  return {
    key: ONLINE_GATEWAY_KEY,
    isActive: true,
    isSandbox: true,
    merchantId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    ...overrides,
  }
}

describe('واحد پول: تومان به ریال', () => {
  it('قیمت‌های کاتالوگ تومان‌اند و درگاه ریال می‌خواهد', () => {
    // یک یخچال ۱۲٫۵ میلیون تومانی = ۱۲۵ میلیون ریال
    expect(toRial(12_500_000)).toBe(125_000_000)
  })

  it('مبلغ صفر و اعشار را درست تبدیل می‌کند', () => {
    expect(toRial(0)).toBe(0)
    expect(toRial(1.5)).toBe(15)
    expect(toRial(0.04)).toBe(0)
  })

  it('کلید درگاه آنلاین همان شناسه روش پرداخت در تسویه است', () => {
    expect(ONLINE_GATEWAY_KEY).toBe('online')
  })
})

describe('پوشاندن شماره کارت', () => {
  it('فقط ۴ رقم آخر را نگه می‌دارد', () => {
    expect(maskCardPan('6037991234567890')).toBe('****7890')
  })

  it('خط تیره و فاصله را نادیده می‌گیرد', () => {
    expect(maskCardPan('6037-9912-3456-7890')).toBe('****7890')
  })

  it('برای مقدار تهی یا کوتاه null برمی‌گرداند', () => {
    expect(maskCardPan(null)).toBeNull()
    expect(maskCardPan(undefined)).toBeNull()
    expect(maskCardPan('')).toBeNull()
    expect(maskCardPan('123')).toBeNull()
  })
})

describe('ساخت آدرس درگاه', () => {
  it('authority را به آدرس StartPay می‌چسباند', () => {
    expect(buildStartPayUrl(AUTHORITY, ZARINPAL_ENDPOINTS.sandbox.startPay)).toBe(
      `${ZARINPAL_ENDPOINTS.sandbox.startPay}/${AUTHORITY}`,
    )
  })

  it('اسلش انتهایی آدرس پایه را پاک می‌کند', () => {
    expect(buildStartPayUrl('abc', 'https://example.com/pg/StartPay/')).toBe(
      'https://example.com/pg/StartPay/abc',
    )
  })

  it('کاراکترهای خاص را کدگذاری می‌کند', () => {
    expect(buildStartPayUrl('a/b', 'https://example.com')).toBe('https://example.com/a%2Fb')
  })
})

describe('متن فارسی خطاهای درگاه', () => {
  it('کدهای شناخته‌شده متن دقیق فارسی دارند', () => {
    expect(zarinpalErrorMessage(-51)).toContain('لغو')
    expect(zarinpalErrorMessage(-41)).toContain('۱۰۰')
    expect(zarinpalErrorMessage(101)).toBeTruthy()
  })

  it('کد ناشناخته و کد تهی متن پیش‌فرض می‌گیرند', () => {
    expect(zarinpalErrorMessage(-999, 'پیش‌فرض')).toBe('پیش‌فرض')
    expect(zarinpalErrorMessage(null, 'پیش‌فرض')).toBe('پیش‌فرض')
  })
})

describe('تفسیر خطای درگاه', () => {
  it('خطای آرایه‌ای (شکل رایج نسخه ۴) را می‌خواند', () => {
    const error = readZarinpalError({ data: [], errors: [{ code: -10, message: 'IP invalid' }] })
    expect(error).toEqual({ code: -10, message: 'IP invalid' })
  })

  it('خطای متنی ساده را می‌خواند', () => {
    const error = readZarinpalError({ errors: ['خطای متنی'] })
    expect(error.code).toBeNull()
    expect(error.message).toBe('خطای متنی')
  })

  it('بدنه بدون خطا را دست‌نخورده می‌گذارد', () => {
    expect(readZarinpalError({ data: { code: 100 } })).toEqual({ code: null, message: null })
  })

  it('بدنه غیرشیء را تحمل می‌کند', () => {
    expect(readZarinpalError(null)).toEqual({ code: null, message: null })
    expect(readZarinpalError('boom')).toEqual({ code: null, message: null })
  })

  it('آرایه خالی خطا را به خطای ناشناخته تبدیل نمی‌کند', () => {
    expect(readZarinpalError({ errors: [] })).toEqual({ code: null, message: null })
  })
})

describe('تفسیر پاسخ درخواست پرداخت', () => {
  it('کد ۱۰۰ و authority را می‌پذیرد', () => {
    const parsed = parseZarinpalRequest({ data: { code: 100, authority: AUTHORITY }, errors: [] })
    expect(parsed).toEqual({ ok: true, authority: AUTHORITY })
  })

  it('کد موفق بدون authority را خطا می‌گیرد', () => {
    const parsed = parseZarinpalRequest({ data: { code: 100 } })
    expect(parsed.ok).toBe(false)
  })

  it('خطای درگاه را با متن فارسی برمی‌گرداند', () => {
    const parsed = parseZarinpalRequest({ data: { code: -9 }, errors: [{ code: -9, message: 'x' }] })
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.code).toBe(-9)
      expect(parsed.message).toContain('کامل')
    }
  })

  it('بدنه غیرقابل خواندن را خطا می‌گیرد', () => {
    expect(parseZarinpalRequest(null).ok).toBe(false)
    expect(parseZarinpalRequest('nope').ok).toBe(false)
  })
})

describe('تفسیر پاسخ تأیید پرداخت', () => {
  it('کد ۱۰۰ را تأیید موفق می‌خواند', () => {
    const parsed = parseZarinpalVerify({
      data: { code: 100, ref_id: 12345, card_pan: '6037991234567890' },
    })
    expect(parsed).toEqual({
      ok: true,
      code: 100,
      refId: '12345',
      cardPan: '6037991234567890',
      alreadyVerified: false,
    })
  })

  it('کد ۱۰۱ را «قبلاً تأییدشده» می‌خواند، نه خطا', () => {
    // مهم‌ترین آزمون این فایل: اگر ۱۰۱ خطا تلقی شود، مشتری صفحه را رفرش
    // می‌کند و سفارشش برای همیشه پرداخت‌نشده می‌ماند.
    const parsed = parseZarinpalVerify({ data: { code: 101, ref_id: '999' } })
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.alreadyVerified).toBe(true)
  })

  it('خطای ‎-51 (لغو یا ناموفق) را رد می‌کند', () => {
    const parsed = parseZarinpalVerify({ data: { code: -51 }, errors: [{ code: -51, message: '' }] })
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.code).toBe(-51)
      expect(parsed.message).toContain('لغو')
    }
  })
})

describe('پیکربندی درگاه (اولویت پنل مدیریت)', () => {
  it('بدون ردیف درگاه و بدون متغیر محیطی، آماده نیست', () => {
    const config = resolveZarinpalConfig({ gateway: null, env: {} })
    expect(config.ready).toBe(false)
    expect(config.verifyReady).toBe(false)
    expect(config.reason).toContain('شناسه پذیرنده')
    expect(config.apiBase).toBe(ZARINPAL_ENDPOINTS.sandbox.api)
  })

  it('ردیف فعال با شناسه پذیرنده آماده است', () => {
    const config = resolveZarinpalConfig({ gateway: gatewayRow(), env: {} })
    expect(config.ready).toBe(true)
    expect(config.verifyReady).toBe(true)
    expect(config.reason).toBeNull()
    expect(config.sandbox).toBe(true)
  })

  it('حالت واقعی، endpoint تولید را انتخاب می‌کند', () => {
    const config = resolveZarinpalConfig({ gateway: gatewayRow({ isSandbox: false }), env: {} })
    expect(config.apiBase).toBe(ZARINPAL_ENDPOINTS.live.api)
    expect(config.startPayBase).toBe(ZARINPAL_ENDPOINTS.live.startPay)
    expect(config.sandbox).toBe(false)
  })

  it('ردیف غیرفعال شروع پرداخت را می‌بندد ولی تأیید را باز می‌گذارد', () => {
    // خاموش‌کردن درگاه نباید بازگشت مشتری‌ای را که پولش را داده مسدود کند.
    const config = resolveZarinpalConfig({ gateway: gatewayRow({ isActive: false }), env: {} })
    expect(config.ready).toBe(false)
    expect(config.verifyReady).toBe(true)
    expect(config.disabled).toBe(true)
    expect(config.reason).toContain('غیرفعال')
  })

  it('بودن شناسه پذیرنده، درگاه خاموش را روشن نمی‌کند', () => {
    const config = resolveZarinpalConfig({
      gateway: gatewayRow({ isActive: false }),
      env: { ZARINPAL_MERCHANT_ID: 'env-merchant' },
    })
    expect(config.ready).toBe(false)
  })

  it('شناسه پذیرنده پنل بر متغیر محیطی مقدم است', () => {
    const config = resolveZarinpalConfig({
      gateway: gatewayRow({ merchantId: 'db-merchant' }),
      env: { ZARINPAL_MERCHANT_ID: 'env-merchant' },
    })
    expect(config.merchantId).toBe('db-merchant')
  })

  it('در نبود مقدار در پنل، متغیر محیطی جایگزین می‌شود', () => {
    const config = resolveZarinpalConfig({
      gateway: gatewayRow({ merchantId: null }),
      env: { ZARINPAL_MERCHANT_ID: 'env-merchant' },
    })
    expect(config.merchantId).toBe('env-merchant')
    expect(config.ready).toBe(true)
  })

  it('متغیر محیطی می‌تواند آدرس درگاه را برای آزمون عوض کند', () => {
    const config = resolveZarinpalConfig({
      gateway: gatewayRow(),
      env: { ZARINPAL_API_BASE: 'http://127.0.0.1:9999/stub', ZARINPAL_STARTPAY_BASE: 'http://127.0.0.1:9999/pay' },
    })
    expect(config.apiBase).toBe('http://127.0.0.1:9999/stub')
    expect(config.startPayBase).toBe('http://127.0.0.1:9999/pay')
  })

  it('درگاه خاموش بدون شناسه پذیرنده، دلیل شناسه را نشان می‌دهد', () => {
    const config = resolveZarinpalConfig({
      gateway: gatewayRow({ isActive: false, merchantId: null }),
      env: {},
    })
    expect(config.ready).toBe(false)
    expect(config.verifyReady).toBe(false)
    expect(config.reason).toContain('شناسه پذیرنده')
  })
})

describe('درخواست پرداخت', () => {
  it('درگاه ناآماده باعث تماس با شبکه نمی‌شود', async () => {
    const fetchImpl = vi.fn()
    const config = resolveZarinpalConfig({ gateway: gatewayRow({ isActive: false }), env: {} })

    const result = await requestZarinpalPayment(
      { config, amountRial: 1000, description: 'x', callbackUrl: 'https://x/cb' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )

    expect(result.ok).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('مبلغ بیش از سقف درگاه پیش از تماس با شبکه رد می‌شود', async () => {
    const fetchImpl = vi.fn()
    const config = resolveZarinpalConfig({ gateway: gatewayRow(), env: {} })

    const result = await requestZarinpalPayment(
      {
        config,
        amountRial: toRial(ZARINPAL_MAX_AMOUNT_TOMAN) + 1,
        description: 'x',
        callbackUrl: 'https://x/cb',
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe(-41)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('مبلغ نامعتبر را رد می‌کند', async () => {
    const fetchImpl = vi.fn()
    const config = resolveZarinpalConfig({ gateway: gatewayRow(), env: {} })
    const result = await requestZarinpalPayment(
      { config, amountRial: 0, description: 'x', callbackUrl: 'https://x/cb' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )
    expect(result.ok).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('مبلغ ریالی، شناسه پذیرنده و آدرس بازگشت را می‌فرستد', async () => {
    const fetchImpl = vi.fn(async () => gatewayResponse({ data: { code: 100, authority: AUTHORITY } }))
    const config = resolveZarinpalConfig({ gateway: gatewayRow(), env: {} })

    const result = await requestZarinpalPayment(
      {
        config,
        amountRial: toRial(12_500_000),
        description: 'سفارش ND-123456',
        callbackUrl: 'https://nodehi.ir/api/payments/zarinpal/callback',
        mobile: '09120000000',
        orderId: 'ND-123456',
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.redirectUrl).toBe(`${ZARINPAL_ENDPOINTS.sandbox.startPay}/${AUTHORITY}`)
    }

    const { url, body } = lastGatewayRequest(fetchImpl)
    expect(url).toBe(`${ZARINPAL_ENDPOINTS.sandbox.api}/request.json`)
    expect(body.amount).toBe(125_000_000)
    expect(body.merchant_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    expect(body.callback_url).toBe('https://nodehi.ir/api/payments/zarinpal/callback')
    expect(body.metadata).toEqual({ mobile: '09120000000', order_id: 'ND-123456' })
    // پارامتر currency عمداً فرستاده نمی‌شود: واحد همیشه ریال است.
    expect(body).not.toHaveProperty('currency')
  })

  it('خطای درگاه را با متن فارسی برمی‌گرداند', async () => {
    const fetchImpl = vi.fn(async () =>
      gatewayResponse({ data: { code: -12 }, errors: [{ code: -12, message: '' }] }),
    )
    const config = resolveZarinpalConfig({ gateway: gatewayRow(), env: {} })

    const result = await requestZarinpalPayment(
      { config, amountRial: 1000, description: 'x', callbackUrl: 'https://x/cb' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe(-12)
      expect(result.message).toContain('بازه زمانی')
    }
  })

  it('خطای شبکه را به شکست قابل تلاش دوباره تبدیل می‌کند', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNRESET')
    })
    const config = resolveZarinpalConfig({ gateway: gatewayRow(), env: {} })

    const result = await requestZarinpalPayment(
      { config, amountRial: 1000, description: 'x', callbackUrl: 'https://x/cb' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBeNull()
      expect(result.message).toContain('ارتباط')
    }
  })
})

describe('تأیید پرداخت', () => {
  it('درگاهی که مدیر خاموش کرده، همچنان اجازه تأیید تراکنش باز را می‌دهد', async () => {
    // این سنگ‌بنای طراحی است: خاموش‌کردن درگاه یعنی «پرداخت تازه شروع نشود»،
    // نه «پول مشتری گم شود».
    const fetchImpl = vi.fn(async () =>
      gatewayResponse({ data: { code: 100, ref_id: '555', card_pan: '6037991234567890' } }),
    )
    const config = resolveZarinpalConfig({ gateway: gatewayRow({ isActive: false }), env: {} })

    const result = await verifyZarinpalPayment(
      { config, amountRial: 125_000_000, authority: AUTHORITY },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )

    expect(result.ok).toBe(true)
    const { url, body } = lastGatewayRequest(fetchImpl)
    expect(url).toBe(`${ZARINPAL_ENDPOINTS.sandbox.api}/verify.json`)
    expect(body.amount).toBe(125_000_000)
    expect(body.authority).toBe(AUTHORITY)
  })

  it('کد ۱۰۱ را تأییدشده می‌داند', async () => {
    const fetchImpl = vi.fn(async () => gatewayResponse({ data: { code: 101, ref_id: '777' } }))
    const config = resolveZarinpalConfig({ gateway: gatewayRow(), env: {} })

    const result = await verifyZarinpalPayment(
      { config, amountRial: 1000, authority: AUTHORITY },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.alreadyVerified).toBe(true)
      expect(result.refId).toBe('777')
    }
  })

  it('درگاه بدون شناسه پذیرنده حتی تأیید را نمی‌تواند انجام دهد', async () => {
    const fetchImpl = vi.fn()
    const config = resolveZarinpalConfig({ gateway: null, env: {} })

    const result = await verifyZarinpalPayment(
      { config, amountRial: 1000, authority: AUTHORITY },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )

    expect(result.ok).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
