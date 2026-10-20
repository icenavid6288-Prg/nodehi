/**
 * ارسال پیامک با پیکربندی خوانده‌شده از تنظیمات.
 *
 * ── چرا این ماژول جدا از `auth/sms.ts` است؟ ──
 * ارسال پیامک فقط برای کد ورود نیست: اطلاع‌رسانی سفارش و پیام آزمایشی هم
 * وجود دارد. منطق مشترک (خواندن پیکربندی، ارسال، ثبت لاگ) اینجاست و لایه
 * احراز هویت فقط آن را صدا می‌زند.
 *
 * ── چرا هر ارسال ثبت می‌شود؟ ──
 * پیش‌تر ارسال «آتش و فراموش» بود؛ اگر سرویس پیامک خطا می‌داد، هیچ ردپایی
 * نمی‌ماند و پاسخ به «آیا کد برای مشتری رفت؟» ناممکن بود. حالا هر ارسال با
 * وضعیت و خطا در جدول `SmsMessage` می‌نشیند.
 *
 * ⚠️ نکته امنیتی: کد یک‌بارمصرف هرگز در لاگ ذخیره نمی‌شود. فقط قالب و وضعیت
 * ثبت می‌گردد تا خودِ کد در دیتابیس (و نسخه پشتیبان) باقی نماند.
 */

import { prisma } from '@/lib/db'
import { readSettings } from '@/lib/server/settings'

export type SmsPurpose = 'otp' | 'notification' | 'test'

export interface SendSmsInput {
  phone: string
  purpose: SmsPurpose
  /** نام قالب در پنل سرویس‌دهنده (ارسال قالب‌محور) */
  template?: string | null
  /** متن آزاد؛ برای ارسال متنی استفاده می‌شود */
  body?: string | null
  /** مقدار جایگزین `token` در قالب — برای کد ورود */
  token?: string | null
  userId?: string | null
}

export interface SendSmsResult {
  delivered: boolean
  channel: 'kavenegar' | 'log'
  provider: string
  error?: string
}

/**
 * آیا پیکربندی پیامک کامل است؟
 * بدون کلید API یا با ارسال غیرفعال، سیستم در حالت «لاگ» کار می‌کند تا توسعه
 * و ورود بدون سرویس پیامک ممکن بماند.
 */
export async function isSmsConfigured(): Promise<boolean> {
  const settings = await readSettings()
  return settings['sms.enabled'] === 'true' && Boolean(settings['sms.apiKey'])
}

/** ارسال پیامک و ثبت نتیجه در لاگ */
export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const settings = await readSettings()
  const provider = settings['sms.provider'] || 'kavenegar'
  const apiKey = settings['sms.apiKey']
  const sender = settings['sms.sender']
  const enabled = settings['sms.enabled'] === 'true'

  const template = input.template?.trim() || null
  const body = input.body?.trim() || null

  // ── حالت بدون سرویس: چاپ در لاگ سرور و ثبت ردیف با کانال log ──
  if (!enabled || !apiKey) {
    // ⚠️ کد ورود فقط در لاگ سرور چاپ می‌شود، نه در دیتابیس
    console.info(
      `[sms:dev] purpose=${input.purpose} phone=${input.phone}` +
        (input.token ? ` token=${input.token}` : '') +
        (body ? ` body=${body}` : ''),
    )
    await logSms({
      phone: input.phone,
      purpose: input.purpose,
      template,
      // کد ورود در متن پیام لاگ ذخیره نمی‌شود
      body: input.purpose === 'otp' ? null : body,
      status: 'sent',
      channel: 'log',
      provider,
      userId: input.userId ?? null,
    })
    return { delivered: false, channel: 'log', provider }
  }

  // ── ارسال واقعی ──
  try {
    const url = template
      ? buildTemplateUrl(apiKey, input.phone, template, input.token ?? body ?? '')
      : buildTextUrl(apiKey, input.phone, body ?? '')

    if (!url) {
      const error = 'متن پیام خالی است.'
      await logSms({
        phone: input.phone,
        purpose: input.purpose,
        template,
        body,
        status: 'failed',
        channel: 'kavenegar',
        provider,
        error,
        userId: input.userId ?? null,
      })
      return { delivered: false, channel: 'kavenegar', provider, error }
    }

    if (!template && sender) url.searchParams.set('sender', sender)

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })

    // کاوه‌نگار همیشه ۲۰۰ برمی‌گرداند و خطا را داخل بدنه می‌گذارد؛ برای همین
    // فقط به کد وضعیت اعتماد نمی‌کنیم.
    let apiError: string | undefined
    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { return?: { status?: number; message?: string } }
        | null
      const apiStatus = payload?.return?.status
      if (typeof apiStatus === 'number' && apiStatus !== 200) {
        apiError = payload?.return?.message ?? `خطای سرویس پیامک (${apiStatus})`
      }
    } else {
      apiError = `پاسخ سرویس پیامک: ${response.status}`
    }

    await logSms({
      phone: input.phone,
      purpose: input.purpose,
      template,
      body: input.purpose === 'otp' ? null : body,
      status: apiError ? 'failed' : 'sent',
      channel: 'kavenegar',
      provider,
      error: apiError ?? null,
      userId: input.userId ?? null,
    })

    return apiError
      ? { delivered: false, channel: 'kavenegar', provider, error: apiError }
      : { delivered: true, channel: 'kavenegar', provider }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'خطای نامشخص در ارسال پیامک'
    await logSms({
      phone: input.phone,
      purpose: input.purpose,
      template,
      body: input.purpose === 'otp' ? null : body,
      status: 'failed',
      channel: 'kavenegar',
      provider,
      error: message,
      userId: input.userId ?? null,
    })
    return { delivered: false, channel: 'kavenegar', provider, error: message }
  }
}

/** آدرس ارسال قالب‌محور — روش توصیه‌شده کاوه‌نگار برای کد ورود */
function buildTemplateUrl(
  apiKey: string,
  phone: string,
  template: string,
  token: string,
): URL {
  const url = new URL(`https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/verify/lookup.json`)
  url.searchParams.set('receptor', phone)
  url.searchParams.set('token', token)
  url.searchParams.set('template', template)
  return url
}

/** آدرس ارسال متن آزاد — برای پیام‌های اطلاع‌رسانی */
function buildTextUrl(apiKey: string, phone: string, message: string): URL | null {
  if (!message.trim()) return null
  const url = new URL(`https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/sms/send.json`)
  url.searchParams.set('receptor', phone)
  url.searchParams.set('message', message)
  return url
}

/** ثبت یک ردیف لاگ پیامک */
async function logSms(entry: {
  phone: string
  purpose: SmsPurpose
  template: string | null
  body: string | null
  status: 'sent' | 'failed'
  channel: 'kavenegar' | 'log'
  provider: string
  error?: string | null
  userId: string | null
}): Promise<void> {
  try {
    await prisma.smsMessage.create({
      data: {
        phone: entry.phone,
        purpose: entry.purpose,
        template: entry.template,
        body: entry.body,
        status: entry.status,
        channel: entry.channel,
        provider: entry.provider,
        error: entry.error ?? null,
        userId: entry.userId,
      },
    })
  } catch {
    // شکست در لاگ نباید ارسال پیامک (و در نتیجه ورود کاربر) را متوقف کند
  }
}

export const SMS_PURPOSE_LABELS: Record<string, string> = {
  otp: 'کد ورود',
  notification: 'اطلاع‌رسانی',
  test: 'آزمایشی',
}
