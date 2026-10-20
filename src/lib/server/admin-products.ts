/**
 * تفسیر و اعتبارسنجی ورودی کالا برای پنل مدیریت.
 *
 * چرا جدا از route؟ همان دلیلی که برای کد تخفیف داشتیم: این ماژول بدون
 * دیتابیس و بدون Next قابل آزمون است، و قواعدی که «چه کالایی مجاز است» را
 * تعیین می‌کنند در یک جا جمع می‌مانند. route فقط نقش/دسترسی را بررسی می‌کند و
 * نتیجهٔ این توابع را در Prisma می‌نویسد.
 *
 * قاعده‌های کلیدی:
 *  • تا کنون کاتالوگ یک آرایهٔ ثابت در کد بود؛ حالا کالا از پنل ساخته می‌شود،
 *    پس هر فیلد باید در برابر ورودی دست‌کاری‌شده مقاوم باشد.
 *  • آرایه‌ها (نکته‌ها، تصاویر، تگ‌ها، مشخصات) در دیتابیس JSON متنی ذخیره
 *    می‌شوند (SQLite آرایه اسکالر ندارد)؛ تبدیل آن‌ها اینجا انجام می‌شود.
 *  • نامک (`slug`) باید لاتین و یکتا باشد؛ اگر مدیر نامک ندهد از نام فارسی
 *    ساخته می‌شود (آوانگاری) تا افزودن کالا مستلزم تایپ انگلیسی نباشد.
 */

import type { Prisma } from '@prisma/client'
import { CAPACITY_UNITS, ENERGY_RATINGS, SPEC_GROUPS } from '@/lib/product-options'
import { cleanText, toNonNegativeInt } from '@/lib/server/validation'
import { toLatinDigits } from '@/lib/utils/format'
import type { ProductAttributes, SpecItem } from '@/types'

/** شکل کامل کالا پس از پاک‌سازی — همان چیزی که در دیتابیس می‌نشیند */
export interface ProductSnapshot {
  slug: string
  name: string
  categorySlug: string
  brandSlug: string
  price: number
  compareAtPrice: number | null
  stock: number
  rating: number
  reviewCount: number
  shortDescription: string
  description: string
  highlights: string[]
  specs: SpecItem[]
  attributes: ProductAttributes
  images: string[]
  tags: string[]
  relatedSlugs: string[]
  videoUrl: string | null
  publishedAt: Date
  isActive: boolean
}

export interface ProductParseResult {
  /** خطاهای فیلد‌به‌فیلد برای فرم */
  fields: Record<string, string>
  /** کالای کامل پس از پاک‌سازی (برای create همه جا، برای update ادغام با موجود) */
  values: ProductSnapshot
  /** فقط فیلدهای تغییرکرده — برای لاگ حسابرسی */
  changed: Record<string, unknown>
  /** کلیدهای تغییرکرده — برای ساخت `data` در Prisma */
  changedKeys: string[]
}

export const MAX_IMAGES = 8
export const MAX_HIGHLIGHTS = 16
export const MAX_SPECS = 40
export const MAX_RELATED = 12

/** ویژگی‌های پیش‌فرض — کالای تازه با همین‌ها شروع می‌شود */
export const DEFAULT_ATTRIBUTES: ProductAttributes = {
  brand: '',
  capacity: null,
  capacityUnit: null,
  energyRating: null,
  color: '',
  widthCm: null,
  heightCm: null,
  depthCm: null,
  inverter: false,
  warrantyMonths: 0,
  madeIn: '',
  installmentAvailable: false,
  readyToShip: false,
}

/**
 * آوانگاری سادهٔ فارسی → لاتین برای ساخت نامک.
 *
 * عمداً کامل و دقیق نیست: نامک فقط باید یکتا و خوانا در URL باشد. مدیر
 * می‌تواند مقدار پیشنهادی را ویرایش کند.
 */
