import { describe, expect, it } from 'vitest'
import { AUTOMATION_EVENT_LABELS, AUTOMATION_STATUS_LABELS, EVENT_TOGGLE_KEYS, isEventEnabled } from './automation'
import { SETTING_DEFS } from './settings'

/**
 * اتوماسیون باید هرگز مسیر اصلی (ثبت سفارش) را متوقف نکند و در عین حال
 * هیچ رویدادی بی‌دلیل برای n8n نفرستد. قاعده انتخاب رویداد اینجا آزمون می‌شود.
 */

describe('isEventEnabled', () => {
  it('رویدادی که کلید تنظیم ندارد پیش‌فرض روشن است', () => {
    expect(isEventEnabled('order.created', {})).toBe(true)
    // رویداد ناشناخته نباید بی‌صدا خفه شود
    expect(isEventEnabled('some.future_event', { 'automation.events.orderCreated': 'false' })).toBe(true)
  })

  it('مقدار false رویداد را خاموش می‌کند', () => {
    expect(isEventEnabled('order.created', { 'automation.events.orderCreated': 'false' })).toBe(false)
  })

  it('مقدار true یا خالی بودن کلید، رویداد را روشن نگه می‌دارد', () => {
    expect(isEventEnabled('order.created', { 'automation.events.orderCreated': 'true' })).toBe(true)
    expect(isEventEnabled('order.created', { 'automation.events.orderCreated': null })).toBe(true)
  })

  it('هر رویداد فقط به کلید خودش واکنش می‌دهد', () => {
    const settings = { 'automation.events.review': 'false' }
    expect(isEventEnabled('review.submitted', settings)).toBe(false)
    expect(isEventEnabled('order.created', settings)).toBe(true)
  })
})

describe('نگاشت رویدادها', () => {
  it('هر رویداد کلید روشن/خاموش تعریف‌شده در فهرست تنظیمات دارد', () => {
    const defined = new Set(SETTING_DEFS.map((item) => item.key))
    for (const [event, key] of Object.entries(EVENT_TOGGLE_KEYS)) {
      expect({ event, defined: defined.has(key) }).toEqual({ event, defined: true })
    }
  })

  it('هر رویداد برچسب فارسی برای نمایش در پنل دارد', () => {
    for (const event of Object.keys(EVENT_TOGGLE_KEYS)) {
      expect(AUTOMATION_EVENT_LABELS[event]).toBeTruthy()
    }
  })

  it('هر وضعیت ذخیره‌شده برچسب فارسی دارد', () => {
    for (const status of ['sent', 'failed', 'skipped']) {
      expect(AUTOMATION_STATUS_LABELS[status]).toBeTruthy()
    }
  })
})
