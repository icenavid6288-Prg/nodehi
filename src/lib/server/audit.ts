/**
 * نمایش متادیتای لاگ حسابرسی.
 *
 * متادیتا به شکل JSON متنی در دیتابیس ذخیره می‌شود (SQLite نوع Json ندارد) و
 * می‌تواند مقدار تودرتو داشته باشد — مثل `{ code, changed: { percent: 25 } }`.
 * اگر مقدار تودرتو را مستقیم در متن بریزیم، کاربر `[object Object]` می‌بیند.
 * این ماژول مقدارها را به جفت‌های کلید/مقدار خوانا تبدیل می‌کند.
 *
 * این فایل عمداً هیچ وابستگی‌ای به Prisma یا Next ندارد تا مستقل آزمون‌پذیر باشد.
 */

export interface AuditMetadataEntry {
  key: string
  value: string
}

/** تفسیر امن متادیتای JSON؛ داده‌ای که خودمان نوشته‌ایم، اما هرگز قابل اعتماد فرض نمی‌شود */
export function parseAuditMetadata(value: string | null): Record<string, unknown> | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

/** تبدیل یک مقدار به متن خوانا — بدون `[object Object]` */
function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(displayValue).join('، ') : '—'
  }
  return JSON.stringify(value)
}

/**
 * تبدیل متادیتا به فهرست جفت‌های خوانا.
 * اشیای تودرتو یک سطح باز می‌شوند تا `changed.percent` به‌جای `changed`
 * نمایش داده شود — یک سطح برای این کاربرد کافی است و از درخت عمیق جلوگیری می‌کند.
 */
export function formatAuditMetadata(metadata: string | null): AuditMetadataEntry[] {
  const parsed = parseAuditMetadata(metadata)
  if (!parsed) return []

  const entries: AuditMetadataEntry[] = []

  for (const [key, value] of Object.entries(parsed)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = Object.entries(value as Record<string, unknown>)
      if (nested.length === 0) {
        entries.push({ key, value: '—' })
        continue
      }
      for (const [nestedKey, nestedValue] of nested) {
        entries.push({ key: `${key}.${nestedKey}`, value: displayValue(nestedValue) })
      }
      continue
    }
    entries.push({ key, value: displayValue(value) })
  }

  return entries
}