const TRANSLITERATION: Record<string, string> = {
  آ: 'a', ا: 'a', ب: 'b', پ: 'p', ت: 't', ث: 's', ج: 'j', چ: 'ch',
  ح: 'h', خ: 'kh', د: 'd', ذ: 'z', ر: 'r', ز: 'z', ژ: 'zh', س: 's',
  ش: 'sh', ص: 's', ض: 'z', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f',
  ق: 'gh', ک: 'k', ك: 'k', گ: 'g', ل: 'l', م: 'm', ن: 'n', و: 'v',
  ه: 'h', ی: 'y', ي: 'y', ى: 'a', ئ: 'y', ء: '', ة: 'h',
  أ: 'a', إ: 'a', ؤ: 'o', 'ٔ': '', '‌': '-', '‏': '', '‎': '',
}

/** ساخت نامک لاتین از یک متن (فارسی یا لاتین). ممکن است رشته خالی بدهد. */
export function slugify(input: string): string {
  let out = ''
  for (const char of toLatinDigits(String(input ?? '')).toLowerCase()) {
    if (/[a-z0-9]/.test(char)) {
      out += char
      continue
    }
    if (/[\s\-_./\\،,+()[\]]/.test(char)) {
      out += '-'
      continue
    }
    const mapped = TRANSLITERATION[char]
    if (mapped) out += mapped
  }
  return out
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

/** یکتاسازی نامک با پسوند عددی؛ ورودی نامعتبر به «product» برمی‌گردد */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const clean = base || 'product'
  if (!taken.has(clean)) return clean
  for (let n = 2; n < 500; n += 1) {
    const candidate = `${clean}-${n}`
    if (!taken.has(candidate)) return candidate
  }
  return `${clean}-${Date.now()}`
}

/** نامک معتبر: حروف کوچک لاتین، رقم و خط تیرهٔ میانی */
export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length >= 3 && value.length <= 80
}

/** مقدار خالی: null، رشتهٔ تهی، یا صفر (برای فیلدهای اختیاری مثل تخفیف) */
function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  return false
}

/** تفسیر منطقی از boolean یا رشته‌های رایج فرم */
function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const raw = value.trim().toLowerCase()
    if (['true', '1', 'on', 'yes', 'بله'].includes(raw)) return true
    if (['false', '0', 'off', 'no', 'خیر', ''].includes(raw)) return false
  }
  return fallback
}

/** امتیاز اعشاری بین ۰ تا ۵ با یک رقم اعشار */
function toRating(value: unknown): number | null {
  const raw = toLatinDigits(String(value ?? '')).trim().replace(/[^0-9.]/g, '')
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) return null
  return Math.round(parsed * 10) / 10
}

/** متن چندخطی: پاراگراف‌ها حفظ می‌شوند (برخلاف cleanText که همه را یک‌خطی می‌کند) */
function cleanMultiline(value: unknown, maxLength = 6000): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

/**
 * تبدیل ورودی (رشتهٔ چندخطی یا آرایه) به فهرست رشته‌ها.
 * در فرم، نکته‌ها و تگ‌ها با textarea وارد می‌شوند و هر خط یک آیتم است.
 */
function toStringList(value: unknown, options: { max: number; maxLength?: number }): string[] {
  const { max, maxLength = 200 } = options
  if (value === null || value === undefined) return []
  const parts = Array.isArray(value)
    ? value.map((entry) => (typeof entry === 'string' ? entry : typeof entry === 'number' ? String(entry) : ''))
    : typeof value === 'string'
      ? value.split(/\r?\n/)
      : []
  return parts
    .map((entry) => cleanText(entry, maxLength))
    .filter(Boolean)
    .slice(0, max)
}

