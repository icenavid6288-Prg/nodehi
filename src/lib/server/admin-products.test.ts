import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ATTRIBUTES,
  isValidSlug,
  parseAttributes,
  parseProductInput,
  parseSpecs,
  productAuditAction,
  slugify,
  toProductCreateData,
  type ProductSnapshot,
} from './admin-products'

/**
 * کاتالوگ تا پیش از این آرایه ثابت در کد بود؛ حالا کالا از پنل ساخته و حذف
 * می‌شود. پس این آزمون‌ها روی سه چیز تمرکز دارند: جلوگیری از دادهٔ نامعتبر،
 * یکتایی نامک، و اینکه ویرایش جزئی، فیلدهای دیگر را پاک نکند.
 */

const CATEGORIES = ['refrigerator', 'washer']
const BRANDS = ['samsung', 'lg']

/** کالای موجود نمونه — پایهٔ آزمون‌های ویرایش */
function snapshot(overrides: Partial<ProductSnapshot> = {}): ProductSnapshot {
  const attributes = { ...DEFAULT_ATTRIBUTES, color: 'نقره‌ای', brand: 'samsung', ...overrides.attributes }
  return {
    slug: 'samsung-side-by-side-rs68',
    name: 'یخچال ساید بای ساید سامسونگ',
    categorySlug: 'refrigerator',
    brandSlug: 'samsung',
    price: 89_000_000,
    compareAtPrice: 96_500_000,
    stock: 6,
    rating: 4.7,
    reviewCount: 128,
    shortDescription: 'ساید بای ساید با یخ‌ساز خودکار و کمپرسور اینورتر.',
    description: 'توضیح کامل کالا.',
    highlights: ['یخ‌ساز خودکار'],
    specs: [{ label: 'ظرفیت', value: '۶۹۰ لیتر', group: 'technical' }],
    images: ['/images/products/refrigerator.svg'],
    tags: ['یخچال'],
    relatedSlugs: [],
    videoUrl: null,
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    isActive: true,
    ...overrides,
    // بعد از `overrides` می‌آید تا ویژگی‌های ادغام‌شده جایگزین نشوند
    attributes,
  }
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'ماشین لباسشویی ال‌جی ۹ کیلویی',
    categorySlug: 'washer',
    brandSlug: 'lg',
    price: '45000000',
    shortDescription: 'لباسشویی ۹ کیلویی با موتور اینورتر و گارانتی.',
    ...overrides,
  }
}

describe('slugify', () => {
  it('نام فارسی را به نامک لاتین تبدیل می‌کند', () => {
    const slug = slugify('یخچال ساید بای ساید سامسونگ')
    expect(slug).toMatch(/^[a-z0-9-]+$/)
    expect(slug.startsWith('ykhchal')).toBe(true)
    expect(isValidSlug(slug)).toBe(true)
  })

  it('ارقام فارسی را لاتین می‌کند و نشانه‌ها را به خط تیره بدل می‌کند', () => {
    expect(slugify('یخچال ۲۸ فوت (مدل RS68)')).toContain('28')
    expect(slugify('a/b c')).toBe('a-b-c')
  })

  it('خط تیره تکراری و ابتدا/انتها را پاک می‌کند', () => {
    expect(slugify('  ---  یخچال ---  ')).toBe('ykhchal')
  })

  it('برای متنی که نویسه لاتین ندارد رشته خالی برمی‌گرداند', () => {
    expect(slugify('!!!')).toBe('')
  })
})

