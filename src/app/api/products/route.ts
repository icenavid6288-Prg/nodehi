import { buildFacets } from '@/lib/data/queries'
import { parseShopSearchParams } from '@/lib/filters'
import { getBrands, getProductsBySlugs, queryProducts } from '@/lib/server/catalog'
import { jsonOk } from '@/lib/server/http'
import { serializeProduct } from '@/lib/server/serializers'

/** پاسخ بر اساس پارامترهای درخواست ساخته می‌شود، پس کش استاتیک ندارد */
export const dynamic = 'force-dynamic'

/**
 * فهرست محصولات با فیلتر پیشرفته.
 * GET /api/products?q=یخچال&category=refrigerator&brand=samsung&sort=price-asc&page=1
 *
 * همان پارسر صفحه فروشگاه استفاده می‌شود تا API و UI هرگز از هم جدا نشوند.
 * این مسیر برای مصرف n8n، مارکت‌پلیس‌ها (ترب/دیجی‌کالا) و اپ موبایل طراحی شده است.
 *
 * حالت دوم — دریافت چند کالا با نامک:
 * GET /api/products?slugs=samsung-side-by-side-rs68-28ft,lg-french-door-gr-x267
 *
 * این حالت برای سبد خرید، علاقه‌مندی و مقایسه لازم است: آن‌ها در مرورگر فقط
 * نامک نگه می‌دارند و نام و قیمت و موجودی باید از دیتابیس بیاید. پاسخ این حالت
 * محصول کامل است (شامل مشخصات و ویژگی‌ها) چون جدول مقایسه به همان‌ها نیاز دارد.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)

  const slugsParam = (url.searchParams.get('slugs') ?? '').trim()
  if (slugsParam) {
    const slugs = [...new Set(slugsParam.split(',').map((slug) => slug.trim()).filter(Boolean))].slice(0, 50)
    const items = await getProductsBySlugs(slugs)
    return jsonOk({ total: items.length, items })
  }

  const rawParams: Record<string, string> = {}
  for (const [key, value] of url.searchParams.entries()) {
    rawParams[key] = value
  }

  const state = parseShopSearchParams(rawParams)
  const matched = await queryProducts(state.filters)

  // صفحه‌بندی روی نتیجه فیلترشده اعمال می‌شود
  const pageCount = Math.max(1, Math.ceil(matched.length / state.perPage))
  const page = Math.min(state.page, pageCount)
  const start = (page - 1) * state.perPage
  const pageItems = matched.slice(start, start + state.perPage)

  // گزینه‌های فیلتر با شمارش واقعی — برای ساخت UI فیلتر روی کلاینت
  const facets = buildFacets(matched)
  const brands = await getBrands()
  const brandNames = Object.fromEntries(brands.map((brand) => [brand.slug, brand.name]))

  return jsonOk({
    total: matched.length,
    page,
    perPage: state.perPage,
    pageCount,
    sort: state.filters.sort,
    query: state.filters.q,
    items: pageItems.map((product) => serializeProduct(product, brandNames)),
    facets: {
      brands: facets.brands.map((option) => ({
        ...option,
        label: brandNames[option.value] ?? option.value,
      })),
      colors: facets.colors,
      energyRatings: facets.energyRatings,
      capacities: facets.capacities,
      priceRange: facets.priceRange,
    },
  })
}
