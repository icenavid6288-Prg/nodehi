/**
 * اعتبارسنجی ورودی‌های API.
 * همه توابع ورودی را به شکل رشته می‌پذیرند (چون ورودی JSON/فرم همیشه
 * قابل دستکاری است) و مقادیر پاک‌شده برمی‌گردانند.
 */

import { toLatinDigits } from '@/lib/utils/format'

/** طول متن پس از trim و پاک‌سازی فاصله‌های اضافه */
export function cleanText(value: unknown, maxLength = 2000): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

/**
 * تبدیل ورودی به عدد صحیح مثبت؛ در صورت نامعتبر بودن null.
 * توجه: علامت منفی صریحاً رد می‌شود. اگر فقط نویسه‌های غیررقمی را حذف
 * کنیم، «-۴» به ۴ تبدیل می‌شود و تعداد منفی به سفارش معتبر بدل می‌گردد.
 */
export function toPositiveInt(value: unknown): number | null {
  const raw = toLatinDigits(String(value ?? '')).trim()
  if (raw.startsWith('-') || raw.startsWith('\u2212')) return null
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null
  const parsed = Number.parseInt(digits, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/**
 * تبدیل ورودی به عدد صحیح **نامنفی**؛ در صورت نامعتبر بودن null.
 *
 * چرا جدا از `toPositiveInt`؟ در کاتالوگ صفر یک مقدار معنادار است: قیمت ۰
 * یعنی «تماس بگیرید» و موجودی ۰ یعنی «ناموجود». با `toPositiveInt` هر دو
 * به null تبدیل می‌شدند و صفر نمی‌شد ذخیره کرد.
 */
export function toNonNegativeInt(value: unknown): number | null {
  const raw = toLatinDigits(String(value ?? '')).trim()
  if (raw.startsWith('-') || raw.startsWith('\u2212')) return null
  if (raw === '') return null
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return null
  const parsed = Number.parseInt(digits, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/** شماره همراه ایران: ۱۱ رقم و با ۰۹ آغاز شود */
export function isIranianMobile(value: unknown): boolean {
  const raw = toLatinDigits(String(value ?? '')).replace(/[^\d]/g, '')
  // پسوند بین‌المللی +۹۸ را نیز می‌پذیریم
  const normalized = raw.startsWith('98') && raw.length === 12 ? `0${raw.slice(2)}` : raw
  return /^09\d{9}$/.test(normalized)
}

/** یکسان‌سازی شماره همراه به قالب ۰۹xxxxxxxxx */
export function normalizeIranianMobile(value: unknown): string {
  const raw = toLatinDigits(String(value ?? '')).replace(/[^\d]/g, '')
  return raw.startsWith('98') && raw.length === 12 ? `0${raw.slice(2)}` : raw
}

/** اعتبارسنجی ساده ایمیل با محدودیت طول RFC */
export function isEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)
}

/** کد پستی ایران: ۱۰ رقم */
export function isIranianPostalCode(value: unknown): boolean {
  const raw = toLatinDigits(String(value ?? '')).replace(/[^\d]/g, '')
  return /^\d{10}$/.test(raw)
}

/**
 * جلوگیری از حمله «آلودگی نمونه اولیه» (prototype pollution) در payload.
 * هر کلید خطرناکی که از ورودی کاربر می‌آید رد می‌شود.
 */
export function isSafeKey(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
}

/** خواندن ایمن یک شیء JSON از بدنه درخواست؛ در صورت خطا null */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const entries = Object.entries(parsed as Record<string, unknown>)
    if (entries.some(([key]) => !isSafeKey(key))) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}