describe('parseProductInput — ساخت کالا', () => {
  it('ورودی کامل را می‌پذیرد و نامک می‌سازد', () => {
    const { fields, values } = parseProductInput(createInput(), {
      mode: 'create',
      categorySlugs: CATEGORIES,
      brandSlugs: BRANDS,
    })
    expect(fields).toEqual({})
    expect(values.price).toBe(45_000_000)
    expect(isValidSlug(values.slug)).toBe(true)
    expect(values.stock).toBe(0)
    expect(values.isActive).toBe(true)
  })

  it('نام، قیمت، دسته و برند الزامی‌اند', () => {
    const { fields } = parseProductInput({}, { mode: 'create', categorySlugs: CATEGORIES, brandSlugs: BRANDS })
    expect(fields.name).toBeTruthy()
    expect(fields.price).toBeTruthy()
    expect(fields.categorySlug).toBeTruthy()
    expect(fields.brandSlug).toBeTruthy()
    expect(fields.shortDescription).toBeTruthy()
  })

  it('دسته یا برند ناموجود را رد می‌کند', () => {
    const { fields } = parseProductInput(createInput({ categorySlug: 'airplane', brandSlug: 'nokia' }), {
      mode: 'create',
      categorySlugs: CATEGORIES,
      brandSlugs: BRANDS,
    })
    expect(fields.categorySlug).toBeTruthy()
    expect(fields.brandSlug).toBeTruthy()
  })

  it('قیمت پیش از تخفیف کمتر از قیمت فروش را رد می‌کند', () => {
    const { fields } = parseProductInput(createInput({ price: '45000000', compareAtPrice: '40000000' }), {
      mode: 'create',
      categorySlugs: CATEGORIES,
      brandSlugs: BRANDS,
    })
    expect(fields.compareAtPrice).toBeTruthy()
  })

  it('قیمت صفر را می‌پذیرد (یعنی «تماس بگیرید»)', () => {
    const { fields, values } = parseProductInput(createInput({ price: '0' }), {
      mode: 'create',
      categorySlugs: CATEGORIES,
      brandSlugs: BRANDS,
    })
    expect(fields.price).toBeUndefined()
    expect(values.price).toBe(0)
  })

  it('نامک تکراری را با پسوند عددی یکتا می‌کند', () => {
    const { values } = parseProductInput(createInput({ slug: 'lg-washer-9kg' }), {
      mode: 'create',
      categorySlugs: CATEGORIES,
      brandSlugs: BRANDS,
      takenSlugs: new Set(['lg-washer-9kg', 'lg-washer-9kg-2']),
    })
    expect(values.slug).toBe('lg-washer-9kg-3')
  })

  it('نامک نامعتبر را رد می‌کند', () => {
    const { fields } = parseProductInput(createInput({ slug: 'یخچال سامسونگ' }), {
      mode: 'create',
      categorySlugs: CATEGORIES,
      brandSlugs: BRANDS,
    })
    expect(fields.slug).toBeTruthy()
  })

  it('آدرس تصویر نامعتبر را گزارش می‌کند', () => {
    const { fields } = parseProductInput(createInput({ images: ['/ok.png', 'javascript:alert(1)'] }), {
      mode: 'create',
      categorySlugs: CATEGORIES,
      brandSlugs: BRANDS,
    })
    expect(fields.images).toContain('javascript:alert(1)')
  })

  it('امتیاز بیرون از بازه ۰ تا ۵ را رد می‌کند', () => {
    const { fields } = parseProductInput(createInput({ rating: '7' }), {
      mode: 'create',
      categorySlugs: CATEGORIES,
      brandSlugs: BRANDS,
    })
    expect(fields.rating).toBeTruthy()
  })
})

