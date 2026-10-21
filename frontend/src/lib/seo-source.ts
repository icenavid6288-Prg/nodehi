/**
 * هستهٔ مشترک سئو — بدون DOM و بدون وابستگی به React.
 *
 * هم فرانت‌اند (usePageMeta هنگام ناوبری کلاینتی) و هم اسکریپت
 * `scripts/prerender.mjs` (تولید HTML ایستا با tsx) از همین توابع استفاده
 * می‌کنند تا عنوان، توضیح و JSON-LD صفحات در هر دو مسیر «یکسان» بماند.
 */

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
// در اجرای Node (tsx هنگام پررندر) هم VITE_SITE_URL و هم SITE_URL خوانده می‌شود.
const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env

export const SITE_NAME = 'Nodehi'
export const SITE_NAME_FA = 'ندهی'
export const DEFAULT_DESCRIPTION =
  'خرید یخچال، ماشین لباسشویی، ظرفشویی، تلویزیون و کولر گازی اصل با گارانتی رسمی، ارسال سریع و پرداخت امن از فروشگاه نودهی.'
export const DEFAULT_KEYWORDS = [
  'خرید لوازم خانگی',
  'یخچال',
  'ماشین لباسشویی',
  'تلویزیون',
  'کولر گازی',
  'فروشگاه اینترنتی',
]
export const DEFAULT_OG_IMAGE = '/og-default.svg'

export function normalizeSiteUrl(url?: string | null): string {
  return String(url ?? '')
    .trim()
    .replace(/\/+$/u, '')
}

export const SITE_URL = normalizeSiteUrl(
  viteEnv?.VITE_SITE_URL ??
    viteEnv?.SITE_URL ??
    runtimeEnv?.VITE_SITE_URL ??
    runtimeEnv?.SITE_URL ??
    'http://localhost:3000',
)

/** نرمال‌سازی مسیر ورودی: اسلش انتهایی حذف و مسیر با / شروع می‌شود. */
export function normalizePath(path?: string | null): string {
  let value = String(path ?? '').trim()
  if (value === '') return '/'
  if (!value.startsWith('/')) value = `/${value}`
  return value.length > 1 ? value.replace(/\/+$/u, '') : value
}

/** مسیر canonical: اسلش انتهایی برای جلوگیری از محتوای تکراری. */
export function canonicalPath(slug?: string | null): string {
  const value = normalizePath(slug)
  return value === '/' ? '/' : `${value}/`
}

export function absoluteUrl(path?: string | null, base: string = SITE_URL): string {
  const origin = normalizeSiteUrl(base)
  const raw = String(path ?? '').trim()
  // اسلش انتهایی که canonicalPath می‌گذارد باید حفظ شود (جلوگیری از محتوای تکراری).
  const trailingSlash = raw.length > 1 && raw.endsWith('/')
  const normalized = normalizePath(raw)
  return normalized === '/' ? `${origin}/` : `${origin}${normalized}${trailingSlash ? '/' : ''}`
}

export function escapeHtml(value?: string | number | null): string {
  return String(value ?? '')
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#039;')
}

/** برچسب متا را «رشته» می‌سازد — اسکریپت پررندر همین‌ها را در <head> می‌گذارد. */
export function metaTag(
  name: string,
  content: string | number | null | undefined,
  { property = false }: { property?: boolean } = {},
): string {
  if (content == null || content === '') return ''
  const key = property ? 'property' : 'name'
  return `<meta ${key}="${escapeHtml(name)}" content="${escapeHtml(content)}">`
}

export function linkTag(
  rel: string,
  href: string,
  extra: Record<string, string> = {},
): string {
  const attrs = Object.entries(extra)
    .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
    .join('')
  return `<link rel="${escapeHtml(rel)}" href="${escapeHtml(href)}"${attrs}>`
}

