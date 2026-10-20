import { describe, expect, it } from 'vitest'
import { parseUserUpdate } from './admin-users'

/**
 * این مسیر می‌تواند سامانه را قفل کند (هیچ مدیر کلِ فعالی نماند) یا دسترسی
 * کسی را بی‌سروصدا بالا ببرد؛ پس هر قاعده اینجا آزمون دارد.
 */
const existing = {
  id: 'user-1',
  phone: '09121234567',
  role: 'customer',
  isActive: true,
  loyaltyPoints: 0,
}

const context = { actorId: 'admin-1', activeAdminCount: 3 }

describe('parseUserUpdate — نقش', () => {
  it('ارتقا به اپراتور را می‌پذیرد و حسابرسی می‌کند', () => {
    const { fields, data, audit } = parseUserUpdate({ role: 'operator' }, existing, context)
    expect(fields).toEqual({})
    expect(data.role).toBe('operator')
    expect(audit).toEqual([
      {
        action: 'user.role_changed',
        metadata: { phone: '09121234567', from: 'customer', to: 'operator' },
      },
    ])
  })

  it('نقش ناشناخته را رد می‌کند', () => {
    const { fields, data } = parseUserUpdate({ role: 'superuser' }, existing, context)
    expect(fields.role).toBeTruthy()
    expect(data.role).toBeUndefined()
  })

  it('نقش غیرمتنی را رد می‌کند', () => {
    expect(parseUserUpdate({ role: 42 }, existing, context).fields.role).toBeTruthy()
  })

  it('نقش یکسان را «تغییر» حساب نمی‌کند', () => {
    const { data, audit } = parseUserUpdate({ role: 'customer' }, existing, context)
    expect(data.role).toBeUndefined()
    expect(audit).toHaveLength(0)
  })

  it('تغییر نقش حساب خودِ مدیر را رد می‌کند', () => {
    const self = { ...existing, id: 'admin-1', role: 'admin' }
    const { fields, data } = parseUserUpdate({ role: 'operator' }, self, context)
    expect(fields.role).toContain('خودتان')
    expect(data.role).toBeUndefined()
  })
})

describe('parseUserUpdate — وضعیت حساب', () => {
  it('غیرفعال‌کردن کاربر عادی را می‌پذیرد', () => {
    const { data, audit } = parseUserUpdate({ isActive: false }, existing, context)
    expect(data.isActive).toBe(false)
    expect(audit[0]?.action).toBe('user.status_changed')
  })

  it('مقدار غیرمنطقی را رد می‌کند', () => {
    expect(parseUserUpdate({ isActive: 'no' }, existing, context).fields.isActive).toBeTruthy()
  })

  it('غیرفعال‌کردن حساب خود را رد می‌کند', () => {
    const self = { ...existing, id: 'admin-1', role: 'admin' }
    expect(parseUserUpdate({ isActive: false }, self, context).fields.isActive).toContain('خودتان')
  })
})

describe('parseUserUpdate — محافظت از آخرین مدیر کل', () => {
  const soleAdmin = { ...existing, id: 'admin-2', role: 'admin', isActive: true }
  const soleContext = { actorId: 'admin-1', activeAdminCount: 1 }

  it('تنزل آخرین مدیر کل فعال را رد می‌کند', () => {
    const { fields, data } = parseUserUpdate({ role: 'operator' }, soleAdmin, soleContext)
    expect(fields.role).toContain('تنها مدیر کل')
    expect(data.role).toBeUndefined()
  })

  it('غیرفعال‌کردن آخرین مدیر کل فعال را رد می‌کند', () => {
    const { fields, data } = parseUserUpdate({ isActive: false }, soleAdmin, soleContext)
    expect(fields.isActive).toContain('تنها مدیر کل')
    expect(data.isActive).toBeUndefined()
  })

  it('حالت ترکیبی (تنزل + غیرفعال در یک درخواست) را هم می‌گیرد', () => {
    const { fields, data } = parseUserUpdate(
      { role: 'customer', isActive: false },
      soleAdmin,
      soleContext,
    )
    expect(fields.role).toContain('تنها مدیر کل')
    expect(Object.keys(data)).toHaveLength(0)
  })

  it('وقتی مدیر کل دیگری هم هست، تنزل مجاز است', () => {
    const { fields, data } = parseUserUpdate({ role: 'operator' }, soleAdmin, {
      actorId: 'admin-1',
      activeAdminCount: 2,
    })
    expect(fields).toEqual({})
    expect(data.role).toBe('operator')
  })

  it('تنزل مدیریت که از قبل غیرفعال است، محدودیتی ندارد', () => {
    const inactiveAdmin = { ...soleAdmin, isActive: false }
    const { fields, data } = parseUserUpdate({ role: 'customer' }, inactiveAdmin, soleContext)
    expect(fields).toEqual({})
    expect(data.role).toBe('customer')
  })

  it('غیرفعال‌کردن مدیر غیرفعال را رد نمی‌کند (تغییری هم لازم نیست)', () => {
    const inactiveAdmin = { ...soleAdmin, isActive: false }
    const { fields, audit } = parseUserUpdate({ isActive: false }, inactiveAdmin, soleContext)
    expect(fields).toEqual({})
    expect(audit).toHaveLength(0)
  })

  it('ارتقای کاربر عادی به مدیر کل محدودیتی ندارد', () => {
    const { fields, data } = parseUserUpdate({ role: 'admin' }, existing, soleContext)
    expect(fields).toEqual({})
    expect(data.role).toBe('admin')
  })
})