/** آدرس قابل قبول: http(s) مطلق یا مسیر نسبی داخل سایت */
function isAcceptableUrl(value: string): boolean {
  if (value.startsWith('/')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** تفسیر فهرست تصاویر با گزارش تک‌تک آیتم‌های نامعتبر */
function parseImages(value: unknown): { images: string[]; invalid: string[] } {
  const images = toStringList(value, { max: MAX_IMAGES, maxLength: 500 })
  const invalid = images.filter((entry) => !isAcceptableUrl(entry))
  return { images, invalid }
}

/** تفسیر مشخصات فنی: هر آیتم «برچسب/مقدار/گروه» است */
export function parseSpecs(value: unknown): SpecItem[] {
  if (!Array.isArray(value)) return []
  const specs: SpecItem[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const row = entry as Record<string, unknown>
    const label = cleanText(row.label, 80)
    const specValue = cleanText(row.value, 200)
    if (!label || !specValue) continue
    const groupRaw = cleanText(row.group, 20)
    const group = (SPEC_GROUPS as readonly string[]).includes(groupRaw)
      ? (groupRaw as SpecItem['group'])
      : 'general'
    specs.push({ label, value: specValue, group })
    if (specs.length >= MAX_SPECS) break
  }
  return specs
}

/**
 * تفسیر ویژگی‌های فیلترپذیر.
 *
 * فقط کلیدهای **موجود** در ورودی بازنویسی می‌شوند و بقیه از مقدار قبلی
 * می‌مانند. اگر همه را دوباره می‌ساختیم، فرمی که ابعاد را نشان نمی‌دهد با
 * هر ویرایش، ابعاد کالا را پاک می‌کرد.
 */
export function parseAttributes(value: unknown, fallback: ProductAttributes): ProductAttributes {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
  const raw = value as Record<string, unknown>
  const result: ProductAttributes = { ...fallback }
  const optionalNumber = (input: unknown): number | null =>
    isBlank(input) ? null : toRatingFreeNumber(input)

  if (has(raw, 'brand')) result.brand = cleanText(raw.brand, 60) || fallback.brand
  if (has(raw, 'capacity')) result.capacity = optionalNumber(raw.capacity)
  if (has(raw, 'capacityUnit')) {
    const unit = cleanText(raw.capacityUnit, 20)
    result.capacityUnit = (CAPACITY_UNITS as readonly string[]).includes(unit)
      ? (unit as ProductAttributes['capacityUnit'])
      : null
  }
  if (has(raw, 'energyRating')) {
    const rating = cleanText(raw.energyRating, 10)
    result.energyRating = (ENERGY_RATINGS as readonly string[]).includes(rating)
      ? (rating as ProductAttributes['energyRating'])
      : null
  }
  if (has(raw, 'color')) result.color = cleanText(raw.color, 40)
  if (has(raw, 'widthCm')) result.widthCm = optionalNumber(raw.widthCm)
  if (has(raw, 'heightCm')) result.heightCm = optionalNumber(raw.heightCm)
  if (has(raw, 'depthCm')) result.depthCm = optionalNumber(raw.depthCm)
  if (has(raw, 'inverter')) result.inverter = toBoolean(raw.inverter, fallback.inverter)
  if (has(raw, 'warrantyMonths')) {
    result.warrantyMonths = isBlank(raw.warrantyMonths) ? 0 : (toNonNegativeInt(raw.warrantyMonths) ?? 0)
  }
  if (has(raw, 'madeIn')) result.madeIn = cleanText(raw.madeIn, 60)
  if (has(raw, 'installmentAvailable')) {
    result.installmentAvailable = toBoolean(raw.installmentAvailable, fallback.installmentAvailable)
  }
  if (has(raw, 'readyToShip')) result.readyToShip = toBoolean(raw.readyToShip, fallback.readyToShip)

  return result
}

/** عدد اعشاری نامنفی (برای ظرفیت مثل ۳۲ اینچ یا ۶۹۰ لیتر) */
function toRatingFreeNumber(value: unknown): number | null {
  const raw = toLatinDigits(String(value ?? '')).trim().replace(/[^0-9.]/g, '')
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 10) / 10
}

function has(input: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, key)
}

/**
 * سریال‌سازی پایدار: کلیدهای شیء مرتب می‌شوند.
 *
 * چرا لازم است؟ `attributes` از دیتابیس با ترتیب کلید JSON ذخیره‌شده برمی‌گردد
 * ولی مقدار تازه از `parseAttributes` با ترتیب ثابت ساخته می‌شود. مقایسهٔ
 * سادهٔ JSON دو شیء هم‌محتوا را «متفاوت» می‌دید و ویرایش بی‌ربط، ویژگی‌ها را
 * بی‌دلیل «تغییرکرده» ثبت می‌کرد.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`
}

/** معادل بودن دو مقدار (آرایه/شیء با سریال‌سازی پایدار، تاریخ با زمان) */
function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  if (a === null || b === null) return a === b
  if (typeof a === 'object' || typeof b === 'object') return stableStringify(a) === stableStringify(b)
  return a === b
}

