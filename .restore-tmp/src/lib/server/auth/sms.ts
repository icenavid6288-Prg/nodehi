/**
 * ارسال کد ورود با پیامک.
 *
 * این فایل فقط «حالت توسعه» و شکل‌دهی درخواست کد را مدیریت می‌کند؛ ارسال
 * واقعی و ثبت لاگ در `lib/server/sms.ts` انجام می‌شود تا منطق مشترک پیامک
 * (کد ورود، اطلاع‌رسانی سفارش، پیام آزمایشی) یک‌جا بماند.
 *
 * ⚠️ اگر `AUTH_OTP_DEV_MODE` در تولید روشن بماند، کد ورود هر کاربر در پاسخ
 * شبکه افشا می‌شود. برای همین `isOtpDevMode` وقتی NODE_ENV=production باشد
 * همیشه false برمی‌گرداند.
 */

import { readSettings } from '@/lib/server/settings'
import { sendSms, type SendSmsResult } from '@/lib/server/sms'

export type SmsResult = SendSmsResult

/**
 * آیا افشای کد در پاسخ API مجاز است؟
 * در تولید همیشه false است، حتی اگر متغیر محیطی اشتباهاً ۱ بماند.
 */
export function isOtpDevMode(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.AUTH_OTP_DEV_MODE === '1'
}

/**
 * ارسال کد ورود.
 * اگر سرویس پیامک پیکربندی نشده باشد، کد فقط در لاگ سرور چاپ می‌شود تا
 * توسعه‌دهنده بتواند وارد شود؛ خروجی `delivered: false` همین را نشان می‌دهد.
 */
export async function sendOtpSms(phone: string, code: string): Promise<SmsResult> {
  const settings = await readSettings()
  return sendSms({
    phone,
    purpose: 'otp',
    template: settings['sms.otpTemplate'],
    token: code,
    body: `کد ورود شما به نودهی: ${code}`,
  })
}
