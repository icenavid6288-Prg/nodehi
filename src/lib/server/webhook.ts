/**
 * امضای HMAC و ارسال رویداد به اتوماسیون (n8n / Make).
 *
 * چرا امضا؟ Webhook یک نقطه ورود عمومی است. بدون امضا هر کسی می‌تواند
 * رویداد جعلی «پرداخت موفق» بفرستد. با HMAC-SHA256 و مقایسه زمان‌ثابت،
 * فقط فرستنده‌ای که کلید مشترک را می‌داند می‌تواند رویداد معتبر بسازد.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

/** نام هدری که امضا در آن قرار می‌گیرد */
export const SIGNATURE_HEADER = 'x-nodehi-signature'

/** ساخت امضای HMAC-SHA256 برای بدنه خام درخواست */
export function signPayload(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
}

/**
 * بررسی امضا با مقایسه زمان‌ثابت.
 * طول‌های نابرابر باید سریع رد شوند (timingSafeEqual روی طول نابرابر خطا می‌دهد).
 */
export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = signPayload(rawBody, secret)
  const providedBuffer = Buffer.from(signature.trim(), 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  if (providedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

/*
 * ارسال رویداد به اتوماسیون عمداً اینجا نیست.
 *
 * نسخه‌ای که اینجا بود «آتش و فراموش» بود: اگر n8n خاموش بود، رویداد بی‌صدا
 * از دست می‌رفت و هیچ ردپایی نمی‌ماند. ارسال و لاگ حالا در
 * `lib/server/automation.ts` انجام می‌شود؛ این فایل فقط امضا را می‌شناسد تا
 * هم مسیر ورودی (`/api/webhooks/order-paid`) و هم مسیر خروجی از یک پیاده‌سازی
 * امضا استفاده کنند.
 */
