/**
 * تست خروجی پررندر: اسکریپت واقعی (build + پررندر) اجرا می‌شود و خروجی dist
 * با «همان» سازنده‌های متادیتایی که کلاینت استفاده می‌کند مقایسه می‌شود.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  SITE_URL,
  articleMeta,
  faqMeta,
  homeMeta,
  legalMeta,
  loyaltyMeta,
  productMeta,
  shopMeta,
} from '../frontend/src/lib/seo-source'

const repoRoot = resolve(__dirname, '..')
const frontendDir = join(repoRoot, 'frontend')
const distDir = join(frontendDir, 'dist')
const targets = JSON.parse(
  readFileSync(join(frontendDir, 'src/data/prerender-targets.json'), 'utf8'),
)

function readPage(path: string): string {
  const file = path === '/' ? join(distDir, 'index.html') : join(distDir, path.replace(/^\//, ''), 'index.html')
  return readFileSync(file, 'utf8')
}

function titleOf(html: string): string {
  const match = html.match(/<title>([^<]*)<\/title>/u)
  return match ? match[1] : ''
}

beforeAll(() => {
  // build کامل + پررندر؛ همان دستوری که کاربر نهایی اجرا می‌کند.
  execFileSync('node', ['scripts/prerender.mjs'], { cwd: frontendDir, stdio: 'inherit' })
}, 300_000)

describe('پررندر — متادیتا هم‌ارز با کلاینت', () => {
  it('عنوان صفحهٔ خانه دقیقاً با homeMeta یکی است', () => {
    expect(titleOf(readPage('/'))).toBe(homeMeta().title)
  })

  it('هر محصول عنوان، canonical و JSON-LD هم‌ارز productMeta دارد', () => {
    const products = targets.products as any[]
    expect(products.length).toBeGreaterThan(0)

    for (const product of products) {
      const html = readPage(`/product/${product.slug}`)
      const meta = productMeta(product)
      expect(titleOf(html)).toBe(meta.title)
      expect(html).toContain(`<link rel="canonical" href="${meta.canonical}">`)

      const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gsu)].map(
        (m) => JSON.parse(m[1]),
      )
      const productNode = jsonLd.find((node: any) => node['@type'] === 'Product')
      expect(productNode, `Product JSON-LD برای ${product.slug}`).toBeTruthy()
      expect(productNode.offers.priceCurrency).toBe('IRR')
      expect(productNode.offers.price).toBe(product.price)
    }
  })

  it('مقاله‌ها og:type=article و JSON-LD مقاله دارند', () => {
    for (const article of targets.articles as any[]) {
      const html = readPage(`/blog/${article.slug}`)
      expect(titleOf(html)).toBe(articleMeta(article).title)
      expect(html).toContain('<meta property="og:type" content="article">')
      expect(html).toContain('"@type":"Article"')
    }
  })

  it('صفحه سوالات FAQPage و آکاردئون <details> (بدون JS) دارد', () => {
    const html = readPage('/faq')
    const meta = faqMeta(targets.faqs, targets.faqCategories)
    expect(titleOf(html)).toBe(meta.title)
    expect(html).toContain('"@type":"FAQPage"')
    expect(html).toContain('<details')
    expect(html).toContain((targets.faqs as any[])[0].question)
  })

  it('صفحه وفاداری جدول‌های مشترک را با JSON-LD اقساط رندر کرده است', () => {
    const html = readPage('/loyalty')
    expect(titleOf(html)).toBe(loyaltyMeta(targets.loyalty).title)
    expect(html).toContain('"@type":"OfferCatalog"')
    expect(html).toContain((targets.loyalty as any).tiers[0].name)
  })

  it('صفحات حقوقی عنوان و بخش‌های سند را دارند', () => {
    for (const page of targets.legal as any[]) {
      const html = readPage(`/${page.slug}`)
      expect(titleOf(html)).toBe(legalMeta(page).title)
      expect(html).toContain(page.sections[0].title)
    }
  })

  it('صفحات دسته و برند عنوان shopMeta را دارند', () => {
    for (const category of targets.categories as any[]) {
      expect(titleOf(readPage(`/category/${category.slug}`))).toBe(shopMeta({ category }).title)
    }
    for (const brand of targets.brands as any[]) {
      expect(titleOf(readPage(`/brand/${brand.slug}`))).toBe(shopMeta({ brand }).title)
    }
  })
})

describe('پررندر — خروجی‌های استاندارد', () => {
  it('sitemap همه صفحات index-follow را با اسلش انتهایی دارد و فایل‌ها موجودند', () => {
    const sitemap = readFileSync(join(distDir, 'sitemap.xml'), 'utf8')
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((m) => m[1])
    expect(locs.length).toBeGreaterThan(20)

    for (const loc of locs) {
      expect(loc.startsWith(`${SITE_URL}/`) || loc === `${SITE_URL}/`).toBe(true)
      const path = loc.slice(SITE_URL.length).replace(/\/$/u, '') || '/'
      const file =
        path === '/' ? join(distDir, 'index.html') : join(distDir, path.replace(/^\//, ''), 'index.html')
      expect(existsSync(file), `فایل صفحه برای ${loc}`).toBe(true)
    }
    // صفحات noindex (کارت، پرداخت، حساب) نباید در سایتماپ باشند
    expect(sitemap).not.toContain('/cart')
    expect(sitemap).not.toContain('/checkout')
    expect(sitemap).not.toContain('/account')
  })

  it('robots.txt به سایتمپ مطلق اشاره می‌کند', () => {
    const robots = readFileSync(join(distDir, 'robots.txt'), 'utf8')
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
    expect(robots).toContain('User-agent: *')
  })

  it('هر صفحه فقط یک تگ title دارد و پوستهٔ SPA برای هیدریشن باقی مانده است', () => {
    const html = readPage(`/product/${(targets.products as any[])[0].slug}`)
    expect(html.match(/<title>/gu)!.length).toBe(1)
    expect(html).toContain('<div id="root">')
    expect(html).toMatch(/<script[^>]+src="[^"]*assets\//u)
  })

  it('لینک‌های داخل صفحات خام (بدون JS) هستند', () => {
    const html = readPage('/')
    expect(html).toContain('href="/shop/"')
    expect(html).toMatch(/href="\/product\/[^"]+\/"/u)
    expect(html).toMatch(/href="\/category\/[^"]+\/"/u)
  })

  it('404.html پوستهٔ SPA را برای fallback سرور دارد', () => {
    const notFound = readFileSync(join(distDir, '404.html'), 'utf8')
    expect(notFound).toContain('<div id="root"></div>')
  })

  it('عنوان صفحات تکراری نیست', () => {
    const titles = new Set<string>()
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(join(dir, entry.name))
        else if (entry.name === 'index.html') titles.add(titleOf(readFileSync(join(dir, entry.name), 'utf8')))
      }
    }
    walk(distDir)
    expect(titles.size).toBeGreaterThan(20)
  })
})