/**
 * تفسیر ورودی کالا.
 *
 * `mode: 'create'` فیلدهای الزامی را می‌خواهد؛ `mode: 'update'` فقط فیلدهای
 * ارسالی را بررسی می‌کند و بقیه را از `existing` نگه می‌دارد تا ویرایش قیمت،
 * بی‌قصد موجودی یا مشخصات را پاک نکند.
 */
export function parseProductInput(
  input: Record<string, unknown>,
  options: {
    mode: 'create' | 'update'
    existing?: ProductSnapshot
    categorySlugs: string[]
    brandSlugs: string[]
    takenSlugs?: Set<string>
  },
): ProductParseResult {
  const { mode, categorySlugs, brandSlugs } = options
  const isCreate = mode === 'create'
  const fields: Record<string, string> = {}

  const base: ProductSnapshot = options.existing ?? {
    slug: '',
    name: '',
    categorySlug: categorySlugs[0] ?? '',
    brandSlug: brandSlugs[0] ?? '',
    price: 0,
    compareAtPrice: null,
    stock: 0,
    rating: 0,
    reviewCount: 0,
    shortDescription: '',
    description: '',
    highlights: [],
    specs: [],
    attributes: { ...DEFAULT_ATTRIBUTES },
    images: [],
    tags: [],
    relatedSlugs: [],
    videoUrl: null,
    publishedAt: new Date(),
    isActive: true,
  }

  const values: ProductSnapshot = {
    ...base,
    attributes: { ...base.attributes },
    highlights: [...base.highlights],
    specs: [...base.specs],
    images: [...base.images],
    tags: [...base.tags],
    relatedSlugs: [...base.relatedSlugs],
  }

  // ── نام ──
  if (isCreate || has(input, 'name')) {
    const name = cleanText(input.name, 200)
    if (name.length < 3) fields.name = 'نام کالا باید حداقل ۳ نویسه باشد.'
    else values.name = name
  }

  // ── دسته ──
  if (isCreate || has(input, 'categorySlug')) {
    const categorySlug = cleanText(input.categorySlug, 60).toLowerCase()
    if (!categorySlug) fields.categorySlug = 'دسته‌بندی را انتخاب کنید.'
    else if (!categorySlugs.includes(categorySlug)) fields.categorySlug = 'این دسته‌بندی وجود ندارد.'
    else values.categorySlug = categorySlug
  }

  // ── برند ──
  if (isCreate || has(input, 'brandSlug')) {
    const brandSlug = cleanText(input.brandSlug, 60).toLowerCase()
    if (!brandSlug) fields.brandSlug = 'برند را انتخاب کنید.'
    else if (!brandSlugs.includes(brandSlug)) fields.brandSlug = 'این برند وجود ندارد.'
    else values.brandSlug = brandSlug
  }

  // ── نامک ──
  if (isCreate || has(input, 'slug')) {
    const provided = cleanText(input.slug, 80).toLowerCase().replace(/\s+/g, '-')
    const candidate = provided || slugify(values.name)
    if (!isValidSlug(candidate)) {
      fields.slug = 'نامک باید ۳ تا ۸۰ نویسهٔ لاتین، رقم یا خط تیره باشد.'
    } else if (isCreate) {
      // یکتاسازی فقط در ساخت معنا دارد؛ تغییر نامک کالای موجود عمدی است
      values.slug = uniqueSlug(candidate, options.takenSlugs ?? new Set())
    } else {
      values.slug = candidate
    }
  }

  // ── قیمت (۰ = تماس بگیرید) ──
  if (isCreate || has(input, 'price')) {
    const price = toNonNegativeInt(input.price)
    if (price === null) fields.price = 'قیمت باید عددی صفر یا بیشتر باشد (۰ = تماس بگیرید).'
    else values.price = price
  }

  // ── قیمت پیش از تخفیف ──
  if (has(input, 'compareAtPrice')) {
    const parsed = isBlank(input.compareAtPrice) ? null : toNonNegativeInt(input.compareAtPrice)
    if (!isBlank(input.compareAtPrice) && parsed === null) {
      fields.compareAtPrice = 'قیمت پیش از تخفیف نامعتبر است.'
    } else if (parsed !== null && parsed <= values.price) {
      fields.compareAtPrice = 'قیمت پیش از تخفیف باید از قیمت فروش بیشتر باشد.'
    } else {
      values.compareAtPrice = parsed
    }
  } else if (isCreate) {
    values.compareAtPrice = null
  }

  // ── موجودی ──
  if (isCreate || has(input, 'stock')) {
    const stock = toNonNegativeInt(isBlank(input.stock) ? 0 : input.stock)
    if (stock === null) fields.stock = 'موجودی باید عددی صفر یا بیشتر باشد.'
    else values.stock = stock
  }

  // ── امتیاز و تعداد نظر (مقدار نمایشی/بازاریابی) ──
  if (isCreate || has(input, 'rating')) {
    const rating = toRating(isBlank(input.rating) ? 0 : input.rating)
    if (rating === null) fields.rating = 'امتیاز باید عددی بین ۰ تا ۵ باشد.'
    else values.rating = rating
  }

  if (isCreate || has(input, 'reviewCount')) {
    const reviewCount = toNonNegativeInt(isBlank(input.reviewCount) ? 0 : input.reviewCount)
    if (reviewCount === null) fields.reviewCount = 'تعداد نظر باید عددی صفر یا بیشتر باشد.'
    else values.reviewCount = reviewCount
  }

  // ── توضیح کوتاه و بلند ──
  if (isCreate || has(input, 'shortDescription')) {
    const shortDescription = cleanText(input.shortDescription, 300)
    if (shortDescription.length < 10) fields.shortDescription = 'توضیح کوتاه باید حداقل ۱۰ نویسه باشد.'
    else values.shortDescription = shortDescription
  }

  if (isCreate || has(input, 'description')) {
    values.description = cleanMultiline(input.description)
  }

  // ── آرایه‌ها ──
  if (isCreate || has(input, 'highlights')) {
    values.highlights = toStringList(input.highlights, { max: MAX_HIGHLIGHTS, maxLength: 200 })
  }

  if (isCreate || has(input, 'specs')) {
    values.specs = parseSpecs(input.specs)
  }

  if (isCreate || has(input, 'images')) {
    const { images, invalid } = parseImages(input.images)
    if (invalid.length > 0) fields.images = `آدرس تصویر نامعتبر: ${invalid[0]}`
    else values.images = images
  }

  if (isCreate || has(input, 'tags')) {
    values.tags = toStringList(input.tags, { max: 20, maxLength: 40 })
  }

  if (isCreate || has(input, 'relatedSlugs')) {
    const related = toStringList(input.relatedSlugs, { max: MAX_RELATED, maxLength: 80 })
    const bad = related.filter((entry) => !isValidSlug(entry))
    if (bad.length > 0) fields.relatedSlugs = `نامک مرتبط نامعتبر: ${bad[0]}`
    else values.relatedSlugs = related.filter((entry) => entry !== values.slug)
  }

  // ── ویدئو ──
  if (isCreate || has(input, 'videoUrl')) {
    const raw = isBlank(input.videoUrl) ? '' : cleanText(input.videoUrl, 500)
    if (raw && !isAcceptableUrl(raw)) fields.videoUrl = 'آدرس ویدئو معتبر نیست.'
    else values.videoUrl = raw || null
  }

  // ── ویژگی‌های فیلترپذیر ──
  if (isCreate || has(input, 'attributes')) {
    values.attributes = parseAttributes(input.attributes, { ...base.attributes })
  }
  // برند داخل ویژگی‌ها همیشه با نامک برند یکسان می‌شود (منبع حقیقت یکی است)
  values.attributes.brand = values.brandSlug

  // ── تاریخ انتشار ──
  if (isCreate || has(input, 'publishedAt')) {
    if (isBlank(input.publishedAt)) {
      values.publishedAt = isCreate ? new Date() : base.publishedAt
    } else {
      const parsed = new Date(String(input.publishedAt))
      if (Number.isNaN(parsed.getTime())) fields.publishedAt = 'تاریخ انتشار معتبر نیست.'
      else values.publishedAt = parsed
    }
  }

  // ── وضعیت (حذف نرم) ──
  if (isCreate || has(input, 'isActive')) {
    values.isActive = toBoolean(input.isActive, isCreate ? true : base.isActive)
  }

  // ── تفاوت با وضعیت قبلی ──
  const changedKeys: string[] = []
  const changed: Record<string, unknown> = {}
  for (const key of DOMAIN_KEYS) {
    if (sameValue(base[key], values[key])) continue
    changedKeys.push(key)
    changed[key] = values[key] instanceof Date ? (values[key] as Date).toISOString() : values[key]
  }

  return { fields, values, changed, changedKeys }
}

