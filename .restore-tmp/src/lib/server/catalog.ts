import { cache } from 'react'
import type { Prisma } from '@prisma/client'
import { isDbNotReadyError, prisma } from '@/lib/db'
import {
  allColors as allColorsPure,
  brandNameMap,
  buildFacets,
  categoryCounts as categoryCountsPure,
  categoryNameMap,
  discountedProducts as discountedPure,
  bestSellers as bestSellersPure,
  getProductsBySlugs as bySlugsPure,
  newArrivals as newArrivalsPure,
  queryProducts as queryPure,
  readyToShipProducts as readyToShipPure,
  relatedProducts as relatedPure,
  searchSuggestions as suggestionsPure,
  type CatalogData,
  type ProductFacets,
  type SearchSuggestion,
} from '@/lib/data/queries'
import { DEFAULT_ATTRIBUTES, type ProductSnapshot } from '@/lib/server/admin-products'
import type {
  Brand,
  CatalogMeta,
  Category,
  CategorySlug,
  Product,
  ProductAttributes,
  SpecItem,
} from '@/types'

export type { CatalogMeta }

/**
 * لایهٔ دیتابیس کاتالوگ.
 *
 * کاتالوگ پیش‌تر یک آرایهٔ ثابت در کد بود؛ حالا جدول‌های `Product`، `Category`
 * و `Brand` منبع حقیقت‌اند و پنل مدیریت روی همان‌ها کار می‌کند. این ماژول
 * ردیف‌های دیتابیس را به همان شکل دامنهٔ قبلی (`Product`، `Category`، `Brand`)
 * تبدیل می‌کند تا بقیهٔ کد — از فیلتر فروشگاه تا اسکیمای سئو — دست‌نخورده بماند.
 *
 * کش: هر تابع با `cache` بسته شده، پس در **یک درخواست** چند بار خواندن
 * کاتالوگ فقط یک کوئری می‌زند (صفحه محصول هم محصول، هم مشابه‌ها و هم برند را
 * می‌خواهد). این کش بین درخواست‌ها مشترک نیست؛ به‌روزرسانی پس از ویرایش پنل با
 * `revalidatePath` انجام می‌شود.
 */

/** تفسیر امن JSON متنی — داده خرابِ دست‌کاری‌شده نباید کل فروشگاه را ۵۰۰ کند */
function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    const value = JSON.parse(raw)
    if (value === null || value === undefined) return fallback
    return value as T
  } catch {
    return fallback
  }
}

export type ProductRow = Prisma.ProductGetPayload<Record<string, never>>

/**
 * ردیف دیتابیس → کالای خام (بدون فیلدهای مشتق).
 *
 * پنل مدیریت برای ویرایش به همین شکل خام نیاز دارد (نامک دسته و برند،
 * نه نام نمایشی). `toProduct` روی همین ساخته می‌شود تا تبدیل JSON و مقادیر
 * پیش‌فرض در یک جا انجام شود و دو مسیر از هم جدا نشوند.
 */
export function toProductSnapshot(row: ProductRow): ProductSnapshot {
  const attributes = parseJson<Partial<ProductAttributes>>(row.attributes, {})
  return {
    slug: row.slug,
    name: row.name,
    categorySlug: row.categorySlug,
    brandSlug: row.brandSlug,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    stock: row.stock,
    rating: row.rating,
    reviewCount: row.reviewCount,
    shortDescription: row.shortDescription,
    description: row.description,
    highlights: parseJson<string[]>(row.highlights, []),
    specs: parseJson<SpecItem[]>(row.specs, []),
    attributes: { ...DEFAULT_ATTRIBUTES, ...attributes, brand: row.brandSlug },
    images: parseJson<string[]>(row.images, []),
    videoUrl: row.videoUrl,
    tags: parseJson<string[]>(row.tags, []),
    relatedSlugs: parseJson<string[]>(row.relatedSlugs, []),
    publishedAt: row.publishedAt,
    isActive: row.isActive,
  }
}

