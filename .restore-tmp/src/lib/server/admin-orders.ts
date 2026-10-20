/**
 * تفسیر تغییرهای سفارش از پنل مدیریت.
 *
 * چرا جدا از route؟ این تابع «آخرین سد» پیش از نوشتن روی فاکتور است. اگر
 * اینجا باگی بماند، داده نادرست مستقیماً روی سفارش مشتری می‌نشیند. جدا بودن
 * آن را مستقل از دیتابیس و Next قابل آزمون می‌کند.
 */

import { SHIPPING_METHODS, resolveShippingMethod } from '@/lib/commerce'
import { cleanText } from '@/lib/server/validation'
import { toLatinDigits } from '@/lib/utils/format'

/** وضعیت‌های مجاز سفارش */
export const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']

/** برچسب‌های مجاز روش ارسال — همان مقادیری که هنگام ثبت سفارش ذخیره می‌شوند */
export const SHIPPING_LABELS = SHIPPING_METHODS.map((method) => method.label)

/** تنها فیلدهایی که واقعاً تغییر کرده‌اند */
export interface OrderUpdateChanges {
  status?: string
  trackingCode?: string | null
  note?: string | null
  shippingMethod?: string
}

export interface ExistingOrderValues {
  status: string
  trackingCode: string | null
  note: string | null
  shippingMethod: string
}

export interface ParsedOrderUpdate {
  /** خطاهای فیلد‌به‌فیلد برای فرم */
  fields: Record<string, string>
  /** تغییرهای واقعی — همان‌هایی که باید ذخیره و حسابرسی شوند */
  changes: OrderUpdateChanges
  /** آیا اصلاً فیلدی برای تغییر فرستاده شده است؟ */
  requested: boolean
}

/**
 * تفسیر بدنه PATCH سفارش.
 *
 * نامعتبر را رد می‌کند و «مقدار خالی» را به معنای «پاک کردن» می‌گیرد، نه
 * نادیده‌گرفتن: برای کد رهگیری و یادداشت، خالی‌گذاشتن یک قصد صریح است.
 */
export function parseOrderUpdate(
  input: Record<string, unknown>,
  existing: ExistingOrderValues,
): ParsedOrderUpdate {
  const fields: Record<string, string> = {}
  const changes: OrderUpdateChanges = {}

  if (input.status !== undefined) {
    const status = cleanText(input.status, 20)
    if (!ORDER_STATUSES.includes(status)) {
      fields.status = 'وضعیت نامعتبر است.'
    } else if (status !== existing.status) {
      changes.status = status
    }
  }

  if (input.trackingCode !== undefined) {
    // ارقام فارسی به لاتین تبدیل می‌شوند؛ کاربر ممکن است کد را با کیبورد فارسی بزند
    const raw = toLatinDigits(cleanText(input.trackingCode, 40)).replace(/\s+/g, '')
    if (raw === '') {
      if (existing.trackingCode !== null) changes.trackingCode = null
    } else if (!/^[A-Za-z0-9-]{4,40}$/.test(raw)) {
      fields.trackingCode = 'کد رهگیری باید ۴ تا ۴۰ نویسه لاتین، رقم یا خط تیره باشد.'
    } else if (raw !== existing.trackingCode) {
      changes.trackingCode = raw
    }
  }

  if (input.note !== undefined) {
    const raw = cleanText(input.note, 500)
    const note = raw === '' ? null : raw
    if (note !== existing.note) changes.note = note
  }

  if (input.shippingMethod !== undefined) {
    // برچسب کامل پذیرفته می‌شود؛ در غیر این صورت شناسه (express/tipax/freight)
    // به برچسب نگاشت می‌شود تا فراخوانی برنامه‌ای هم ساده بماند.
    const raw = cleanText(input.shippingMethod, 100)
    const shippingMethod = SHIPPING_LABELS.includes(raw) ? raw : resolveShippingMethod(raw).label
    if (shippingMethod !== existing.shippingMethod) changes.shippingMethod = shippingMethod
  }

  return {
    fields,
    changes,
    requested:
      input.status !== undefined ||
      input.trackingCode !== undefined ||
      input.note !== undefined ||
      input.shippingMethod !== undefined,
  }
}
