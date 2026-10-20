/**
 * تنظیمات سامانه به شکل کلید/مقدار.
 *
 * ── چرا کلیدها در کد تعریف می‌شوند، نه در دیتابیس؟ ──
 * اگر هر کلکی که در جدول هست اعمال می‌شد، یک ردیف اشتباه یا دستکاری‌شده
 * می‌توانست رفتار سایت را عوض کند. با `SETTING_DEFS` به‌عنوان فهرست بسته،
 * جدول فقط مقدار نگه می‌دارد و کلید ناشناخته هیچ اثری ندارد.
 *
 * ── ترتیب خواندن مقدار ──
 *   ۱) مقدار دیتابیس (تنظیم‌شده از پنل مدیریت)
 *   ۵) متغیر محیطی (`env` در تعریف کلید)
 *   ۳) مقدار پیش‌فرض (`default`)
 * این ترتیب باعث می‌شود سایت همچنان «بدون هیچ کلید API» بالا بیاید — قرارداد
 * `README` — و در عین حال از پنل هم قابل تنظیم باشد.
 *
 * ── رمزنگاری ──
 * مقدارهای `secret` با AES-256-GCM رمزنگاری می‌شوند اگر متغیر
 * `SETTINGS_ENCRYPTION_KEY` تنظیم شده باشد. بدون آن، مقدار به شکل متن ساده
 * ذخیره می‌شود و پنل هشدار می‌دهد؛ عمداً «کلید پیش‌فرض جادویی» نداریم، چون
 * امنیت ظاهری بدتر از نبودش است.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { Setting } from '@prisma/client'
import { isDbNotReadyError, prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/server/orders'
import { toLatinDigits } from '@/lib/utils/format'

// ─────────────────────────────────────────────────────────────
//  گروه‌ها و انواع
// ─────────────────────────────────────────────────────────────
export type SettingGroup =
  | 'general'
  | 'pages'
  | 'sms'
  | 'automation'
  | 'snappay'
  | 'digikala'
  | 'torob'

export const SETTING_GROUP_LABELS: Record<SettingGroup, string> = {
  general: 'تنظیمات عمومی',
  pages: 'تنظیمات صفحات و اعلان‌ها',
  sms: 'سرویس پیامک',
  automation: 'اتوماسیون',
  snappay: 'یکپارچه‌سازی اسنپ‌پی',
  digikala: 'یکپارچه‌سازی دیجی‌کالا',
  torob: 'یکپارچه‌سازی ترب',
}

export const SETTING_GROUP_ORDER: SettingGroup[] = [
  'general',
  'pages',
  'sms',
  'automation',
  'snappay',
  'digikala',
  'torob',
]

export type SettingType = 'text' | 'textarea' | 'number' | 'boolean' | 'secret'
export interface SettingDef {
  key: string
  group: SettingGroup
  label: string
  hint?: string
  type: SettingType
  default?: string
  /** متغیر محیطی جایگزین، وقتی تنظیمی در دیتابیس ثبت نشده باشد */
  env?: string
  min?: number
  max?: number
  /** قابل انتشار در API عمومی (بدون احراز هویت) */
  public?: boolean
}

/**
 * فهرست بسته تنظیمات.
 * هر کلکی که اینجا نباشد، حتی اگر در دیتابیس ردیف داشته باشد، خوانده نمی‌شود.
 */
