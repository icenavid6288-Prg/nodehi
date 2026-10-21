/**
 * لایهٔ کلاینت سئو — متادیتا را روی DOM نگه می‌دارد.
 *
 * سازنده‌های کامل (productMeta, articleMeta, …) در `seo-source.ts` زندگی می‌کنند
 * و بین کلاینت و اسکریپت پررندر مشترک‌اند؛ اینجا فقط رندر DOM انجام می‌شود.
 */
import { useEffect } from 'react'
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_NAME_FA,
  SITE_URL,
  absoluteUrl,
  articleJsonLd,
  articleMeta,
  blogMeta,
  brandMeta,
  breadcrumbJsonLd,
  canonicalPath,
  categoryMeta,
  escapeHtml,
  faqJsonLd,
  faqMeta,
  homeMeta,
  legalMeta,
  linkTag,
  loyaltyMeta,
  metaTag,
  normalizePath,
  normalizeSiteUrl,
  organizationJsonLd,
  productJsonLd,
  productMeta,
  scriptTagJsonLd,
  shopMeta,
  trackMeta,
  webPageNode,
  webSiteMetaJsonLd,
} from './seo-source'
import type { SeoMeta } from './seo-source'

export * from './seo-source'

/**
 * ورودی انعطاف‌پذیر usePageMeta — سازنده‌های seo-source همین شکلی‌اند
 * (SeoMeta یک PageMetaInput کامل است).
 */
export type PageMetaInput = {
  title: string
  description: string
  keywords?: string[]
  /** مسیر نسبی؛ canonical از آن ساخته می‌شود. */
  path?: string
  canonical?: string
  image?: string | null
  ogType?: 'website' | 'article'
  /** سازگاری با فراخوانی‌های قدیمی. */
  type?: 'website' | 'article' | 'product'
  robots?: 'index' | 'noindex'
  jsonLd?: unknown[]
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', rel)
    document.head.appendChild(tag)
  }
  tag.setAttribute('href', href)
}

function resolveInput(input: PageMetaInput) {
  const canonical =
    input.canonical ??
    (input.path ? absoluteUrl(canonicalPath(input.path)) : absoluteUrl(canonicalPath(window.location.pathname)))
  const ogType = input.ogType ?? (input.type === 'article' || input.type === 'product' ? 'article' : 'website')
  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords ?? [],
    canonical,
    image: input.image ? absoluteUrl(input.image) : absoluteUrl(DEFAULT_OG_IMAGE),
    ogType,
    robots: input.robots ?? 'index',
    jsonLd: (input.jsonLd ?? []).filter(Boolean),
  }
}

/**
 * متادیتای صفحهٔ جاری را روی DOM نگه می‌دارد؛ با ناوبری کلاینتی (کلیک داخلی)
 * صفحهٔ جدید عنوان، canonical و دادهٔ ساختاریافتهٔ خودش را می‌گیرد.
 */
export function usePageMeta(input: PageMetaInput | SeoMeta | null) {
  useEffect(() => {
    if (!input) return
    const meta = resolveInput(input as PageMetaInput)
    document.title = meta.title
    upsertMeta('name', 'description', meta.description)
    if (meta.keywords.length > 0) upsertMeta('name', 'keywords', meta.keywords.join(', '))
    upsertMeta('name', 'robots', meta.robots)
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:locale', 'fa_IR')
    upsertMeta('property', 'og:title', meta.title)
    upsertMeta('property', 'og:description', meta.description)
    upsertMeta('property', 'og:url', meta.canonical)
    upsertMeta('property', 'og:type', meta.ogType)
    upsertMeta('property', 'og:image', meta.image)
    upsertLink('canonical', meta.canonical)

    let script = document.head.querySelector<HTMLScriptElement>('script[data-seo-jsonld]')
    if (!script) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute('data-seo-jsonld', 'true')
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(meta.jsonLd)
  }, [input])
}

/** صفحه‌های داخلی (سبد خرید، پرداخت، حساب، ادمین) هرگز ایندکس نمی‌شوند. */
export function useNoindex(title: string, path?: string) {
  useEffect(() => {
    document.title = title
    upsertMeta('name', 'robots', 'noindex, nofollow')
    upsertLink('canonical', path ? absoluteUrl(canonicalPath(path)) : window.location.href)
    let script = document.head.querySelector<HTMLScriptElement>('script[data-seo-jsonld]')
    if (script) script.textContent = ''
  }, [title, path])
}

/** JSON-LD را داخل اسکریپت ایمن (بدون امکان شکستن HTML) قرار می‌دهد. */
export function jsonLdScript(data: unknown): string {
  return scriptTagJsonLd(data)
}

export {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_NAME_FA,
  SITE_URL,
  absoluteUrl,
  articleJsonLd,
  articleMeta,
  blogMeta,
  breadcrumbJsonLd,
  brandMeta,
  canonicalPath,
  categoryMeta,
  escapeHtml,
  faqJsonLd,
  faqMeta,
  homeMeta,
  legalMeta,
  linkTag,
  loyaltyMeta,
  metaTag,
  normalizePath,
  normalizeSiteUrl,
  organizationJsonLd,
  productJsonLd,
  productMeta,
  scriptTagJsonLd,
  shopMeta,
  trackMeta,
  webPageNode,
  webSiteMetaJsonLd,
}
export type { SeoMeta }
