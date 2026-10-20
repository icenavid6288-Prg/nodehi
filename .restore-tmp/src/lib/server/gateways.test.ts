import { describe, expect, it } from 'vitest'
import { GATEWAY_PRESETS, PAYMENT_METHOD_KEYS, gatewayLabel } from './gateways'

/**
 * کلید درگاه با شناسه روش پرداخت در تسویه یکی است. اگر این دو از هم جدا
 * بیفتند، یک روش پرداخت در پنل «فعال» نشان داده می‌شود ولی تسویه آن را
 * نمی‌شناسد (یا برعکس). این فایل همان قرارداد را قفل می‌کند.
 */

describe('درگاه‌های پرداخت', () => {
  it('برای هر روش پرداخت تسویه یک درگاه تعریف شده است', () => {
    const presetKeys = GATEWAY_PRESETS.map((preset) => preset.key).sort()
    expect(presetKeys).toEqual([...PAYMENT_METHOD_KEYS].sort())
  })

  it('کلید درگاه تکراری وجود ندارد', () => {
    const keys = GATEWAY_PRESETS.map((preset) => preset.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('پرداخت آنلاین در نصب تازه خاموش است', () => {
    // بدون شناسه پذیرنده، درگاه آنلاین قابل استفاده نیست؛ روشن بودنش فقط
    // مشتری را به مسیر بن‌بست می‌برد.
    const online = GATEWAY_PRESETS.find((preset) => preset.key === 'online')
    expect(online?.activeByDefault).toBe(false)
  })

  it('پرداخت درب منزل و اقساطی در نصب تازه روشن هستند', () => {
    expect(GATEWAY_PRESETS.find((preset) => preset.key === 'cod')?.activeByDefault).toBe(true)
    expect(GATEWAY_PRESETS.find((preset) => preset.key === 'installment')?.activeByDefault).toBe(true)
  })

  it('هر درگاه برچسب و توضیح فارسی دارد', () => {
    for (const preset of GATEWAY_PRESETS) {
      expect({ key: preset.key, label: Boolean(preset.label) }).toEqual({ key: preset.key, label: true })
      expect({ key: preset.key, description: Boolean(preset.description) }).toEqual({
        key: preset.key,
        description: true,
      })
    }
  })

  it('gatewayLabel برای درگاه شناخته‌شده برچسب و برای ناشناخته همان کلید را می‌دهد', () => {
    expect(gatewayLabel('cod')).toBe('پرداخت درب منزل')
    expect(gatewayLabel('mystery')).toBe('mystery')
  })
})
