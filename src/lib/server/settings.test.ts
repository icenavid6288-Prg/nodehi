import { afterEach, describe, expect, it } from 'vitest'
import {
  SETTING_DEFS,
  SETTING_GROUP_ORDER,
  decryptSecret,
  encryptSecret,
  isEncryptionEnabled,
  parseSettingValue,
  type SettingDef,
  type SettingGroup,
} from './settings'

/**
 * تنظیمات پنل مدیریت، ورودی مستقیم مدیر است و بعضی کلیدها محرمانه‌اند.
 * دو چیز اینجا آزمون می‌شود: اعتبارسنجی مقدار (که خرابی وارد دیتابیس نشود) و
 * رمزنگاری کلیدهای حساس (که متن ساده نمانند).
 */

function def(overrides: Partial<SettingDef>): SettingDef {
  return { key: 'x.y', group: 'general', label: 'آزمون', type: 'text', ...overrides }
}

function key(byte = 7): string {
  return Buffer.alloc(32, byte).toString('hex')
}

const originalKey = process.env.SETTINGS_ENCRYPTION_KEY

afterEach(() => {
  if (originalKey === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY
  else process.env.SETTINGS_ENCRYPTION_KEY = originalKey
})

describe('parseSettingValue — بولی', () => {
  it('بولین و رشته true/false را می‌پذیرد', () => {
    const boolean = def({ type: 'boolean' })
    expect(parseSettingValue(boolean, true)).toEqual({ ok: true, value: 'true' })
    expect(parseSettingValue(boolean, false)).toEqual({ ok: true, value: 'false' })
    expect(parseSettingValue(boolean, 'true')).toEqual({ ok: true, value: 'true' })
    expect(parseSettingValue(boolean, 'false')).toEqual({ ok: true, value: 'false' })
  })

  it('مقدار غیربولی را رد می‌کند', () => {
    const result = parseSettingValue(def({ type: 'boolean' }), 'بله')
    expect(result.ok).toBe(false)
  })
})

describe('parseSettingValue — عدد', () => {
  const number = def({ key: 'site.lowStockThreshold', type: 'number', min: 0, max: 1000 })

  it('رقم فارسی و جداکننده را به عدد لاتین تبدیل می‌کند', () => {
    expect(parseSettingValue(number, '۳')).toEqual({ ok: true, value: '3' })
    // جداکننده هزارگان و رقم فارسی در کلیدی بدون سقف
    expect(parseSettingValue(def({ type: 'number' }), '۱,۲۰۰')).toEqual({ ok: true, value: '1200' })
  })

  it('عدد منفی را رد می‌کند', () => {
    expect(parseSettingValue(number, '-1').ok).toBe(false)
    expect(parseSettingValue(number, '−1').ok).toBe(false)
  })

  it('خارج از بازه را رد می‌کند', () => {
    expect(parseSettingValue(number, '5000').ok).toBe(false)
    const boundedMin = { ...number, min: 5 }
    expect(parseSettingValue(boundedMin, '2').ok).toBe(false)
  })

  it('رشته خالی یعنی «پاک کن» نه خطا', () => {
    expect(parseSettingValue(number, '')).toEqual({ ok: true, value: null })
  })

  it('عدد نامعتبر را رد می‌کند', () => {
    expect(parseSettingValue(number, 'زیاد').ok).toBe(false)
  })
})

describe('parseSettingValue — متن', () => {
  it('متن چندخطی خطوط را نگه می‌دارد و فاصله‌های اضافه را جمع می‌کند', () => {
    const textarea = def({ type: 'textarea' })
    expect(parseSettingValue(textarea, '  خط اول \r\n\r\n   خط دوم  ')).toEqual({
      ok: true,
      value: 'خط اول\n\nخط دوم',
    })
    expect(parseSettingValue(textarea, '   ')).toEqual({ ok: true, value: null })
  })

  it('متن یک‌خطی فاصله‌های اضافه را یکی می‌کند', () => {
    expect(parseSettingValue(def({ type: 'text' }), ' الف    ب ')).toEqual({
      ok: true,
      value: 'الف ب',
    })
  })

  it('مقدار غیرمتنی را رد می‌کند', () => {
    expect(parseSettingValue(def({ type: 'text' }), { nested: true }).ok).toBe(false)
  })
})

describe('parseSettingValue — مقدار حساس', () => {
  it('فاصله سر و ته کلید API را حذف می‌کند', () => {
    const result = parseSettingValue(def({ type: 'secret' }), '  abc123\n')
    expect(result).toEqual({ ok: true, value: 'abc123' })
  })

  it('رشته خالی یعنی پاک‌کردن مقدار', () => {
    expect(parseSettingValue(def({ type: 'secret' }), '')).toEqual({ ok: true, value: null })
  })

  it('مقدار غیررشته‌ای را رد می‌کند', () => {
    expect(parseSettingValue(def({ type: 'secret' }), 12345).ok).toBe(false)
  })
})

describe('رمزنگاری مقدارهای حساس', () => {
  it('بدون کلید، مقدار همان‌طور ذخیره و خوانده می‌شود', () => {
    delete process.env.SETTINGS_ENCRYPTION_KEY
    expect(isEncryptionEnabled()).toBe(false)
    expect(encryptSecret('plain')).toBe('plain')
    expect(decryptSecret('plain')).toBe('plain')
  })

  it('با کلید، رفت‌وبرگشت درست انجام می‌شود و متن ساده لو نمی‌رود', () => {
    process.env.SETTINGS_ENCRYPTION_KEY = key()
    expect(isEncryptionEnabled()).toBe(true)

    const stored = encryptSecret('secret-value')
    expect(stored.startsWith('enc:v1:')).toBe(true)
    expect(stored).not.toContain('secret-value')
    expect(decryptSecret(stored)).toBe('secret-value')
  })

  it('با کلید ۳۲ بایتی base64 هم کار می‌کند', () => {
    process.env.SETTINGS_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64')
    expect(decryptSecret(encryptSecret('abc'))).toBe('abc')
  })

  it('کلید با طول اشتباه نادیده گرفته می‌شود تا سایت از کار نیفتد', () => {
    process.env.SETTINGS_ENCRYPTION_KEY = 'too-short'
    expect(isEncryptionEnabled()).toBe(false)
    expect(encryptSecret('abc')).toBe('abc')
  })

  it('مقدار رمزنگاری‌شده‌ای که دستکاری شده است null می‌دهد', () => {
    process.env.SETTINGS_ENCRYPTION_KEY = key()
    const stored = encryptSecret('secret-value')
    const tampered = `${stored.slice(0, -2)}00`
    expect(decryptSecret(tampered)).toBeNull()
  })

  it('مقدار رمزنگاری‌شده با کلید عوض‌شده قابل رمزگشایی نیست', () => {
    process.env.SETTINGS_ENCRYPTION_KEY = key(1)
    const stored = encryptSecret('secret-value')
    process.env.SETTINGS_ENCRYPTION_KEY = key(2)
    expect(decryptSecret(stored)).toBeNull()
  })

  it('مقدار خراب بدون ساختار درست null می‌دهد', () => {
    process.env.SETTINGS_ENCRYPTION_KEY = key()
    expect(decryptSecret('enc:v1:not-valid')).toBeNull()
    expect(decryptSecret(null)).toBeNull()
  })
})

describe('فهرست کلیدهای تنظیمات', () => {
  it('کلیدها یکتا هستند', () => {
    const keys = SETTING_DEFS.map((item) => item.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('هر کلید به یک گروه شناخته‌شده تعلق دارد', () => {
    const groups = new Set<SettingGroup>(SETTING_GROUP_ORDER)
    for (const item of SETTING_DEFS) {
      expect(groups.has(item.group)).toBe(true)
    }
  })

  it('هیچ مقدار حساسی عمومی نیست', () => {
    // افشای کلید API پیامک یا کلید امضای وبهوک از مسیر بدون احراز هویت،
    // باید غیرممکن باشد
    for (const item of SETTING_DEFS) {
      if (item.public) expect(item.type).not.toBe('secret')
    }
  })

  it('مقدار پیش‌فرض هر کلید با نوعش می‌خواند', () => {
    for (const item of SETTING_DEFS) {
      if (item.default === undefined) continue
      const parsed = parseSettingValue(item, item.default)
      expect({ key: item.key, ok: parsed.ok }).toEqual({ key: item.key, ok: true })
    }
  })

  it('برای هر گروه حداقل یک کلید تعریف شده است', () => {
    for (const group of SETTING_GROUP_ORDER) {
      expect(SETTING_DEFS.some((item) => item.group === group)).toBe(true)
    }
  })

  it('همه یکپارچه‌سازی‌های خارجی به‌صورت پیش‌فرض غیرفعال‌اند', () => {
    // قرارداد کاربر: جای اتصال اسنپ‌پی/دیجی‌کالا/ترب هست، ولی هیچ‌کدام فعال نیستند
    const enabledKeys = SETTING_DEFS.filter(
      (item) => item.key.startsWith('integration.') && item.key.endsWith('.enabled'),
    )
    expect(enabledKeys.map((item) => item.key).sort()).toEqual([
      'integration.digikala.enabled',
      'integration.snappay.enabled',
      'integration.torob.enabled',
    ])
    for (const item of enabledKeys) {
      expect(item.default).toBe('false')
    }
  })

  it('هیچ کلید یکپارچه‌سازی عمومی نیست', () => {
    // وضعیت اتصال سرویس بیرونی به فروشگاه، اطلاعات داخلی است؛ لازم نیست
    // از API عمومی خوانده شود. اگر روزی فروشگاه به آن نیاز داشت، عامدانه
    // و با تست به‌روز می‌شود.
    for (const item of SETTING_DEFS) {
      if (item.key.startsWith('integration.')) expect(item.public).toBeUndefined()
    }
  })

  it('اعتبارنامه یکپارچه‌سازی‌ها از متغیر محیطی هم خوانده می‌شوند', () => {
    // اسنپ‌پی چهار اعتبارنامه OAuth دارد؛ رمز و secret از جنس محرمانه‌اند
    for (const envName of [
      'SNAPPAY_PASSWORD',
      'SNAPPAY_CLIENT_SECRET',
      'DIGIKALA_VENDOR_API_KEY',
      'TOROB_API_KEY',
    ]) {
      expect(
        SETTING_DEFS.some((item) => item.type === 'secret' && item.env === envName),
      ).toBe(true)
    }
  })
})
