import { describe, expect, it } from 'vitest'
import { resolveCallbackUrl } from './flow'

/**
 * آدرس بازگشت از درگاه.
 *
 * این آدرس را زرین‌پال با «دامنه ثبت‌شده پذیرنده» مقایسه می‌کند و کوچک‌ترین
 * اختلاف (پورت، اسکیم، اسلش اضافه) تراکنش را با خطای ‎-14 رد می‌کند. پس
 * شکل درست این آدرس یک قرارداد است، نه یک جزئیات.
 */
describe('آدرس بازگشت از درگاه', () => {
  it('مقدار صریح محیطی بر همه‌چیز مقدم است', () => {
    expect(
      resolveCallbackUrl({
        ZARINPAL_CALLBACK_URL: 'https://nodehi.ir/api/payments/zarinpal/callback',
        NEXT_PUBLIC_SITE_URL: 'https://staging.nodehi.ir',
      }),
    ).toBe('https://nodehi.ir/api/payments/zarinpal/callback')
  })

  it('در نبود مقدار صریح، از آدرس سایت ساخته می‌شود', () => {
    expect(resolveCallbackUrl({ NEXT_PUBLIC_SITE_URL: 'https://nodehi.ir' })).toBe(
      'https://nodehi.ir/api/payments/zarinpal/callback',
    )
  })

  it('اسلش انتهایی آدرس سایت باعث اسلش دوتایی نمی‌شود', () => {
    expect(resolveCallbackUrl({ NEXT_PUBLIC_SITE_URL: 'https://nodehi.ir///' })).toBe(
      'https://nodehi.ir/api/payments/zarinpal/callback',
    )
  })

  it('بدون هیچ تنظیمی، آدرس توسعه محلی برمی‌گردد', () => {
    expect(resolveCallbackUrl({})).toBe('http://localhost:3000/api/payments/zarinpal/callback')
  })
})
