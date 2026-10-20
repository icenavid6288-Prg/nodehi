/**
 * ارسال رویداد به اتوماسیون (n8n / Make) با ثبت در جدول رویدادها.
 *
 * ── مشکل قبلی ──
 * ارسال «آتش و فراموش» بود: اگر n8n خاموش بود یا آدرس اشتباه تنظیم شده بود،
 * رویداد بی‌صدا از دست می‌رفت و هیچ ردپایی نمی‌ماند. عیب‌یابی ناممکن بود.
 *
 * ── راه‌حل ──
 * هر تلاش ارسال (موفق، ناموفق یا ردشده) در `AutomationEvent` ثبت می‌شود.
 * بدنه ارسالی عیناً ذخیره می‌گردد تا «ارسال دوباره» همان بدنه و همان امضا را
 * بفرستد؛ در نتیجه شناسه رویداد یکسان می‌ماند و سمت n8n پردازش تکراری رخ
 * نمی‌دهد (idempotency).
 *
 * امنیت: بدون کلید امضای HMAC هیچ ارسالی انجام نمی‌شود. وبهوک بدون امضا یعنی
 * هر کسی می‌تواند رویداد جعلی بفرستد.
 */

import { prisma } from '@/lib/db'
import { readSettings } from '@/lib/server/settings'
import { SIGNATURE_HEADER, signPayload } from '@/lib/server/webhook'

export interface AutomationEventInput {
  event: string
  occurredAt: string
  data: Record<string, unknown>
}

export type DispatchStatus = 'sent' | 'failed' | 'skipped'

export interface DispatchResult {
  status: DispatchStatus
  responseStatus?: number
  error?: string
}

/** نگاشت نام رویداد به کلید تنظیم روشن/خاموش — خروجی برای آزمون‌پذیری */
export const EVENT_TOGGLE_KEYS: Record<string, string> = {
  'order.created': 'automation.events.orderCreated',
  'order.status_changed': 'automation.events.orderStatus',
  'order.paid': 'automation.events.orderPaid',
  'payment.initiated': 'automation.events.paymentInitiated',
  'payment.failed': 'automation.events.paymentFailed',
  'stock_alert.created': 'automation.events.stockAlert',
  'contact.submitted': 'automation.events.contact',
  'review.submitted': 'automation.events.review',
}

/** آیا این رویداد بر پایه تنظیمات باید ارسال شود؟ رویداد ناشناخته پیش‌فرض روشن است. */
export function isEventEnabled(event: string, settings: Record<string, string | null>): boolean {
  const key = EVENT_TOGGLE_KEYS[event]
  if (!key) return true
  return settings[key] !== 'false'
}

/** شناسه یکتا برای هر رویداد — جلوگیری از پردازش تکراری در n8n */
function makeEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * ارسال رویداد به اتوماسیون.
 * هرگز خطا پرتاب نمی‌کند: خرابی n8n نباید ثبت سفارش را متوقف کند.
 */
export async function dispatchAutomationEvent(input: AutomationEventInput): Promise<DispatchResult> {
  const settings = await readSettings()

  const enabled = settings['automation.enabled'] === 'true'
  const url = settings['automation.webhookUrl']
  const secret = settings['automation.webhookSecret']
  const timeoutMs = Number.parseInt(settings['automation.timeoutMs'] ?? '4000', 10) || 4000

  const body = JSON.stringify({ id: makeEventId(), ...input })

  // دلیل رد شدن ثبت می‌شود؛ «چرا رویدادی به n8n نرسید؟» باید پاسخ داشته باشد
  const skipReason = !enabled
    ? 'اتوماسیون غیرفعال است.'
    : !url
      ? 'آدرس وبهوک تنظیم نشده است.'
      : !secret
        ? 'کلید امضای HMAC تنظیم نشده است.'
        : !isEventEnabled(input.event, settings)
          ? 'این رویداد در تنظیمات خاموش است.'
          : null

  if (skipReason) {
    await logEvent({ event: input.event, payload: body, status: 'skipped', lastError: skipReason })
    return { status: 'skipped', error: skipReason }
  }

  const result = await deliver(body, url as string, secret as string, timeoutMs, 1)

  await logEvent({
    event: input.event,
    payload: body,
    status: result.status,
    responseStatus: result.responseStatus ?? null,
    lastError: result.error ?? null,
    attempts: 1,
  })

  return result
}