export const SETTING_DEFS: SettingDef[] = [
  // ── عمومی ──
  {
    key: 'site.supportPhone',
    group: 'general',
    label: 'تلفن پشتیبانی',
    hint: 'در ایمیل و پیامک اطلاع‌رسانی سفارش استفاده می‌شود',
    type: 'text',
    public: true,
  },
  {
    key: 'site.supportEmail',
    group: 'general',
    label: 'ایمیل پشتیبانی',
    type: 'text',
    public: true,
  },
  {
    key: 'site.orderNotifyEmail',
    group: 'general',
    label: 'ایمیل اطلاع‌رسانی سفارش',
    hint: 'آدرس داخلی تیم؛ با ایمیل پشتیبانی فرق دارد',
    type: 'text',
  },
  {
    key: 'site.lowStockThreshold',
    group: 'general',
    label: 'آستانه هشدار موجودی کم',
    hint: 'کالاهایی با موجودی کمتر یا مساوی این عدد، در پنل هشدار می‌گیرند',
    type: 'number',
    default: '3',
    min: 0,
    max: 1000,
  },

  // ── صفحات و اعلان‌ها ──
  {
    key: 'pages.announcement.enabled',
    group: 'pages',
    label: 'نمایش نوار اعلان',
    type: 'boolean',
    default: 'false',
    public: true,
  },
  {
    key: 'pages.announcement.text',
    group: 'pages',
    label: 'متن نوار اعلان',
    hint: 'دقیقاً همان‌طور که در بالای سایت نمایش داده می‌شود',
    type: 'textarea',
    public: true,
  },
  {
    key: 'pages.maintenance.enabled',
    group: 'pages',
    label: 'حالت تعمیرات',
    hint: 'نوار قرمز هشدار را به همه بازدیدکنندگان نشان می‌دهد',
    type: 'boolean',
    default: 'false',
    public: true,
  },
  {
    key: 'pages.maintenance.message',
    group: 'pages',
    label: 'پیام حالت تعمیرات',
    type: 'textarea',
    default: 'به‌دلیل به‌روزرسانی، ممکن است برخی بخش‌ها چند دقیقه در دسترس نباشند.',
    public: true,
  },
  // بنر تبلیغاتی صفحه اصلی — مستقل از اسلایدر، تا تغییرش اسلایدر را دست نزند
  {
    key: 'pages.promo.enabled',
    group: 'pages',
    label: 'نمایش بنر تبلیغاتی صفحه اصلی',
    type: 'boolean',
    default: 'false',
    public: true,
  },
  {
    key: 'pages.promo.badge',
    group: 'pages',
    label: 'برچسب بنر',
    hint: 'متن کوچک بالای عنوان؛ مثال: جشنواره پایان فصل',
    type: 'text',
    public: true,
  },
  {
    key: 'pages.promo.title',
    group: 'pages',
    label: 'عنوان بنر',
    type: 'text',
    public: true,
  },
  {
    key: 'pages.promo.subtitle',
    group: 'pages',
    label: 'توضیح بنر',
    type: 'textarea',
    public: true,
  },
  {
    key: 'pages.promo.href',
    group: 'pages',
    label: 'لینک بنر',
    hint: 'مسیر داخلی سایت، مثال: /shop?discounted=1',
    type: 'text',
    default: '/shop',
    public: true,
  },
  {
    key: 'pages.promo.cta',
    group: 'pages',
    label: 'متن دکمه بنر',
    type: 'text',
    default: 'مشاهده کالاها',
    public: true,
  },

  // ── پیامک ──
  {
    key: 'sms.enabled',
    group: 'sms',
    label: 'ارسال پیامک فعال باشد',
    hint: 'در حالت توسعه خاموش بماند تا کد ورود در پاسخ API نمایش داده شود',
    type: 'boolean',
    default: 'false',
  },
  {
    key: 'sms.provider',
    group: 'sms',
    label: 'سرویس‌دهنده',
    hint: 'فعلاً فقط کاوه‌نگار پشتیبانی می‌شود',
    type: 'text',
    default: 'kavenegar',
  },
  {
    key: 'sms.apiKey',
    group: 'sms',
    label: 'کلید API پیامک',
    type: 'secret',
    env: 'KAVENEGAR_API_KEY',
  },
  {
    key: 'sms.sender',
    group: 'sms',
    label: 'شماره فرستنده',
    type: 'text',
    env: 'KAVENEGAR_SENDER',
  },
  {
    key: 'sms.otpTemplate',
    group: 'sms',
    label: 'قالب پیامک کد ورود',
    hint: 'نام قالبی که در پنل کاوه‌نگار ساخته‌اید',
    type: 'text',
    env: 'KAVENEGAR_OTP_TEMPLATE',
  },
  {
    key: 'sms.orderTemplate',
    group: 'sms',
    label: 'قالب پیامک سفارش',
    hint: 'برای اطلاع‌رسانی وضعیت سفارش؛ خالی بماند تا پیامکی ارسال نشود',
    type: 'text',
  },

  // ── اتوماسیون ──
  {
    key: 'automation.enabled',
    group: 'automation',
    label: 'ارسال رویداد به اتوماسیون فعال باشد',
    type: 'boolean',
    default: 'false',
  },
  {
    key: 'automation.webhookUrl',
    group: 'automation',
    label: 'آدرس وبهوک',
    hint: 'آدرس وبهوک n8n یا Make',
    type: 'text',
    env: 'AUTOMATION_WEBHOOK_URL',
  },
  {
    key: 'automation.webhookSecret',
    group: 'automation',
    label: 'کلید امضای HMAC',
    hint: 'اگر خالی باشد، ارسال رویداد متوقف می‌شود (امضای بدون کلید بی‌معنی است)',
    type: 'secret',
    env: 'AUTOMATION_WEBHOOK_SECRET',
  },
  {
    key: 'automation.events.orderCreated',
    group: 'automation',
    label: 'ارسال رویداد ثبت سفارش',
    type: 'boolean',
    default: 'true',
  },
  {
    key: 'automation.events.orderStatus',
    group: 'automation',
    label: 'ارسال رویداد تغییر وضعیت سفارش',
    type: 'boolean',
    default: 'true',
  },
  {
    key: 'automation.events.orderPaid',
    group: 'automation',
    label: 'ارسال رویداد پرداخت موفق سفارش',
    hint: 'بعد از تأیید پرداخت آنلاین ارسال می‌شود؛ برای زنجیره فاکتور و پیامک',
    type: 'boolean',
    default: 'true',
  },
  {
    key: 'automation.events.paymentInitiated',
    group: 'automation',
    label: 'ارسال رویداد شروع پرداخت آنلاین',
    type: 'boolean',
    default: 'true',
  },
  {
    key: 'automation.events.paymentFailed',
    group: 'automation',
    label: 'ارسال رویداد پرداخت ناموفق',
    type: 'boolean',
    default: 'true',
  },
  {
    key: 'automation.events.stockAlert',
    group: 'automation',
    label: 'ارسال رویداد هشدار موجودی',
    type: 'boolean',
    default: 'false',
  },
  {
    key: 'automation.events.contact',
    group: 'automation',
    label: 'ارسال رویداد پیام تماس با ما',
    type: 'boolean',
    default: 'true',
  },
  {
    key: 'automation.events.review',
    group: 'automation',
    label: 'ارسال رویداد نظر تازه',
    type: 'boolean',
    default: 'true',
  },
  {
    key: 'automation.timeoutMs',
    group: 'automation',
    label: 'مهلت پاسخ وبهوک (میلی‌ثانیه)',
    type: 'number',
    default: '4000',
    min: 500,
    max: 30_000,
  },

  // ── یکپارچه‌سازی اسنپ‌پی (پرداخت اعتباری/BNPL) ──
  // اعتبارنامه‌ها از پنل اسنپ‌پی پذیرندگان گرفته می‌شود (چهار مقدار). پیش‌فرض
  // حالت آزمایشی است؛ روش پرداخت در تسویه فقط وقتی ظاهر می‌شود که این‌جا
  // فعال شده باشد و هر چهار اعتبارنامه پر باشد.
  {
    key: 'integration.snappay.enabled',
    group: 'snappay',
    label: 'فعال‌سازی اسنپ‌پی',
    hint: 'روش «پرداخت اعتباری اسنپ‌پی» در تسویه حساب ظاهر می‌شود. خاموش‌کردن آن را فوراً از تسویه حذف می‌کند.',
    type: 'boolean',
    default: 'false',
  },
  {
    key: 'integration.snappay.sandbox',
    group: 'snappay',
    label: 'حالت آزمایشی',
    hint: 'روشن = محیط آزمایشی اسنپ‌پی. پیش از تراکنش واقعی خاموش کنید.',
    type: 'boolean',
    default: 'true',
  },
  {
    key: 'integration.snappay.username',
    group: 'snappay',
    label: 'نام کاربری پذیرنده',
    type: 'text',
    env: 'SNAPPAY_USERNAME',
  },
  {
    key: 'integration.snappay.password',
    group: 'snappay',
    label: 'رمز عبور پذیرنده',
    type: 'secret',
    env: 'SNAPPAY_PASSWORD',
  },
  {
    key: 'integration.snappay.clientId',
    group: 'snappay',
    label: 'Client ID',
    type: 'text',
    env: 'SNAPPAY_CLIENT_ID',
  },
  {
    key: 'integration.snappay.clientSecret',
    group: 'snappay',
    label: 'Client Secret',
    type: 'secret',
    env: 'SNAPPAY_CLIENT_SECRET',
  },

  // ── یکپارچه‌سازی دیجی‌کالا (همگام‌سازی کالا) ──
  // به‌عنوان فروشنده در دیجی‌کالا. اتصال واقعی پیاده‌سازی نشده است.
  {
    key: 'integration.digikala.enabled',
    group: 'digikala',
    label: 'فعال‌سازی دیجی‌کالا',
    hint: 'اتصال واقعی هنوز پیاده‌سازی نشده است؛ فعال‌کردنش فعلاً اثری روی سایت ندارد.',
    type: 'boolean',
    default: 'false',
  },
  {
    key: 'integration.digikala.sellerId',
    group: 'digikala',
    label: 'شناسه فروشنده (Seller ID)',
    type: 'text',
    env: 'DIGIKALA_SELLER_ID',
  },
  {
    key: 'integration.digikala.apiKey',
    group: 'digikala',
    label: 'کلید API دیجی‌کالا',
    type: 'secret',
    env: 'DIGIKALA_VENDOR_API_KEY',
  },

  // ── یکپارچه‌سازی ترب (فید قیمت) ──
  // تنها یکپارچه‌ای که همین حالا هم واقعی است: با فعال‌شدن، مسیر
  // `/api/feeds/torob` فهرست کالاهای فعال را با قیمت و موجودی می‌دهد.
  {
    key: 'integration.torob.enabled',
    group: 'torob',
    label: 'فعال‌سازی فید ترب',
    hint: 'با فعال‌شدن، مسیر /api/feeds/torob فهرست کالاها را برای ترب می‌فرستد.',
    type: 'boolean',
    default: 'false',
  },
  {
    key: 'integration.torob.storeName',
    group: 'torob',
    label: 'نام فروشگاه در ترب',
    hint: 'همان نامی که در پنل ترب ثبت شده است',
    type: 'text',
  },
  {
    key: 'integration.torob.apiKey',
    group: 'torob',
    label: 'کلید API ترب',
    type: 'secret',
    env: 'TOROB_API_KEY',
  },
]

