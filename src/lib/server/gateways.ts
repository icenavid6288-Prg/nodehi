/**
 * درگاه‌های پرداخت.
 *
 * ── چرا جدول و نه ثابت‌های کد؟ ──
 * فعال/غیرفعال‌کردن درگاه و تغییر حالت آزمایشی باید از پنل و بدون انتشار
 * دوباره سایت ممکن باشد.
 *
 * ── نکته کلیدی: کلید درگاه با شناسه روش پرداخت یکی است ──
 * `checkout` روش پرداخت را با شناسه‌های `online` / `cod` / `installment`
 * می‌شناسد. ردیف‌های درگاه با همین شناسه‌ها ساخته می‌شوند تا «کدام روش در
 * تسویه مجاز است» تنها یک منبع داشته باشد.
 *
 * ── رفتار امن در نبود داده ──
 * اگر هیچ ردیفی در جدول نباشد (مثلاً پیش از seed)، همه روش‌ها مجاز می‌مانند؛
 * وگرنه سایت تازه‌نصب نمی‌توانست سفارش بگیرد و قرارداد «بدون تنظیم اضافه
 * کار می‌کند» می‌شکست.
 */

import type { Prisma, PaymentGateway } from '@prisma/client'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/server/orders'

/** روش‌های پرداخت پشتیبانی‌شده در تسویه — با `api/checkout` یکی است */
export const PAYMENT_METHOD_KEYS = ['online', 'cod', 'installment'] as const
export type PaymentMethodKey = (typeof PAYMENT_METHOD_KEYS)[number]

export interface GatewayPreset {
  key: PaymentMethodKey
  label: string
  description: string
  /** حالت پیش‌فرض فعال بودن در نصب تازه */
  activeByDefault: boolean
}

/**
 * پیش‌فرض‌های درگاه.
 * این فهرست هم برای seed و هم برای ساخت ردیف‌های گم‌شده در پنل استفاده می‌شود،
 * پس پنل هرگز بدون ردیف نمایش داده نمی‌شود.
 */
export const GATEWAY_PRESETS: GatewayPreset[] = [
  {
    key: 'online',
    label: 'پرداخت آنلاین (زرین‌پال)',
    description: 'انتقال به درگاه بانکی و بازگشت به سایت پس از پرداخت موفق.',
    activeByDefault: false,
  },
  {
    key: 'cod',
    label: 'پرداخت درب منزل',
    description: 'مشتری هنگام تحویل کالا مبلغ را می‌پردازد.',
    activeByDefault: true,
  },
  {
    key: 'installment',
    label: 'خرید اقساطی',
    description: 'فقط برای سفارش‌های بالای حداقل مبلغ اقساط.',
    activeByDefault: true,
  },
]

export function gatewayLabel(key: string): string {
  return GATEWAY_PRESETS.find((preset) => preset.key === key)?.label ?? key
}

/** فهرست درگاه‌ها؛ ردیف‌های گم‌شده با مقادیر پیش‌فرض نمایش داده می‌شوند */
export async function listGateways(): Promise<PaymentGateway[]> {
  const rows = await prisma.paymentGateway.findMany({ orderBy: { sortOrder: 'asc' } })
  const byKey = new Map(rows.map((row) => [row.key, row]))

  // ترتیب خروجی بر پایه فهرست پیش‌فرض است تا پنل همیشه پایدار بماند
  const ordered: PaymentGateway[] = []
  for (const preset of GATEWAY_PRESETS) {
    const existing = byKey.get(preset.key)
    if (existing) {
      ordered.push(existing)
      continue
    }
    // ردیف نمایشی برای درگاهی که هنوز ساخته نشده — پنل باید همه را نشان دهد
    ordered.push({
      id: `preset:${preset.key}`,
      key: preset.key,
      label: preset.label,
      description: preset.description,
      isActive: preset.activeByDefault,
      isSandbox: true,
      merchantId: null,
      apiKey: null,
      sortOrder: GATEWAY_PRESETS.indexOf(preset),
      updatedAt: new Date(0),
    })
  }

  return ordered
}

/**
 * آیا این روش پرداخت در تسویه مجاز است؟
 * در نبود هر ردیفی، اجازه داده می‌شود (سازگاری با نصب تازه).
 */
export async function isPaymentMethodEnabled(method: string): Promise<boolean> {
  const count = await prisma.paymentGateway.count()
  if (count === 0) return true

  const row = await prisma.paymentGateway.findUnique({ where: { key: method } })
  // اگر ردیفی برای این روش نباشد، از پیش‌فرض همان روش استفاده می‌شود
  if (!row) return GATEWAY_PRESETS.find((preset) => preset.key === method)?.activeByDefault ?? false
  return row.isActive
}

