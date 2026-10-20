import { describe, expect, it } from 'vitest'
import { couponAuditAction, parseCouponUpdate } from './admin-coupons'

/** کد تخفیف مستقیماً روی مبلغ پرداختی اثر دارد؛ پس هر قاعده اینجا آزمون دارد. */
const existing = {
  label: 'تخفیف نوروزی',
  percent: 15,
  minSubtotal: 20_000_000 as number | null,
  maxUses: 100 as number | null,
  usedCount: 40,
  startsAt: null as Date | null,
  expiresAt: null as Date | null,
  isActive: true,
}

describe('parseCouponUpdate', () => {
  it('ویرایش معتبر را می‌پذیرد', () => {
    const { fields, data } = parseCouponUpdate({ percent: 20, label: 'تخفیف تازه سال' }, existing)
    expect(fields).toEqual({})
    expect(data.percent).toBe(20)
    expect(data.label).toBe('تخفیف تازه سال')
  })

  it('درصد صفر یا بیشتر از ۹۰ را رد می‌کند', () => {
    expect(parseCouponUpdate({ percent: 0 }, existing).fields.percent).toBeTruthy()
    expect(parseCouponUpdate({ percent: 95 }, existing).fields.percent).toBeTruthy()
  })

  it('توضیح کوتاه‌تر از سه نویسه را رد می‌کند', () => {
    expect(parseCouponUpdate({ label: 'ا' }, existing).fields.label).toBeTruthy()
  })

  it('سقف استفاده کمتر از تعداد مصرف‌شده را رد می‌کند', () => {
    const { fields, data } = parseCouponUpdate({ maxUses: 10 }, existing)
    expect(fields.maxUses).toContain('40')
    expect(data.maxUses).toBeUndefined()
  })

  it('سقف برابر با تعداد مصرف‌شده را می‌پذیرد', () => {
    expect(parseCouponUpdate({ maxUses: 40 }, existing).data.maxUses).toBe(40)
  })

  it('سقف را با صفر (فارسی یا لاتین) حذف می‌کند', () => {
    expect(parseCouponUpdate({ maxUses: '0' }, existing).data.maxUses).toBeNull()
    expect(parseCouponUpdate({ maxUses: '۰' }, existing).data.maxUses).toBeNull()
    expect(parseCouponUpdate({ maxUses: '' }, existing).data.maxUses).toBeNull()
  })

  it('حداقل سبد را با مقدار خالی حذف می‌کند', () => {
    expect(parseCouponUpdate({ minSubtotal: '' }, existing).data.minSubtotal).toBeNull()
    expect(parseCouponUpdate({ minSubtotal: '٠' }, existing).data.minSubtotal).toBeNull()
  })

  it('حداقل سبد منفی را رد می‌کند', () => {
    expect(parseCouponUpdate({ minSubtotal: '-5' }, existing).fields.minSubtotal).toBeTruthy()
  })

  it('تاریخ انقضا را می‌پذیرد و به Date تبدیل می‌کند', () => {
    const { data, fields } = parseCouponUpdate({ expiresAt: '2026-12-31' }, existing)
    expect(fields).toEqual({})
    expect(data.expiresAt).toBeInstanceOf(Date)
  })

  it('تاریخ انقضا را با رشته خالی حذف می‌کند', () => {
    const withExpiry = { ...existing, expiresAt: new Date('2026-12-31') }
    expect(parseCouponUpdate({ expiresAt: '' }, withExpiry).data.expiresAt).toBeNull()
  })

  it('انقضای پیش از شروع را رد می‌کند', () => {
    const started = { ...existing, startsAt: new Date('2026-06-01') }
    const { fields } = parseCouponUpdate({ expiresAt: '2026-05-01' }, started)
    expect(fields.expiresAt).toBeTruthy()
  })

  it('تاریخ نامعتبر را رد می‌کند', () => {
    expect(parseCouponUpdate({ expiresAt: 'سی‌ام اسفند' }, existing).fields.expiresAt).toBeTruthy()
  })

  it('فعال/غیرفعال را فقط وقتی تغییر کرده باشد ثبت می‌کند', () => {
    expect(parseCouponUpdate({ isActive: true }, existing).data.isActive).toBeUndefined()
    expect(parseCouponUpdate({ isActive: false }, existing).data.isActive).toBe(false)
  })

  it('مقدار غیرمنطقی isActive را رد می‌کند', () => {
    expect(parseCouponUpdate({ isActive: 'yes' }, existing).fields.isActive).toBeTruthy()
  })

  it('بی‌تغییری، داده خالی برمی‌گرداند تا کوئری بی‌دلیل اجرا نشود', () => {
    const { data, changed, fields } = parseCouponUpdate(
      { label: existing.label, percent: 15, maxUses: 100 },
      existing,
    )
    expect(fields).toEqual({})
    expect(Object.keys(data)).toHaveLength(0)
    expect(Object.keys(changed)).toHaveLength(0)
  })

  it('تاریخ انقضای یکسان را بازنویسی نمی‌کند (شمارش مصرف و ساعت حفظ می‌شود)', () => {
    const expiry = new Date('2027-09-27T16:19:36.405Z')
    const withDates = { ...existing, startsAt: new Date('2026-01-01'), expiresAt: expiry }
    const { data, changed } = parseCouponUpdate(
      { expiresAt: expiry.toISOString(), startsAt: '2026-01-01' },
      withDates,
    )
    expect(data.expiresAt).toBeUndefined()
    expect(data.startsAt).toBeUndefined()
    expect(changed).toEqual({})
  })
})

describe('couponAuditAction', () => {
  it('برای تغییر خالصِ فعال/غیرفعال، کنش اختصاصی می‌دهد', () => {
    expect(couponAuditAction({ isActive: false })).toBe('coupon.deactivated')
    expect(couponAuditAction({ isActive: true })).toBe('coupon.activated')
  })

  it('برای تغییر فیلدهای دیگر، «ویرایش» می‌دهد', () => {
    expect(couponAuditAction({ percent: 20 })).toBe('coupon.updated')
    expect(couponAuditAction({ percent: 20, isActive: false })).toBe('coupon.updated')
  })
})
