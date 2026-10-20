import { describe, expect, it } from 'vitest'
import { parseOrderUpdate } from './admin-orders'

/**
 * تغییرهای پنل مستقیماً روی سفارش مشتری می‌نشینند؛ پس هر قاعده اینجا باید
 * آزمون داشته باشد: رد مقدار نامعتبر، پذیرش پاک‌کردن، و نادیده‌گرفتن مقداری
 * که عوض نشده است.
 */
const existing = {
  status: 'pending',
  trackingCode: null as string | null,
  note: null as string | null,
  shippingMethod: 'ارسال همان‌روز (تهران و کرج)',
}

describe('parseOrderUpdate', () => {
  it('تغییر وضعیت معتبر را می‌پذیرد', () => {
    const { fields, changes } = parseOrderUpdate({ status: 'shipped' }, existing)
    expect(fields).toEqual({})
    expect(changes.status).toBe('shipped')
  })

  it('وضعیت نامعتبر را رد می‌کند', () => {
    const { fields, changes } = parseOrderUpdate({ status: 'teleported' }, existing)
    expect(fields.status).toBeTruthy()
    expect(changes.status).toBeUndefined()
  })

  it('وضعیت یکسان را «تغییر» حساب نمی‌کند', () => {
    const { fields, changes } = parseOrderUpdate({ status: 'pending' }, existing)
    expect(fields).toEqual({})
    expect(changes.status).toBeUndefined()
  })

  it('کد رهگیری با ارقام فارسی را یکسان‌سازی می‌کند', () => {
    const { fields, changes } = parseOrderUpdate({ trackingCode: '۱۲۳۴۵۶۷۸۹۰' }, existing)
    expect(fields).toEqual({})
    expect(changes.trackingCode).toBe('1234567890')
  })

  it('کد رهگیری کوتاه را رد می‌کند', () => {
    expect(parseOrderUpdate({ trackingCode: '12' }, existing).fields.trackingCode).toBeTruthy()
  })

  it('نویسه غیرمجاز در کد رهگیری را رد می‌کند', () => {
    expect(parseOrderUpdate({ trackingCode: '12<34>' }, existing).fields.trackingCode).toBeTruthy()
  })

  it('رشته خالی، کد رهگیری موجود را پاک می‌کند', () => {
    const withCode = { ...existing, trackingCode: 'ABC12345' }
    const { changes } = parseOrderUpdate({ trackingCode: '   ' }, withCode)
    expect(changes.trackingCode).toBeNull()
  })

  it('پاک‌کردن کد روی سفارشی که کدی ندارد، تغییری ثبت نمی‌کند', () => {
    const { changes } = parseOrderUpdate({ trackingCode: '' }, existing)
    expect(changes.trackingCode).toBeUndefined()
  })

  it('یادداشت خالی به null تبدیل می‌شود', () => {
    const withNote = { ...existing, note: 'یادداشت قبلی' }
    expect(parseOrderUpdate({ note: '   ' }, withNote).changes.note).toBeNull()
  })

  it('یادداشت بلندتر از سقف را می‌برد، نه رد می‌کند', () => {
    const { changes } = parseOrderUpdate({ note: 'ا'.repeat(900) }, existing)
    expect((changes.note as string).length).toBe(500)
  })

  it('شناسه روش ارسال را به برچسب فارسی نگاشت می‌کند', () => {
    const { changes } = parseOrderUpdate({ shippingMethod: 'tipax' }, existing)
    expect(changes.shippingMethod).toBe('تیپاکس — سراسر کشور')
  })

  it('برچسب روش ارسال را همان‌طور که هست می‌پذیرد', () => {
    const { changes } = parseOrderUpdate({ shippingMethod: 'باربری — کالاهای حجیم' }, existing)
    expect(changes.shippingMethod).toBe('باربری — کالاهای حجیم')
  })

  it('روش ارسال نامعتبر را به روش پیش‌فرض برمی‌گرداند، نه مقدار خام ورودی', () => {
    // سفارش فعلی باربری است؛ ورودی نامعتبر باید همان برچسب پیش‌فرض شود
    const freight = { ...existing, shippingMethod: 'باربری — کالاهای حجیم' }
    const { changes } = parseOrderUpdate({ shippingMethod: 'hack' }, freight)
    expect(changes.shippingMethod).toBe('ارسال همان‌روز (تهران و کرج)')
    expect(changes.shippingMethod).not.toBe('hack')
  })

  it('روش ارسال یکسان را «تغییر» حساب نمی‌کند', () => {
    expect(parseOrderUpdate({ shippingMethod: 'express' }, existing).changes.shippingMethod).toBeUndefined()
  })

  it('درخواست بدون هیچ فیلد شناخته‌شده را «بی‌اثر» علامت می‌زند', () => {
    const { requested, changes } = parseOrderUpdate({ nonsense: 1 }, existing)
    expect(requested).toBe(false)
    expect(Object.keys(changes)).toHaveLength(0)
  })

  it('چند فیلد را هم‌زمان می‌پذیرد', () => {
    const { fields, changes } = parseOrderUpdate(
      { status: 'delivered', trackingCode: '99887766', note: 'تحویل شد' },
      existing,
    )
    expect(fields).toEqual({})
    expect(changes).toMatchObject({
      status: 'delivered',
      trackingCode: '99887766',
      note: 'تحویل شد',
    })
  })
})
