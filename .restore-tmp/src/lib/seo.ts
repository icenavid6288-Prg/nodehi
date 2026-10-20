import type { Metadata } from 'next'
import { brand } from '@/config/brand'

import { faqs } from '@/lib/data/content'
import { articleCategoryLabels } from '@/lib/data/articles'
import type { Article, Product } from '@/types'

export function absoluteUrl(path = '/'): string {
  const base = brand.url.replace(/\/$/, '')
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
}

interface PageMetaInput {
  title: string
  description: string
  path: string
  keywords?: string[]
  image?: string
  type?: 'website' | 'article' | 'product'
  noIndex?: boolean
  publishedTime?: string
  modifiedTime?: string
}

/**
 * سازنده متادیتای صفحه.
 * قالب عنوان: «عنوان صفحه | نودهی» برای حفظ برند در نتایج گوگل.
 */
export function buildMetadata({
  title,
  description,
  path,
  keywords = [],
  image = '/og-default.svg',
  type = 'website',
  noIndex = false,
  publishedTime,
  modifiedTime,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path)

  return {
    title,
    description,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
        },
    openGraph: {
      title,
      description,
      url,
      siteName: brand.name,
      locale: 'fa_IR',
      type: type === 'product' ? 'website' : type,
      images: [{ url: absoluteUrl(image), width: 1200, height: 630, alt: title }],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl(image)],
    },
  }
}

/* ───────────────────────── اسکیما مارک‌آپ ───────────────────────── */

/** Organization — در ریشه سایت قرار می‌گیرد */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${brand.url}/#organization`,
    name: brand.name,
    alternateName: brand.nameEn,
    url: brand.url,
    description: brand.description,
    slogan: brand.tagline,
    telephone: brand.contact.phoneRaw,
    email: brand.contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: brand.contact.address,
      addressCountry: 'IR',
      postalCode: brand.contact.postalCode,
    },
    sameAs: Object.values(brand.social),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: brand.contact.phoneRaw,
        contactType: 'customer service',
        areaServed: 'IR',
        availableLanguage: ['fa'],
      },
    ],
  }
}

/** WebSite با قابلیت SearchAction — برای نمایش جعبه جستجو در گوگل */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${brand.url}/#website`,
    url: brand.url,
    name: brand.name,
    inLanguage: 'fa-IR',
    publisher: { '@id': `${brand.url}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${brand.url}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

/**
 * Product + AggregateRating — کلید سئوی صفحه محصول.
 *
 * نام دسته و برند از بیرون می‌آید چون آن‌ها حالا در دیتابیس هستند و این تابع
 * باید خالص بماند (در چند جا و در زمان build استفاده می‌شود).
 */
export function productSchema(
  product: Product,
  extra: { categoryName?: string; brandName?: string } = {},
) {
  const categoryName = extra.categoryName
  const availability =
    product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': absoluteUrl(`/product/${product.slug}#product`),
    name: product.name,
    description: product.shortDescription,
    sku: product.id,
    mpn: product.id,
    category: categoryName,
    brand: { '@type': 'Brand', name: extra.brandName ?? product.brand },
    image: product.images.length ? product.images.map((i) => absoluteUrl(i)) : [absoluteUrl('/og-default.svg')],
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(product.reviews.length
      ? {
          review: product.reviews.map((review) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: review.author },
            datePublished: review.date,
            name: review.title,
            reviewBody: review.body,
            reviewRating: {
              '@type': 'Rating',
              ratingValue: review.rating,
              bestRating: 5,
              worstRating: 1,
            },
          })),
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: 'IRR',
      price: product.price * 10, // تومان → ریال برای اسکیما
      priceValidUntil: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${brand.url}/#organization` },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IR',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      ...(product.attributes.warrantyMonths
        ? {
            warranty: {
              '@type': 'WarrantyPromise',
              durationOfWarranty: {
                '@type': 'QuantitativeValue',
                value: product.attributes.warrantyMonths,
                unitCode: 'MON',
              },
            },
          }
        : {}),
    },
  }
}

export function faqSchema(items: { question: string; answer: string }[] = faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

export function articleSchema(article: Article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    articleSection: articleCategoryLabels[article.category],
    keywords: article.keywords.join(', '),
    inLanguage: 'fa-IR',
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: article.author, url: brand.url },
    publisher: { '@id': `${brand.url}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/blog/${article.slug}`) },
  }
}

/** ItemList — برای صفحات دسته‌بندی و لیست محصولات */
export function itemListSchema(products: Product[], name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(`/product/${product.slug}`),
      name: product.name,
    })),
  }
}

/** Store با ساعات کاری و شعبه‌ها — سئوی محلی */
export function storeSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${brand.url}/#store`,
    name: brand.name,
    image: absoluteUrl('/og-default.svg'),
    url: brand.url,
    telephone: brand.contact.phoneRaw,
    priceRange: '$$$',
    currenciesAccepted: 'IRR',
    paymentAccepted: 'کارت بانکی، پرداخت درب منزل، اقساط',
    openingHours: 'Sa-Th 09:00-21:00',
    department: [
      { '@type': 'Store', name: 'فروش لوازم خانگی' },
      { '@type': 'Store', name: 'خدمات پس از فروش' },
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: brand.contact.address,
      addressCountry: 'IR',
      postalCode: brand.contact.postalCode,
    },
    geo: { '@type': 'GeoCoordinates', latitude: 35.7448, longitude: 51.3753 },
    areaServed: brand.branches.map((b) => ({ '@type': 'City', name: b.city })),
  }
}