const DEF_BY_KEY = new Map(SETTING_DEFS.map((def) => [def.key, def]))

export function getSettingDef(key: string): SettingDef | undefined {
  return DEF_BY_KEY.get(key)
}

export function settingDefsByGroup(group: SettingGroup): SettingDef[] {
  return SETTING_DEFS.filter((def) => def.group === group)
}

// ─────────────────────────────────────────────────────────────
//  رمزنگاری مقدارهای حساس
// ─────────────────────────────────────────────────────────────

const ENCRYPTED_PREFIX = 'enc:v1:'
const KEY_ENV = 'SETTINGS_ENCRYPTION_KEY'

/** آیا کلید رمزنگاری تنظیم شده است؟ بدون آن، مقدارهای حساس متن ساده ذخ보관 می‌شوند. */
export function isEncryptionEnabled(): boolean {
  return encryptionKey() !== null
}

/** کلید ۳۲ بایتی از متغیر محیطی — hex یا base64 */
function encryptionKey(): Buffer | null {
  const raw = process.env[KEY_ENV]
  if (!raw) return null
  const trimmed = raw.trim()
  const buffer = /^[0-9a-fA-F]{64}$/.test(trimmed)
    ? Buffer.from(trimmed, 'hex')
    : Buffer.from(trimmed, 'base64')
  return buffer.length === 32 ? buffer : null
}