/** روش‌های فعال برای نمایش در تسویه */
export async function enabledPaymentMethods(): Promise<string[]> {
  const rows = await listGateways()
  return rows.filter((row) => row.isActive).map((row) => row.key)
}

export interface UpdateGatewayInput {
  isActive?: unknown
  isSandbox?: unknown
  merchantId?: unknown
  apiKey?: unknown
  label?: unknown
}

export interface UpdateGatewayResult {
  ok: boolean
  fields?: Record<string, string>
  gateway?: PaymentGateway
}

/** تبدیل ورودی متنی اختیاری؛ رشته خالی یعنی «پاک کن» */
function optionalText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim().slice(0, maxLength)
  return text === '' ? null : text
}

/** به‌روزرسانی پیکربندی یک درگاه با ثبت در لاگ حسابرسی */
export async function updateGateway(
  id: string,
  input: UpdateGatewayInput,
  actor: { id: string; ip?: string | null; userAgent?: string | null },
): Promise<UpdateGatewayResult> {
  const fields: Record<string, string> = {}
  const data: Prisma.PaymentGatewayUpdateInput = {}
  const changed: string[] = []

  const row = id.startsWith('preset:')
    ? null
    : await prisma.paymentGateway.findUnique({ where: { id } })

  const key = row?.key ?? id.replace('preset:', '')
  const preset = GATEWAY_PRESETS.find((item) => item.key === key)
  if (!preset) {
    return { ok: false, fields: { key: 'درگاه ناشناخته است.' } }
  }

  if (input.isActive !== undefined) {
    if (typeof input.isActive !== 'boolean') {
      fields.isActive = 'مقدار باید فعال یا غیرفعال باشد.'
    } else {
      data.isActive = input.isActive
      if (row?.isActive !== input.isActive) changed.push('isActive')
    }
  }

  if (input.isSandbox !== undefined) {
    if (typeof input.isSandbox !== 'boolean') {
      fields.isSandbox = 'مقدار باید آزمایشی یا واقعی باشد.'
    } else {
      data.isSandbox = input.isSandbox
      if (row?.isSandbox !== input.isSandbox) changed.push('isSandbox')
    }
  }

  if (input.label !== undefined) {
    const label = optionalText(input.label, 80)
    if (!label) {
      fields.label = 'نام درگاه را وارد کنید.'
    } else {
      data.label = label
      if (row?.label !== label) changed.push('label')
    }
  }

  if (input.merchantId !== undefined) {
    const merchantId = optionalText(input.merchantId, 120)
    data.merchantId = merchantId
    if (row?.merchantId !== merchantId) changed.push('merchantId')
  }

  if (input.apiKey !== undefined) {
    // کلید خالی یعنی «مقدار فعلی را نگه دار»، نه «پاک کن»: پنل مقدار کلید را
    // نمایش نمی‌دهد، پس ارسال رشته خالی نباید کلید موجود را از بین ببرد.
    const apiKey = optionalText(input.apiKey, 200)
    if (apiKey !== null) {
      data.apiKey = apiKey
      if (row?.apiKey !== apiKey) changed.push('apiKey')
    }
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields }
  if (Object.keys(data).length === 0) {
    return { ok: false, fields: { _: 'هیچ تغییری برای ثبت وجود ندارد.' } }
  }

  // درگاه فعال بدون شناسه پذیرنده (برای درگاه‌های آنلاین) قابل استفاده نیست
  const nextActive = (data.isActive as boolean | undefined) ?? row?.isActive ?? preset.activeByDefault
  const nextMerchant = (data.merchantId as string | null | undefined) ?? row?.merchantId ?? null
  if (key === 'online' && nextActive && !nextMerchant) {
    return {
      ok: false,
      fields: { merchantId: 'برای فعال‌کردن پرداخت آنلاین، شناسه پذیرنده را وارد کنید.' },
    }
  }

  const gateway = await prisma.paymentGateway.upsert({
    where: { key },
    update: data,
    create: {
      key,
      label: (data.label as string | undefined) ?? preset.label,
      description: preset.description,
      isActive: nextActive,
      isSandbox: (data.isSandbox as boolean | undefined) ?? true,
      merchantId: nextMerchant,
      apiKey: (data.apiKey as string | undefined) ?? null,
      sortOrder: GATEWAY_PRESETS.indexOf(preset),
    },
  })

  if (changed.length > 0) {
    await writeAuditLog({
      actorId: actor.id,
      action: 'gateway.updated',
      entity: 'PaymentGateway',
      entityId: gateway.id,
      // نام کلیدهای تغییرکرده، نه مقدارشان
      metadata: { gateway: key, keys: changed.join(', ') },
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
    })
  }

  return { ok: true, gateway }
}
