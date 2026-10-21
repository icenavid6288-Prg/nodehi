#!/usr/bin/env node
/**
 * به‌روزرسانی فهرست اسلاگ‌های عمومی کاتالوگ در prerender-targets.json.
 *
 * اسلاگ‌های محصول/دسته/برند «داده» هستند (کنترل‌شدهٔ همین سیستم‌اند) و مثل
 * مقالات/سوالات در ریپو نگه داشته می‌شوند؛ این اسکریپت آن‌ها را از API زنده
 * تازه می‌کند. اجرا: PRERENDER_API_BASE=http://localhost:8000 node scripts/prerender-refresh.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'

const apiBase = (process.env.PRERENDER_API_BASE ?? 'http://localhost:8000').replace(/\/+$/u, '')
const targetsPath = new URL('../src/data/prerender-targets.json', import.meta.url)

async function apiJson(path) {
  const response = await fetch(`${apiBase}/api${path}`)
  if (!response.ok) {
    throw new Error(`API ${path} → HTTP ${response.status} (${apiBase})`)
  }
  return response.json()
}

const [categoryRes, brandRes, listRes] = await Promise.all([
  apiJson('/categories'),
  apiJson('/brands'),
  apiJson('/products?perPage=100&sort=newest'),
])

const categoryName = new Map(categoryRes.items.map((c) => [c.slug, c.name]))
const brandName = new Map(brandRes.items.map((b) => [b.slug, b.name]))

const products = []
for (const summary of listRes.items) {
  const detail = await apiJson(`/products/${encodeURIComponent(summary.slug)}`)
  const p = detail.product
  products.push({
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    stock: p.stock,
    rating: p.rating,
    reviewCount: p.reviewCount,
    images: p.images,
    brand: { name: brandName.get(p.brand) ?? p.brand, slug: p.brand },
    category: { name: categoryName.get(p.category) ?? p.category, slug: p.category },
    highlights: p.highlights,
    specs: p.specs,
  })
}

const targets = JSON.parse(readFileSync(targetsPath, 'utf8'))
targets.products = products
targets.categories = categoryRes.items.map((c) => ({
  slug: c.slug,
  name: c.name,
  nameEn: c.nameEn,
  seoIntro: c.seoIntro,
  description: c.description,
  count: c.count,
}))
targets.brands = brandRes.items.map((b) => ({
  slug: b.slug,
  name: b.name,
  nameEn: b.nameEn,
  origin: b.origin,
  description: b.description,
}))

writeFileSync(targetsPath, `${JSON.stringify(targets, null, 2)}\n`)
console.log(
  `✓ targets به‌روز شد: ${products.length} محصول، ${targets.categories.length} دسته، ${targets.brands.length} برند`,
)