function toProduct(row: ProductRow): Product {
  const snapshot = toProductSnapshot(row)
  return {
    id: row.id,
    slug: snapshot.slug,
    name: snapshot.name,
    category: snapshot.categorySlug as CategorySlug,
    brand: snapshot.brandSlug,
    price: snapshot.price,
    compareAtPrice: snapshot.compareAtPrice,
    stock: snapshot.stock,
    rating: snapshot.rating,
    reviewCount: snapshot.reviewCount,
    shortDescription: snapshot.shortDescription,
    description: snapshot.description,
    highlights: snapshot.highlights,
    specs: snapshot.specs,
    attributes: snapshot.attributes,
    images: snapshot.images,
    videoUrl: snapshot.videoUrl,
    tags: snapshot.tags,
    // نظرهای تودرتو حذف شده‌اند: نظرها جدول Review دارند و صفحه محصول
    // همان‌ها را با صف بازبینی نمایش می‌دهد (تا دو منبع حقیقت نسازیم)
    reviews: [],
    relatedSlugs: snapshot.relatedSlugs,
    publishedAt: row.publishedAt.toISOString(),
  }
}

type CategoryRow = Prisma.CategoryGetPayload<Record<string, never>>

function toCategory(row: CategoryRow): Category {
  return {
    slug: row.slug as CategorySlug,
    name: row.name,
    nameEn: row.nameEn,
    description: row.description,
    seoIntro: row.seoIntro,
    icon: row.icon as CategorySlug,
    featured: row.featured,
  }
}

type BrandRow = Prisma.BrandGetPayload<Record<string, never>>

function toBrand(row: BrandRow): Brand {
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.nameEn,
    origin: row.origin,
    description: row.description,
    featured: row.featured,
  }
}

/** دسته‌های فعال، به ترتیب نمایش در منو */
export const getCategories = cache(async (options: { includeInactive?: boolean } = {}): Promise<Category[]> => {
  try {
    const rows = await prisma.category.findMany({
      where: options.includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return rows.map(toCategory)
  } catch (error) {
    // سایت هنوز نصب نشده — خالی برگرد تا صفحه /install بالا بیاید
    if (isDbNotReadyError(error)) return []
    throw error
  }
})

/** برندهای فعال، به ترتیب نمایش */
export const getBrands = cache(async (options: { includeInactive?: boolean } = {}): Promise<Brand[]> => {
  try {
    const rows = await prisma.brand.findMany({
      where: options.includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return rows.map(toBrand)
  } catch (error) {
    if (isDbNotReadyError(error)) return []
    throw error
  }
})

/**
 * محصولات فروشگاه.
 * `includeInactive` برای پنل مدیریت است؛ فروشگاه فقط فعال‌ها را می‌بیند
 * (حذف نرم: رکورد می‌ماند تا سفارش‌های قدیمی سالم بمانند).
 */
export const getAdminCatalog = cache(async (): Promise<CatalogData> => {
  try {
    const [products, categories, brands] = await Promise.all([
      prisma.product.findMany({ orderBy: [{ createdAt: 'desc' }] }),
      getCategories({ includeInactive: true }),
      getBrands({ includeInactive: true }),
    ])
    return { products: products.map(toProduct), categories, brands }
  } catch (error) {
    if (isDbNotReadyError(error)) return { products: [], categories: [], brands: [] }
    throw error
  }
})

export const getCatalog = cache(async (): Promise<CatalogData> => {
  try {
    const [products, categories, brands] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true }, orderBy: [{ createdAt: 'desc' }] }),
      getCategories(),
      getBrands(),
    ])
    return { products: products.map(toProduct), categories, brands }
  } catch (error) {
    // پیش از نصب (جدول‌ها ساخته نشده) خالی برمی‌گردد تا قالب و /install رندر شوند
    if (isDbNotReadyError(error)) return { products: [], categories: [], brands: [] }
    throw error
  }
})

/** یک محصول با نامک — `undefined` اگر نبود یا غیرفعال باشد */
export const getProduct = cache(async (slug: string, options: { includeInactive?: boolean } = {}) => {
  const catalog = options.includeInactive ? await getAdminCatalog() : await getCatalog()
  return catalog.products.find((product) => product.slug === slug)
})