export function scriptTagJsonLd(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</gu, '\\u003c')}</script>`
}

/* ------------------------------------------------------------------ */
/* توابع تولید JSON-LD (داده → شیء؛ رشته‌کردن بر عهدهٔ مصرف‌کننده است) */
/* ------------------------------------------------------------------ */

export function webSiteMetaJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: SITE_NAME_FA,
    url: absoluteUrl('/'),
    inLanguage: 'fa-IR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/shop')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    legalName: 'Nodehi Store',
    url: absoluteUrl('/'),
    logo: absoluteUrl('/logo.svg'),
    areaServed: 'IR',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: ['Persian', 'English'],
    },
  }
}

export type SeoBreadcrumb = { name: string; href?: string }

export function breadcrumbJsonLd(items: SeoBreadcrumb[]) {
  const usable = (items ?? []).filter((item) => item?.name)
  if (usable.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: usable.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      // آخرین آیتم آیتمِ مقصد است و schema.org می‌گوید itemِ آخر می‌تواند خالی باشد.
      ...(index < usable.length - 1 ? { item: absoluteUrl(item.href ?? '/') } : {}),
    })),
  }
}

export function webPageNode({
  title,
  description,
  path,
  breadcrumbs,
  extra = {},
}: {
  title: string
  description?: string
  path: string
  breadcrumbs?: SeoBreadcrumb[] | null
  extra?: Record<string, unknown>
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: description || undefined,
    url: absoluteUrl(path),
    inLanguage: 'fa-IR',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
    ...(breadcrumbs ? { breadcrumb: breadcrumbs } : {}),
    ...extra,
  }
}

export type SeoProduct = {
  slug: string
  name: string
  shortDescription?: string
  description?: string
  price?: number
  compareAtPrice?: number | null
  stock?: number
  rating?: number | null
  reviewCount?: number
  images?: (string | null)[] | null
  brand?: string | { name?: string } | null
  category?: string | { name?: string; slug?: string } | null
}

function refName(ref?: string | { name?: string } | null): string | undefined {
  if (!ref) return undefined
  return typeof ref === 'string' ? ref || undefined : ref.name || undefined
}

export function productJsonLd(product?: SeoProduct | null) {
  if (!product?.slug) return null

  const path = canonicalPath(`/product/${product.slug}`)
  const brandName = refName(product.brand)
  const categoryName = refName(product.category)
  const image = product.images?.[0] ?? undefined
  const price = product.price ?? undefined
  const available = product.stock == null ? true : product.stock > 0

  const offers =
    price == null
      ? undefined
      : {
          '@type': 'Offer',
          price,
          priceCurrency: 'IRR',
          availability: `https://schema.org/${available ? 'InStock' : 'OutOfStock'}`,
          url: absoluteUrl(path),
          ...(product.compareAtPrice
            ? {
                discount: {
                  '@type': 'Discount',
                  description: `تخفیف از ${formatNumber(product.compareAtPrice)} تومان`,
                },
              }
            : {}),
        }

  const aggregateRating =
    product.rating && product.reviewCount
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.reviewCount,
          bestRating: 5,
        }
      : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.slug,
    mpn: product.slug,
    description: product.shortDescription || product.description || undefined,
    image: image ? [image] : undefined,
    url: absoluteUrl(path),
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    category: categoryName,
    offers,
    aggregateRating,
  }
}

export type SeoArticle = {
  slug: string
  title: string
  excerpt: string
  category?: string
  categoryLabel?: string
  author?: string
  publishedAt?: string
  updatedAt?: string
  readingMinutes?: number
  keywords?: string[]
  images?: (string | null)[] | null
}

export function articleJsonLd(article?: SeoArticle | null, { path }: { path?: string } = {}) {
  if (!article?.slug) return null

  const url = absoluteUrl(path ?? canonicalPath(`/blog/${article.slug}`))
  const image = article.images?.[0] ?? DEFAULT_OG_IMAGE
  const publishedAt = article.publishedAt
  const updatedAt = article.updatedAt || publishedAt

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: [absoluteUrl(image)],
    author: {
      '@type': 'Person',
      name: article.author || `${SITE_NAME} Content Team`,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.svg') },
    },
    datePublished: publishedAt,
    dateModified: updatedAt,
    inLanguage: 'fa-IR',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }
}

export type SeoFaq = { question: string; answer: string; category?: string }

