import { describe, expect, it } from 'vitest'
import {
  cleanText,
  isEmail,
  isIranianMobile,
  isIranianPostalCode,
  isSafeKey,
  normalizeIranianMobile,
  readJson,
  toPositiveInt,
} from './validation'

describe('cleanText', () => {
  it('فاصله‌های تکراری را جمع می‌کند', () => {
    expect(cleanText('  علی   محمدی  ')).toBe('علی محمدی')
  })

  it('ورودی غیررشته‌ای را رشته خالی می‌کند', () => {
    expect(cleanText(123)).toBe('')
    expect(cleanText(null)).toBe('')
  })

  it('طول متن را محدود می‌کند', () => {
    expect(cleanText('abcdef', 3)).toBe('abc')
  })
})

describe('toPositiveInt', () => {
  it('ارقام فارسی را می‌پذیرد', () => {
    expect(toPositiveInt('۱۲')).toBe(12)
  })

  it('صفر و منفی را رد می‌کند', () => {
    expect(toPositiveInt('0')).toBeNull()
    expect(toPositiveInt('-4')).toBeNull()
  })

  it('ورودی نامعتبر را رد می‌کند', () => {
    expect(toPositiveInt('abc')).toBeNull()
    expect(toPositiveInt(undefined)).toBeNull()
  })
})

describe('isIranianMobile', () => {
  it('شماره صحیح را می‌پذیرد', () => {
    expect(isIranianMobile('09120000000')).toBe(true)
  })

  it('شماره با ارقام فارسی را می‌پذیرد', () => {
    expect(isIranianMobile('۰۹۱۲۰۰۰۰۰۰۰')).toBe(true)
  })

  it('قالب بین‌المللی +۹۸ را می‌پذیرد', () => {
    expect(isIranianMobile('989120000000')).toBe(true)
  })

  it('شماره کوتاه یا با پیش‌شماره نادرست را رد می‌کند', () => {
    expect(isIranianMobile('0812000000')).toBe(false)
    expect(isIranianMobile('0912000000')).toBe(false)
  })
})

describe('normalizeIranianMobile', () => {
  it('قالب بین‌المللی را به قالب داخلی برمی‌گرداند', () => {
    expect(normalizeIranianMobile('989120000000')).toBe('09120000000')
  })

  it('ارقام فارسی را لاتین می‌کند', () => {
    expect(normalizeIranianMobile('۰۹۱۲۰۰۰۰۰۰۰')).toBe('09120000000')
  })
})

describe('isEmail', () => {
  it('ایمیل معتبر را می‌پذیرد', () => {
    expect(isEmail('user@example.com')).toBe(true)
  })

  it('ایمیل نامعتبر را رد می‌کند', () => {
    expect(isEmail('user@')).toBe(false)
    expect(isEmail('user@localhost')).toBe(false)
    expect(isEmail('')).toBe(false)
  })

  it('ایمیل بسیار بلند را رد می‌کند', () => {
    expect(isEmail(`${'a'.repeat(250)}@example.com`)).toBe(false)
  })
})

describe('isIranianPostalCode', () => {
  it('کد پستی ۱۰ رقمی را می‌پذیرد', () => {
    expect(isIranianPostalCode('1968765432')).toBe(true)
  })

  it('کد کوتاه را رد می‌کند', () => {
    expect(isIranianPostalCode('12345')).toBe(false)
  })
})

describe('isSafeKey', () => {
  it('کلیدهای خطرناک را رد می‌کند', () => {
    expect(isSafeKey('__proto__')).toBe(false)
    expect(isSafeKey('constructor')).toBe(false)
    expect(isSafeKey('prototype')).toBe(false)
  })

  it('کلیدهای معمولی را می‌پذیرد', () => {
    expect(isSafeKey('items')).toBe(true)
  })
})

describe('readJson', () => {
  it('JSON معتبر را می‌خواند', async () => {
    const request = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    })
    expect(await readJson(request)).toEqual({ a: 1 })
  })

  it('بدنه نامعتبر را null برمی‌گرداند', async () => {
    const request = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    })
    expect(await readJson(request)).toBeNull()
  })

  it('آرایه را رد می‌کند', async () => {
    const request = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([1, 2]),
    })
    expect(await readJson(request)).toBeNull()
  })
})