/** یک دسته با نامک */
export const getCategory = cache(async (slug: string, options: { includeInactive?: boolean } = {}) => {
  const categories = await getCategories(options)
  return categories.find((category) => category.slug === slug)
})

/** نام فارسی برند از نامک؛ در نبود آن، همان نامک برگردانده می‌شود */
export const getBrandName = cache(async (slug: string): Promise<string> => {
  const brands = await getBrands()
  return brands.find((brand) => brand.slug === slug)?.name ?? slug
})

/**
 * فرادادهٔ سبک کاتالوگ برای کامپوننت‌های کلاینتی (هدر، فیلتر، کارت محصول).
 * این داده‌ها کوچک‌اند و در هر صفحه لازم می‌شوند، پس یک‌بار در پوسته خوانده و
 * به مرورگر پاس داده می‌شوند تا منو و برچسب‌ها بدون پرش رندر شوند.
 */
export const getCatalogMeta = cache(async (): Promise<CatalogMeta> => {
  const catalog = await getCatalog()
  return {
    categories: catalog.categories,
    brands: catalog.brands,
    counts: categoryCountsPure(catalog),
    brandNames: brandNameMap(catalog),
    categoryNames: categoryNameMap(catalog),
    popularSlugs: bestSellersPure(catalog, 8).map((product) => product.slug),
  }
})

// ─────────────────────────────────────────────────────────────────
// پوشش‌های async روی توابع خالص — همان نام‌های قبلی، حالا دیتابیس‌محور
// ─────────────────────────────────────────────────────────────────

export async function queryProducts(filters: Parameters<typeof queryPure>[1] = {}) {
  return queryPure(await getCatalog(), filters)
}

export async function relatedProducts(product: Product, limit = 4) {
  return relatedPure(await getCatalog(), product, limit)
}

export async function bestSellers(limit = 8) {
  return bestSellersPure(await getCatalog(), limit)
}

export async function newArrivals(limit = 8) {
  return newArrivalsPure(await getCatalog(), limit)
}

export async function discountedProducts(limit = 8) {
  return discountedPure(await getCatalog(), limit)
}

export async function readyToShipProducts(limit = 24) {
  return readyToShipPure(await getCatalog(), limit)
}

export async function getProductsBySlugs(slugs: string[], options: { includeInactive?: boolean } = {}) {
  const catalog = options.includeInactive ? await getAdminCatalog() : await getCatalog()
  return bySlugsPure(catalog, slugs)
}

/**
 * نگاشت نامک به محصول برای چند نامک معلوم.
 *
 * در صفحه‌های فهرستی (سفارش‌های من، نظرات، هشدارهای موجودی) ده‌ها نامک مختلف
 * لازم می‌شود؛ خواندن تک‌تک آن‌ها یعنی ده‌ها کوئری. اینجا یک‌بار کاتالوگ خوانده
 * و فقط نامک‌های خواسته‌شده برگردانده می‌شوند.
 *
 * `includeInactive` برای پنل مدیریت و تاریخچهٔ سفارش‌هاست: کالای نرم‌حذف‌شده
 * باید در سفارش قدیمی همچنان دیده شود.
 */
export async function productIndex(
  slugs: string[],
  options: { includeInactive?: boolean } = {},
): Promise<Record<string, Product>> {
  const catalog = options.includeInactive ? await getAdminCatalog() : await getCatalog()
  const wanted = new Set(slugs.filter(Boolean))
  const index: Record<string, Product> = {}
  for (const product of catalog.products) {
    if (wanted.has(product.slug)) index[product.slug] = product
  }
  return index
}

export async function categoryCounts() {
  return categoryCountsPure(await getCatalog())
}

export async function searchSuggestions(query: string, limit = 7): Promise<SearchSuggestion[]> {
  return suggestionsPure(await getCatalog(), query, limit)
}

export async function allColors() {
  return allColorsPure(await getCatalog())
}

/** گزینه‌های فیلتر برای یک نتیجهٔ مشخص — منطق خالص، داده از دیتابیس */
export async function facetsFor(products: Product[]): Promise<ProductFacets> {
  return buildFacets(products)
}