/**
 * ترتیب پایدار فیلدهای کالا.
 * به‌جای `Object.keys(encodeProduct())` از این فهرست استفاده می‌شود تا نام
 * کلیدها در لاگ حسابرسی خوانا بماند (آرایه بماند، نه رشتهٔ JSON) و مقایسهٔ
 * تغییرها هرگز به ترتیب تصادفی کلیدها وابسته نباشد.
 */
const DOMAIN_KEYS: (keyof ProductSnapshot)[] = [
  'slug',
  'name',
  'categorySlug',
  'brandSlug',
  'price',
  'compareAtPrice',
  'stock',
  'rating',
  'reviewCount',
  'shortDescription',
  'description',
  'highlights',
  'specs',
  'attributes',
  'images',
  'tags',
  'relatedSlugs',
  'videoUrl',
  'publishedAt',
  'isActive',
]

/**
 * تبدیل کالای پاک‌شده به شکل Prisma.
 * آرایه‌ها JSON متنی می‌شوند چون SQLite آرایه اسکالر ندارد و اسکیما عمداً
 * «بدون @db.* و بدون enum» است تا انتقال به PostgreSQL ساده بماند.
 */
export function encodeProduct(values: ProductSnapshot): Record<string, unknown> {
  return {
    slug: values.slug,
    name: values.name,
    categorySlug: values.categorySlug,
    brandSlug: values.brandSlug,
    price: values.price,
    compareAtPrice: values.compareAtPrice,
    stock: values.stock,
    rating: values.rating,
    reviewCount: values.reviewCount,
    shortDescription: values.shortDescription,
    description: values.description,
    highlights: JSON.stringify(values.highlights),
    specs: JSON.stringify(values.specs),
    attributes: JSON.stringify(values.attributes),
    images: JSON.stringify(values.images),
    tags: JSON.stringify(values.tags),
    relatedSlugs: JSON.stringify(values.relatedSlugs),
    videoUrl: values.videoUrl,
    publishedAt: values.publishedAt,
    isActive: values.isActive,
  }
}

/** دادهٔ ساخت کالای تازه برای Prisma */
export function toProductCreateData(values: ProductSnapshot): Prisma.ProductUncheckedCreateInput {
  return encodeProduct(values) as Prisma.ProductUncheckedCreateInput
}

/** دادهٔ ویرایش: فقط فیلدهای تغییرکرده، تا فیلدهای ارسال‌نشده دست‌نخورده بمانند */
export function toProductUpdateData(
  values: ProductSnapshot,
  changedKeys: string[],
): Prisma.ProductUncheckedUpdateInput {
  const encoded = encodeProduct(values)
  const data: Record<string, unknown> = {}
  for (const key of changedKeys) {
    if (key in encoded) data[key] = encoded[key]
  }
  return data as Prisma.ProductUncheckedUpdateInput
}

/** نام کنش حسابرسی بر پایه نوع تغییر */
export function productAuditAction(changed: Record<string, unknown>): string {
  const keys = Object.keys(changed)
  if (keys.length === 1 && keys[0] === 'isActive') {
    return changed.isActive ? 'product.activated' : 'product.deactivated'
  }
  return 'product.updated'
}