export function faqJsonLd(items?: SeoFaq[] | null) {
  const usable = (items ?? []).filter((item) => item?.question && item?.answer)
  if (usable.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: usable.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

/* -------------------------------------------------- */
/* سازنده‌های متادیتای کامل هر صفحه (SeoMeta)          */
/* -------------------------------------------------- */

export type SeoMeta = {
  title: string
  description: string
  keywords: string[]
  canonical: string
  image: string
  ogType: 'website' | 'article'
  jsonLd: unknown[]
}

function buildMeta({
  title,
  description,
  keywords = [],
  path,
  image,
  ogType = 'website',
  jsonLd = [],
}: {
  title: string
  description: string
  keywords?: string[]
  path: string
  image?: string
  ogType?: 'website' | 'article'
  jsonLd?: unknown[]
}): SeoMeta {
  return {
    title,
    description,
    keywords: [...new Set([...keywords, ...DEFAULT_KEYWORDS])].filter(Boolean).slice(0, 12),
    canonical: absoluteUrl(canonicalPath(path)),
    image: absoluteUrl(image ?? DEFAULT_OG_IMAGE),
    ogType,
    jsonLd: jsonLd.filter(Boolean),
  }
}

function withDefaults(nodes: unknown[]): unknown[] {
  return [webSiteMetaJsonLd(), organizationJsonLd(), ...nodes]
}

export function homeMeta(): SeoMeta {
  const title = `${SITE_NAME} | لوازم خانگی مطمئن، با گارانتی و ارسال سریع`
  return buildMeta({
    title,
    description: DEFAULT_DESCRIPTION,
    path: '/',
    keywords: ['ندهی', 'فروشگاه اینترنتی'],
    jsonLd: withDefaults([webPageNode({ title, description: DEFAULT_DESCRIPTION, path: '/' })]),
  })
}

export type SeoCategory = { slug: string; name: string; seoIntro?: string; description?: string }
export type SeoBrandPage = { slug: string; name: string; description?: string }

export function shopMeta({ category, brand }: { category?: SeoCategory; brand?: SeoBrandPage } = {}): SeoMeta {
  const crumbs: SeoBreadcrumb[] = [{ name: 'فروشگاه', href: '/shop' }]
  let title = 'خرید لوازم خانگی اصل | Nodehi'
  let description =
    'خرید آنلاین یخچال، ماشین لباسشویی، ظرفشویی، تلویزیون و کولر گازی با بهترین قیمت، گارانتی رسمی و ارسال سریع.'
  let path = '/shop'
  const nodes: unknown[] = []

  if (category) {
    title = `خرید ${category.name} | Nodehi`
    description =
      category.seoIntro ||
      `خرید ${category.name} با بهترین قیمت، ضمانت اصالت و ارسال سریع از ${SITE_NAME}.`
    path = `/category/${category.slug}`
    crumbs.push({ name: category.name, href: path })
    nodes.push(breadcrumbJsonLd([{ name: 'خانه', href: '/' }, ...crumbs]))
  } else if (brand) {
    title = `خرید ${brand.name} | Nodehi`
    description =
      brand.description || `خرید محصولات ${brand.name} با ضمانت اصالت و بهترین قیمت از ${SITE_NAME}.`
    path = `/brand/${brand.slug}`
    crumbs.push({ name: brand.name, href: path })
    nodes.push(breadcrumbJsonLd([{ name: 'خانه', href: '/' }, ...crumbs]))
  }

  nodes.push(webPageNode({ title, description, path }))

  return buildMeta({
    title,
    description,
    path,
    keywords: [category?.name, brand?.name].filter(Boolean) as string[],
    jsonLd: withDefaults(nodes),
  })
}

export function categoryMeta(category: SeoCategory): SeoMeta {
  return shopMeta({ category })
}

export function brandMeta(brand: SeoBrandPage): SeoMeta {
  return shopMeta({ brand })
}

export function productMeta(product: SeoProduct): SeoMeta {
  const path = canonicalPath(`/product/${product.slug}`)
  const categoryName = refName(product.category)
  const categorySlug =
    typeof product.category === 'object' && product.category ? product.category.slug : undefined
  const brandName = refName(product.brand)
  const description =
    product.shortDescription ||
    `${product.name}${brandName ? ` ${brandName}` : ''}${categoryName ? ` ${categoryName}` : ''} با ضمانت اصالت، بهترین قیمت و ارسال سریع از ${SITE_NAME}.`
  const crumbs: SeoBreadcrumb[] = [{ name: 'خانه', href: '/' }, { name: 'فروشگاه', href: '/shop' }]
  if (categoryName) {
    crumbs.push({ name: categoryName, href: categorySlug ? `/category/${categorySlug}` : '/shop' })
  }
  crumbs.push({ name: product.name, href: path })

  return buildMeta({
    title: `خرید ${product.name} | قیمت و مشخصات | Nodehi`,
    description,
    path,
    keywords: [product.name, brandName, categoryName].filter(Boolean) as string[],
    image: product.images?.[0] ?? undefined,
    jsonLd: withDefaults([
      productJsonLd(product),
      breadcrumbJsonLd(crumbs),
      webPageNode({ title: product.name, description, path }),
    ]),
  })
}

export function blogMeta(): SeoMeta {
  const path = '/blog'
  const title = 'راهنمای خرید و اخبار دنیای دیجیتال | بلاگ Nodehi'
  const description =
    'جدیدترین راهنماهای خرید، مقایسه محصولات و نکات نگهداری از گوشی، لپ‌تاپ و لوازم دیجیتال.'

  return buildMeta({
    title,
    description,
    path,
    keywords: ['راهنمای خرید', 'اخبار تکنولوژی', 'بلاگ'],
    jsonLd: withDefaults([
      webPageNode({ title, description, path }),
      breadcrumbJsonLd([{ name: 'خانه', href: '/' }, { name: 'بلاگ', href: path }]),
    ]),
  })
}

export function articleMeta(article: SeoArticle): SeoMeta {
  const path = canonicalPath(`/blog/${article.slug}`)
  const crumbs: SeoBreadcrumb[] = [
    { name: 'خانه', href: '/' },
    { name: 'بلاگ', href: '/blog' },
    { name: article.title, href: path },
  ]

  return buildMeta({
    title: `${article.title} | بلاگ Nodehi`,
    description: article.excerpt,
    path,
    keywords: article.keywords ?? [],
    image: article.images?.[0] ?? undefined,
    ogType: 'article',
    jsonLd: withDefaults([
      articleJsonLd(article),
      breadcrumbJsonLd(crumbs),
      webPageNode({ title: article.title, description: article.excerpt, path, breadcrumbs: crumbs }),
    ]),
  })
}

export function faqMeta(items: SeoFaq[] = [], categories: { label: string }[] = []): SeoMeta {
  const path = '/faq'
  const title = 'سوالات متداول خرید از ندهی | پشتیبانی Nodehi'
  const description =
    'پاسخ سوالات رایج درباره ثبت سفارش، ارسال، مرجوعی، گارانتی و پرداخت در فروشگاه ندهی.'

  return buildMeta({
    title,
    description,
    path,
    keywords: ['سوالات متداول', 'پشتیبانی', 'شرایط مرجوعی'],
    jsonLd: withDefaults([
      faqJsonLd(items),
      webPageNode({ title, description, path }),
      breadcrumbJsonLd([{ name: 'خانه', href: '/' }, { name: 'سوالات متداول', href: path }]),
      ...(categories.length
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: title,
              url: absoluteUrl(path),
              about: categories.map((c) => c.label).filter(Boolean),
            },
          ]
        : []),
    ]),
  })
}