/**
 * رمزنگاری یک مقدار حساس.
 * ساختار: `enc:v1:<iv>:<tag>:<ciphertext>` — همه بخش‌ها hex.
 */
export function encryptSecret(plain: string): string {
  const key = encryptionKey()
  if (!key) return plain
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`
}

/**
 * رمزگشایی مقدار حساس.
 * اگر مقدار رمزنگاری‌شده نباشد (مثلاً پیش از فعال‌کردن کلید ذخیره شده)،
 * همان‌طور برگردانده می‌شود تا داده قبلی از دست نرود. شکست رمزگشایی هم
 * null می‌دهد تا مقدار خراب، سایت را از کار نیندازد.
 */
export function decryptSecret(stored: string | null): string | null {
  if (stored === null) return null
  if (!stored.startsWith(ENCRYPTED_PREFIX)) return stored

  const key = encryptionKey()
  if (!key) return null

  const parts = stored.slice(ENCRYPTED_PREFIX.length).split(':')
  if (parts.length !== 3) return null

  try {
    const [ivHex, tagHex, dataHex] = parts as [string, string, string]
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    // کلید عوض شده یا مقدار دستکاری شده است
    return null
  }
}

// ─────────────────────────────────────────────────────────────
//  خواندن
// ─────────────────────────────────────────────────────────────

/**
 * مقدار خام همه کلیدهای تعریف‌شده.
 * مقدارهای حساس رمزگشایی می‌شوند — این تابع فقط سمت سرور مصرف می‌شود و
 * هرگز نباید خروجی خامش به مرورگر برود.
 */
export async function readSettings(): Promise<Record<string, string | null>> {
  // پیش از نصب دیتابیس جدول Setting وجود ندارد؛ به متغیر محیطی/پیش‌فرض‌ها رجوع می‌شود
  const rows = await prisma.setting.findMany().catch((error: unknown) => {
    if (isDbNotReadyError(error)) return []
    throw error
  })
  const byKey = new Map(rows.map((row) => [row.key, row]))

  const result: Record<string, string | null> = {}

  for (const def of SETTING_DEFS) {
    const row = byKey.get(def.key)
    if (row) {
      result[def.key] = def.type === 'secret' ? decryptSecret(row.value) : row.value
      continue
    }
    const fromEnv = def.env ? process.env[def.env] : undefined
    result[def.key] = fromEnv && fromEnv.length > 0 ? fromEnv : (def.default ?? null)
  }

  return result
}

/** یک تنظیم با کلید مشخص */
export async function getSetting(key: string): Promise<string | null> {
  const all = await readSettings()
  return all[key] ?? null
}

/** خواندن تنظیم بولی */
export async function getBooleanSetting(key: string): Promise<boolean> {
  return (await getSetting(key)) === 'true'
}

/** خواندن تنظیم عددی با پیش‌فرض در صورت مقدار نامعتبر */
export async function getNumberSetting(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key)
  if (raw === null) return fallback
  const parsed = Number.parseInt(toLatinDigits(raw).replace(/[^\d]/g, ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** گروه‌بندی کلیدهای موجودیت‌یافته برای نمایش در پنل */
export interface SettingField {
  key: string
  label: string
  hint?: string
  type: SettingType
  /** برای مقدارهای حساس همیشه null است */
  value: string | null
  /** آیا مقدار حساسی ذخیره شده است؟ (بدون افشای خودِ مقدار) */
  hasValue: boolean
  /** مقدار از دیتابیس آمده یا از متغیر محیطی/پیش‌فرض */
  source: 'database' | 'env' | 'default' | 'none'
}

export async function getSettingFields(group: SettingGroup): Promise<SettingField[]> {
  const defs = settingDefsByGroup(group)
  const rows = await prisma.setting.findMany({ where: { key: { in: defs.map((d) => d.key) } } })
  const byKey = new Map(rows.map((row) => [row.key, row]))

  return defs.map((def) => {
    const row = byKey.get(def.key)
    if (row) {
      const raw = row.value
      return {
        key: def.key,
        label: def.label,
        hint: def.hint,
        type: def.type,
        // مقدار حساس هرگز به مرورگر نمی‌رود؛ فقط «چیزی ذخیره شده» اعلام می‌شود
        value: def.type === 'secret' ? null : raw,
        hasValue: def.type === 'secret' ? decryptSecret(raw) !== null : raw !== null,
        source: 'database' as const,
      }
    }

    const fromEnv = def.env ? process.env[def.env] : undefined
    const hasEnv = Boolean(fromEnv && fromEnv.length > 0)
    return {
      key: def.key,
      label: def.label,
      hint: def.hint,
      type: def.type,
      value: def.type === 'secret' ? null : (def.default ?? null),
      // مقدار حساسِ آمده از env هم فقط به شکل «هست/نیست» اعلام می‌شود
      hasValue: def.type === 'secret' ? hasEnv : hasEnv || def.default !== undefined,
      source: hasEnv ? ('env' as const) : def.default !== undefined ? ('default' as const) : ('none' as const),
    }
  })
}

/** تنظیمات عمومی و بی‌خطر — برای API بدون احراز هویت */
export async function getPublicSettings(): Promise<Record<string, string | null>> {
  const all = await readSettings()
  const result: Record<string, string | null> = {}
  for (const def of SETTING_DEFS) {
    if (def.public && def.type !== 'secret') result[def.key] = all[def.key] ?? null
  }
  return result
}

// ─────────────────────────────────────────────────────────────
//  نوشتن
// ─────────────────────────────────────────────────────────────

/** متن چندخطی: فاصله‌های اضافه حذف می‌شود ولی خطوط نو حفظ می‌شوند */
function cleanMultiline(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim()
    .slice(0, maxLength)
}

/** اعتبارسنجی و تبدیل یک مقدار بر پایه نوع کلید */
export function parseSettingValue(
  def: SettingDef,
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; message: string } {
  switch (def.type) {
    case 'boolean': {
      if (typeof raw === 'boolean') return { ok: true, value: raw ? 'true' : 'false' }
      if (raw === 'true' || raw === 'false') return { ok: true, value: raw }
      return { ok: false, message: 'مقدار باید فعال یا غیرفعال باشد.' }
    }
    case 'number': {
      const normalized = toLatinDigits(String(raw ?? '')).trim()
      if (normalized === '') return { ok: true, value: null }
      if (normalized.startsWith('-') || normalized.startsWith('\u2212')) {
        return { ok: false, message: 'عدد نمی‌تواند منفی باشد.' }
      }
      const digits = normalized.replace(/[^\d]/g, '')
      if (!digits) return { ok: false, message: 'عدد معتبر وارد کنید.' }
      const parsed = Number.parseInt(digits, 10)
      if (def.min !== undefined && parsed < def.min) {
        return { ok: false, message: `عدد نباید کمتر از ${def.min} باشد.` }
      }
      if (def.max !== undefined && parsed > def.max) {
        return { ok: false, message: `عدد نباید بیشتر از ${def.max} باشد.` }
      }
      return { ok: true, value: String(parsed) }
    }
    case 'textarea': {
      const text = cleanMultiline(raw, 1000)
      return { ok: true, value: text === '' ? null : text }
    }
    case 'secret': {
      if (typeof raw !== 'string') return { ok: false, message: 'مقدار نامعتبر است.' }
      // فاصله‌های سر و ته حذف می‌شود؛ کلید API اغلب با کپی‌کردن فاصله می‌گیرد
      const text = raw.trim().slice(0, 500)
      return { ok: true, value: text === '' ? null : text }
    }
    default: {
      if (typeof raw !== 'string' && typeof raw !== 'number') {
        return { ok: false, message: 'مقدار نامعتبر است.' }
      }
      const text = String(raw).replace(/\s+/g, ' ').trim().slice(0, 300)
      return { ok: true, value: text === '' ? null : text }
    }
  }
}

export interface UpdateSettingsResult {
  ok: boolean
  fields?: Record<string, string>
  message?: string
  /** کلیدهایی که واقعاً عوض شدند */
  changed?: string[]
}

/**
 * به‌روزرسانی تنظیمات یک گروه.
 *
 * نکته امنیتی: در لاگ حسابرسی فقط **نام** کلیدهای تغییرکرده ثبت می‌شود، نه
 * مقدارشان. وگرنه کلید API پیامک و کلید امضای وبهوک داخل جدول لاگ می‌نشستند.
 */
export async function updateSettings(
  group: SettingGroup,
  patch: Record<string, unknown>,
  actor: { id: string; ip?: string | null; userAgent?: string | null },
): Promise<UpdateSettingsResult> {
  const allowed = new Set(settingDefsByGroup(group).map((def) => def.key))
  const fields: Record<string, string> = {}
  const writes: { def: SettingDef; value: string | null }[] = []

  for (const [key, raw] of Object.entries(patch)) {
    const def = DEF_BY_KEY.get(key)
    // کلید ناشناخته یا متعلق به گروه دیگر نادیده گرفته نمی‌شود؛ خطاست
    if (!def || !allowed.has(key)) {
      fields[key] = 'این کلید تنظیمات شناخته‌شده نیست.'
      continue
    }
    const parsed = parseSettingValue(def, raw)
    if (!parsed.ok) {
      fields[key] = parsed.message
      continue
    }
    writes.push({ def, value: parsed.value })
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, fields, message: 'برخی مقادیر معتبر نیستند.' }
  }

  const changed: string[] = []

  for (const { def, value } of writes) {
    const stored = def.type === 'secret' && value !== null ? encryptSecret(value) : value
    await prisma.setting.upsert({
      where: { key: def.key },
      update: { value: stored, group: def.group, isSecret: def.type === 'secret' },
      create: {
        key: def.key,
        group: def.group,
        value: stored,
        isSecret: def.type === 'secret',
      },
    })
    changed.push(def.key)
  }

  if (changed.length > 0) {
    await writeAuditLog({
      actorId: actor.id,
      action: 'settings.updated',
      entity: 'Setting',
      entityId: group,
      // فقط نام کلیدها — مقدار محرمانه هرگز در لاگ نمی‌نشیند
      metadata: { group, keys: changed.join(', ') },
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
    })
  }

  return { ok: true, changed }
}