describe('parseUserUpdate — امتیاز باشگاه', () => {
  it('امتیاز معتبر را با سطح محاسبه‌شده ذخیره می‌کند', () => {
    const { data, audit } = parseUserUpdate({ loyaltyPoints: 1200 }, existing, context)
    expect(data.loyaltyPoints).toBe(1200)
    expect(data.loyaltyTier).toBe('نقره‌ای')
    expect(audit[0]?.action).toBe('user.loyalty_changed')
  })

  it('ارقام فارسی را می‌پذیرد', () => {
    expect(parseUserUpdate({ loyaltyPoints: '۲۵۰۰' }, existing, context).data.loyaltyTier).toBe('طلایی')
  })

  it('صفر را معتبر می‌داند', () => {
    const withPoints = { ...existing, loyaltyPoints: 500 }
    const { data } = parseUserUpdate({ loyaltyPoints: 0 }, withPoints, context)
    expect(data.loyaltyPoints).toBe(0)
    expect(data.loyaltyTier).toBe('برنزی')
  })

  it('امتیاز منفی را رد می‌کند', () => {
    expect(parseUserUpdate({ loyaltyPoints: '-10' }, existing, context).fields.loyaltyPoints).toBeTruthy()
  })

  it('امتیاز غیرعددی را رد می‌کند', () => {
    expect(parseUserUpdate({ loyaltyPoints: 'زیاد' }, existing, context).fields.loyaltyPoints).toBeTruthy()
  })

  it('امتیاز بیش از سقف را رد می‌کند', () => {
    expect(
      parseUserUpdate({ loyaltyPoints: 99_999_999 }, existing, context).fields.loyaltyPoints,
    ).toBeTruthy()
  })

  it('امتیاز یکسان را «تغییر» حساب نمی‌کند', () => {
    const withPoints = { ...existing, loyaltyPoints: 1200 }
    const { audit, data } = parseUserUpdate({ loyaltyPoints: 1200 }, withPoints, context)
    expect(audit).toHaveLength(0)
    expect(data.loyaltyPoints).toBeUndefined()
  })
})

describe('parseUserUpdate — کلیات', () => {
  it('درخواست بدون فیلد شناخته‌شده را «بی‌اثر» علامت می‌زند', () => {
    const parsed = parseUserUpdate({ nonsense: 1 }, existing, context)
    expect(parsed.requested).toBe(false)
    expect(parsed.audit).toHaveLength(0)
  })

  it('چند تغییر را با هم می‌پذیرد و برای هرکدام رکورد جدا می‌سازد', () => {
    const { fields, data, audit } = parseUserUpdate(
      { role: 'accountant', isActive: false, loyaltyPoints: 3000 },
      existing,
      context,
    )
    expect(fields).toEqual({})
    expect(data).toMatchObject({ role: 'accountant', isActive: false, loyaltyPoints: 3000 })
    expect(audit.map((entry) => entry.action)).toEqual([
      'user.role_changed',
      'user.status_changed',
      'user.loyalty_changed',
    ])
  })

  it('در صورت وجود خطا، هیچ تغییری ساخته نمی‌شود', () => {
    const { fields, data, audit } = parseUserUpdate(
      { role: 'hacker', loyaltyPoints: 100 },
      existing,
      context,
    )
    expect(Object.keys(fields)).toHaveLength(1)
    expect(Object.keys(data)).toHaveLength(0)
    expect(audit).toHaveLength(0)
  })
})