/** ارسال دوباره یک رویداد ثبت‌شده با همان بدنه و همان امضا */
export async function retryAutomationEvent(id: string): Promise<DispatchResult | null> {
  const row = await prisma.automationEvent.findUnique({ where: { id } })
  if (!row) return null

  const settings = await readSettings()
  const url = settings['automation.webhookUrl']
  const secret = settings['automation.webhookSecret']
  const timeoutMs = Number.parseInt(settings['automation.timeoutMs'] ?? '4000', 10) || 4000

  if (settings['automation.enabled'] !== 'true' || !url || !secret) {
    const error = 'برای ارسال دوباره، ابتدا اتوماسیون و آدرس و کلید امضا را تنظیم کنید.'
    await prisma.automationEvent.update({
      where: { id },
      data: { lastError: error },
    })
    return { status: 'skipped', error }
  }

  const result = await deliver(row.payload, url, secret, timeoutMs, row.attempts + 1)

  await prisma.automationEvent.update({
    where: { id },
    data: {
      status: result.status,
      attempts: { increment: 1 },
      responseStatus: result.responseStatus ?? null,
      lastError: result.error ?? null,
      sentAt: result.status === 'sent' ? new Date() : row.sentAt,
    },
  })

  return result
}

/** ارسال واقعی HTTP — تنها جای انجام درخواست، مشترک بین ارسال اول و دوباره */
async function deliver(
  body: string,
  url: string,
  secret: string,
  timeoutMs: number,
  attempts: number,
): Promise<DispatchResult> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [SIGNATURE_HEADER]: signPayload(body, secret),
      },
      body,
      // رویداد نباید درخواست کاربر را معطل کند
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (response.ok) {
      return { status: 'sent', responseStatus: response.status }
    }
    return {
      status: 'failed',
      responseStatus: response.status,
      error: `پاسخ وبهوک: ${response.status}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطای نامشخص در ارسال رویداد'
    return { status: 'failed', error: `تلاش ${attempts}: ${message}` }
  }
}

/** ثبت یک تلاش ارسال */
async function logEvent(entry: {
  event: string
  payload: string
  status: DispatchStatus
  responseStatus?: number | null
  lastError?: string | null
  attempts?: number
}): Promise<void> {
  try {
    await prisma.automationEvent.create({
      data: {
        event: entry.event,
        payload: entry.payload,
        status: entry.status,
        responseStatus: entry.responseStatus ?? null,
        lastError: entry.lastError ?? null,
        attempts: entry.attempts ?? 1,
        sentAt: entry.status === 'sent' ? new Date() : null,
      },
    })
  } catch {
    // شکست در ثبت لاگ نباید مسیر اصلی (ثبت سفارش) را متوقف کند
  }
}

export const AUTOMATION_STATUS_LABELS: Record<string, string> = {
  sent: 'ارسال‌شده',
  failed: 'ناموفق',
  skipped: 'ارسال‌نشده',
}

export const AUTOMATION_EVENT_LABELS: Record<string, string> = {
  'order.created': 'ثبت سفارش',
  'order.status_changed': 'تغییر وضعیت سفارش',
  'order.paid': 'پرداخت موفق سفارش',
  'payment.initiated': 'شروع پرداخت آنلاین',
  'payment.failed': 'پرداخت ناموفق',
  'stock_alert.created': 'درخواست هشدار موجودی',
  'contact.submitted': 'پیام تماس با ما',
  'review.submitted': 'نظر تازه کاربر',
}