export type SeoLegalPage = { slug: string; title: string; intro?: string }

export function legalMeta(page: SeoLegalPage): SeoMeta {
  const path = canonicalPath(`/${page.slug}`)
  const crumbs: SeoBreadcrumb[] = [{ name: 'خانه', href: '/' }, { name: page.title, href: path }]

  return buildMeta({
    title: `${page.title} | Nodehi`,
    description:
      page.intro || `${page.title} — متن کامل ${page.title} فروشگاه اینترنتی ${SITE_NAME}.`,
    path,
    keywords: [page.title],
    jsonLd: withDefaults([
      webPageNode({ title: page.title, description: page.intro, path, breadcrumbs: crumbs }),
      breadcrumbJsonLd(crumbs),
    ]),
  })
}

export type SeoLoyalty = { installments?: { label: string; interest: string }[] }

export function loyaltyMeta(loyalty?: SeoLoyalty | null): SeoMeta {
  const path = '/loyalty'
  const title = 'باشگاه مشتریان و اقساط ندهی | Nodehi'
  const description =
    'عضویت در باشگاه مشتریان ندهی: تخفیف پلکانی، امتیاز خرید و خرید اقساطی گوشی و لپ‌تاپ بدون بهره.'

  return buildMeta({
    title,
    description,
    path,
    keywords: ['باشگاه مشتریان', 'خرید اقساطی', 'تخفیف'],
    jsonLd: withDefaults([
      webPageNode({ title, description, path }),
      breadcrumbJsonLd([{ name: 'خانه', href: '/' }, { name: 'باشگاه مشتریان', href: path }]),
      ...(loyalty?.installments?.length
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'OfferCatalog',
              name: 'خرید اقساطی ندهی',
              itemListElement: loyalty.installments.map((item) => ({
                '@type': 'Offer',
                name: item.label,
                description: item.interest,
              })),
            },
          ]
        : []),
    ]),
  })
}