describe('parseProductInput — ویرایش کالا', () => {
  const options = { mode: 'update' as const, categorySlugs: CATEGORIES, brandSlugs: BRANDS }

  it('فقط فیلدهای تغییرکرده را علامت می‌زند', () => {
    const { fields, changedKeys, values } = parseProductInput({ price: '92000000' }, {
      ...options,
      existing: snapshot(),
    })
    expect(fields).toEqual({})
    expect(changedKeys).toEqual(['price'])
    expect(values.price).toBe(92_000_000)
    expect(values.stock).toBe(6)
  })

  it('بدون تغییر، هیچ فیلدی ثبت نمی‌شود', () => {
    const existing = snapshot()
    const { changedKeys } = parseProductInput({ name: existing.name, price: String(existing.price) }, {
      ...options,
      existing,
    })
    expect(changedKeys).toEqual([])
  })

  it('ویرایش جزئی ویژگی‌ها، ابعاد ذخیره‌شده را پاک نمی‌کند', () => {
    const existing = snapshot({
      attributes: { ...DEFAULT_ATTRIBUTES, brand: 'samsung', widthCm: 91, heightCm: 178, depthCm: 73 },
    })
    const { fields, values } = parseProductInput({ attributes: { color: 'سفید' } }, { ...options, existing })
    expect(fields).toEqual({})
    expect(values.attributes.color).toBe('سفید')
    expect(values.attributes.widthCm).toBe(91)
    expect(values.attributes.heightCm).toBe(178)
    expect(values.attributes.depthCm).toBe(73)
  })

  it('قیمت پیش از تخفیف خالی، آن را پاک می‌کند', () => {
    const { values, changed } = parseProductInput({ compareAtPrice: '' }, { ...options, existing: snapshot() })
    expect(values.compareAtPrice).toBeNull()
    expect(changed.compareAtPrice).toBeNull()
  })

  it('نامک کالای موجود را یکتا نمی‌سازد (تغییر عمدی مدیر)', () => {
    const existing = snapshot()
    const { values } = parseProductInput({ slug: 'samsung-rs68' }, {
      ...options,
      existing,
      takenSlugs: new Set(['samsung-rs68']),
    })
    expect(values.slug).toBe('samsung-rs68')
  })

  it('موجودی و قیمت را از ورودی فارسی/با جداکننده می‌خواند', () => {
    const { values } = parseProductInput({ stock: '۱۲', price: '۹۲,۰۰۰,۰۰۰' }, {
      ...options,
      existing: snapshot(),
    })
    expect(values.stock).toBe(12)
    expect(values.price).toBe(92_000_000)
  })
})

describe('parseAttributes', () => {
  it('کلیدهای غایب را از مقدار قبلی نگه می‌دارد', () => {
    const fallback = { ...DEFAULT_ATTRIBUTES, color: 'مشکی', warrantyMonths: 18 }
    const result = parseAttributes({ readyToShip: true }, fallback)
    expect(result.color).toBe('مشکی')
    expect(result.warrantyMonths).toBe(18)
    expect(result.readyToShip).toBe(true)
  })

  it('واحد ظرفیت و رده انرژی ناشناخته را نادیده می‌گیرد', () => {
    const result = parseAttributes({ capacityUnit: 'گالن', energyRating: 'Z' }, DEFAULT_ATTRIBUTES)
    expect(result.capacityUnit).toBeNull()
    expect(result.energyRating).toBeNull()
  })
})

describe('parseSpecs', () => {
  it('ردیف‌های ناقص را حذف می‌کند و گروه ناشناخته را عمومی می‌کند', () => {
    expect(parseSpecs([{ label: 'ظرفیت', value: '۶۹۰ لیتر', group: 'نامعلوم' }])).toEqual([
      { label: 'ظرفیت', value: '۶۹۰ لیتر', group: 'general' },
    ])
    expect(parseSpecs([{ label: 'ظرفیت', value: '' }])).toEqual([])
    expect(parseSpecs('نه آرایه')).toEqual([])
  })
})

describe('toProductCreateData', () => {
  it('آرایه‌ها را به JSON متنی تبدیل می‌کند (SQLite آرایه اسکالر ندارد)', () => {
    const { values } = parseProductInput(createInput({ highlights: 'نکته اول\nنکته دوم', tags: 'الف\nب' }), {
      mode: 'create',
      categorySlugs: CATEGORIES,
      brandSlugs: BRANDS,
    })
    const data = toProductCreateData(values) as Record<string, unknown>
    expect(JSON.parse(String(data.highlights))).toEqual(['نکته اول', 'نکته دوم'])
    expect(JSON.parse(String(data.tags))).toEqual(['الف', 'ب'])
    expect(JSON.parse(String(data.attributes))).toMatchObject({ brand: 'lg' })
  })
})

describe('productAuditAction', () => {
  it('تغییر تنها وضعیت، کنش جداگانه می‌گیرد', () => {
    expect(productAuditAction({ isActive: false })).toBe('product.deactivated')
    expect(productAuditAction({ isActive: true })).toBe('product.activated')
  })

  it('تغییرهای دیگر ویرایش شمرده می‌شوند', () => {
    expect(productAuditAction({ price: 1000 })).toBe('product.updated')
    expect(productAuditAction({ price: 1000, isActive: false })).toBe('product.updated')
  })
})
