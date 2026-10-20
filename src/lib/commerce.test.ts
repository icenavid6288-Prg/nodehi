import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHIPPING_METHOD_ID,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COST,
  SHIPPING_METHODS,
  computeOrderTotals,
  computeTotals,
  lookupCoupon,
  normalizeCouponCode,
  resolveShippingMethod,
} from './commerce'

describe('normalizeCouponCode', () => {
  it('ارقام فارسی را به لاتین تبدیل می‌کند', () => {
    expect(normalizeCouponCode('nodehi۱۰')).toBe('NODEHI10')
  })

  it('فاصله‌ها را حذف و حروف را بزرگ می‌کند', () => {
    expect(normalizeCouponCode('  welcome 15 ')).toBe('WELCOME15')
  })
})

describe('lookupCoupon', () => {
  it('کد معتبر را پیدا می‌کند', () => {
    const coupon = lookupCoupon('NODEHI10', 100_000_000)
    expect(coupon?.percent).toBe(10)
  })

  it('کد ناشناخته را رد می‌کند', () => {
    expect(lookupCoupon('BOGUS99', 100_000_000)).toBeNull()
  })

  it('کد خالی را رد می‌کند', () => {
    expect(lookupCoupon('   ')).toBeNull()
  })
})

describe('computeOrderTotals', () => {
  it('برای سبد زیر آستانه، هزینه ارسال می‌گیرد', () => {
    const totals = computeOrderTotals(10_000_000)
    expect(totals.discount).toBe(0)
    expect(totals.shipping).toBe(SHIPPING_COST)
    expect(totals.total).toBe(10_000_000 + SHIPPING_COST)
  })

  it('برای سبد بالای آستانه، ارسال رایگان می‌شود', () => {
    const totals = computeOrderTotals(FREE_SHIPPING_THRESHOLD)
    expect(totals.shipping).toBe(0)
    expect(totals.total).toBe(FREE_SHIPPING_THRESHOLD)
  })

  it('سبد خالی هزینه ارسال ندارد', () => {
    const totals = computeOrderTotals(0)
    expect(totals.shipping).toBe(0)
    expect(totals.total).toBe(0)
  })

  it('تخفیف را پیش از محاسبه ارسال اعمال می‌کند', () => {
    const subtotal = 60_000_000
    const totals = computeOrderTotals(subtotal, 'NODEHI10')
    expect(totals.discount).toBe(6_000_000)
    // ۵۴ میلیون هنوز بالای آستانه است، پس ارسال رایگان می‌ماند
    expect(totals.shipping).toBe(0)
    expect(totals.total).toBe(54_000_000)
    expect(totals.coupon?.code).toBe('NODEHI10')
  })

  it('اگر تخفیف سبد را زیر آستانه ببرد، هزینه ارسال برمی‌گردد', () => {
    // ۵۵ میلیون منهای ۱۰٪ = ۴۹٫۵ میلیون، کمی زیر آستانه
    const totals = computeOrderTotals(55_000_000, 'NODEHI10')
    expect(totals.discount).toBe(5_500_000)
    expect(totals.shipping).toBe(SHIPPING_COST)
    expect(totals.total).toBe(49_500_000 + SHIPPING_COST)
  })

  it('کد تخفیف نامعتبر را بی‌اثر می‌گذارد', () => {
    const totals = computeOrderTotals(60_000_000, 'BOGUS99')
    expect(totals.coupon).toBeNull()
    expect(totals.discount).toBe(0)
    expect(totals.total).toBe(60_000_000)
  })

  it('کد تخفیف را با ارقام فارسی می‌پذیرد', () => {
    const totals = computeOrderTotals(60_000_000, 'nowruz۲۰')
    expect(totals.coupon?.code).toBe('NOWRUZ20')
    expect(totals.discount).toBe(12_000_000)
  })

  it('مبلغ نهایی هرگز منفی نمی‌شود', () => {
    const totals = computeOrderTotals(0, 'WELCOME15')
    expect(totals.total).toBe(0)
  })
})

describe('resolveShippingMethod', () => {
  it('روش پیش‌فرض را وقتی شناسه نامعتبر است برمی‌گرداند', () => {
    expect(resolveShippingMethod(undefined).id).toBe(DEFAULT_SHIPPING_METHOD_ID)
    expect(resolveShippingMethod('').id).toBe(DEFAULT_SHIPPING_METHOD_ID)
    expect(resolveShippingMethod('helicopter').id).toBe(DEFAULT_SHIPPING_METHOD_ID)
  })

  it('شناسه معتبر را به همان روش نگاشت می‌کند', () => {
    expect(resolveShippingMethod('tipax').id).toBe('tipax')
  })
})

describe('هزینه ارسال بر پایه روش انتخاب‌شده', () => {
  it('هزینه هر روش ارسال با روش دیگری فرق می‌کند', () => {
    // این همان باگی است که قبلاً وجود داشت: سرور هزینه ثابت حساب می‌کرد
    // در حالی که صفحه تسویه هزینه دیگری را نشان می‌داد.
    const express = computeTotals(10_000_000, null, 'express')
    const tipax = computeTotals(10_000_000, null, 'tipax')
    const freight = computeTotals(10_000_000, null, 'freight')

    expect(express.shipping).toBe(SHIPPING_COST)
    expect(tipax.shipping).toBe(129_000)
    expect(freight.shipping).toBe(390_000)
    expect(new Set([express.shipping, tipax.shipping, freight.shipping]).size).toBe(3)
  })

  it('شناسه نامعتبر به روش پیش‌فرض و هزینه آن برمی‌گردد', () => {
    const totals = computeTotals(10_000_000, null, 'hack-attempt')
    expect(totals.shipping).toBe(SHIPPING_COST)
  })

  it('بالای آستانه، هر روشی که باشد ارسال رایگان است', () => {
    for (const method of SHIPPING_METHODS) {
      expect(computeTotals(FREE_SHIPPING_THRESHOLD + 1, null, method.id).shipping).toBe(0)
    }
  })

  it('سفارش اقساطی/تیپاکس با کد تخفیف هم مبلغ را درست می‌کند', () => {
    const totals = computeOrderTotals(20_000_000, 'NODEHI10', 'tipax')
    expect(totals.discount).toBe(2_000_000)
    expect(totals.shipping).toBe(129_000)
    expect(totals.total).toBe(18_000_000 + 129_000)
  })
})