export function trackMeta(): SeoMeta {
  const path = '/track'
  const title = 'پیگیری سفارش | Nodehi'
  const description =
    'وضعیت سفارش خود را با شماره پیگیری و شماره موبایل به‌صورت آنلاین پیگیری کنید.'

  return buildMeta({
    title,
    description,
    path,
    keywords: ['پیگیری سفارش'],
    jsonLd: withDefaults([webPageNode({ title, description, path })]),
  })
}

export function guidesMeta(): SeoMeta {
  const path = '/guides'
  const title = 'راهنمای خرید لوازم خانگی | Nodehi'
  const description =
    'راهنمای گام‌به‌گام انتخاب یخچال، لباسشویی، ظرفشویی، تلویزیون و کولر گازی؛ ظرفیت، مصرف انرژی و گارانتی.'

  return buildMeta({
    title,
    description,
    path,
    keywords: ['راهنمای خرید', 'لوازم خانگی', 'مقایسه'],
    jsonLd: withDefaults([
      webPageNode({ title, description, path }),
      breadcrumbJsonLd([{ name: 'خانه', href: '/' }, { name: 'راهنمای خرید', href: path }]),
    ]),
  })
}

export function aboutMeta(): SeoMeta {
  const path = '/about'
  const title = 'درباره نودهی | فروشگاه اینترنتی لوازم خانگی'
  const description =
    'داستان نودهی، رویکرد ما به ضمانت اصالت کالا، گارانتی رسمی و خدمات پس از فروش لوازم خانگی.'

  return buildMeta({
    title,
    description,
    path,
    keywords: ['درباره نودهی', 'فروشگاه لوازم خانگی'],
    jsonLd: withDefaults([webPageNode({ title, description, path })]),
  })
}

export function brandsMeta(): SeoMeta {
  const path = '/brands'
  const title = 'برندهای لوازم خانگی | Nodehi'
  const description =
    'برندهای معتبر لوازم خانگی موجود در نودهی همراه با توضیح، مبدأ ساخت و لینک مشاهدهٔ کالاها.'

  return buildMeta({
    title,
    description,
    path,
    keywords: ['برندهای لوازم خانگی'],
    jsonLd: withDefaults([
      webPageNode({ title, description, path }),
      breadcrumbJsonLd([{ name: 'خانه', href: '/' }, { name: 'برندها', href: path }]),
    ]),
  })
}

export function contactMeta(): SeoMeta {
  const path = '/contact'
  const title = 'تماس با نودهی | پشتیبانی فروشگاه'
  const description =
    'راه‌های تماس با پشتیبانی نودهی، ساعات پاسخ‌گویی و فرم ارسال پیام برای مشاورهٔ خرید و پیگیری سفارش.'

  return buildMeta({
    title,
    description,
    path,
    keywords: ['تماس با ما', 'پشتیبانی'],
    jsonLd: withDefaults([webPageNode({ title, description, path })]),
  })
}

function formatNumber(value: number): string {
  try {
    return Number(value).toLocaleString('fa-IR')
  } catch {
    return String(value)
  }
}
