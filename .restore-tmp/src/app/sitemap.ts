import type { MetadataRoute } from 'next'
import { brand } from '@/config/brand'
import { articles } from '@/lib/data/articles'
import { getBrands, getCatalog, getCategories } from '@/lib/server/catalog'

/**
 * سایت‌مپ پویا.
 * دسته‌ها، برندها و محصولات از دیتابیس خوانده می‌شوند، پس کالای تازه‌ای که از
 * پنل مدیریت اضافه شود در سایت‌مپ هم می‌آید.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = brand.url.replace(/\/$/, '')
  const now = new Date()
  const [categories, brands, catalog] = await Promise.all([
    getCategories(),
    getBrands(),
    getCatalog(),
  ])
  const products = catalog.products

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/ready-to-ship`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/loyalty`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/brands`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // صفحه اختصاصی هر دسته (نه نسخه query-string) — تا یکی‌سازی سئو و کنونیکال درست بماند
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${base}/category/${category.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const brandPages: MetadataRoute.Sitemap = brands.map((item) => ({
    url: `${base}/brand/${item.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${base}/product/${product.slug}`,
    lastModified: new Date(product.publishedAt),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${base}/blog/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...staticPages, ...categoryPages, ...brandPages, ...productPages, ...articlePages]
}
