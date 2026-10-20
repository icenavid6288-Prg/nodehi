import type { MetadataRoute } from 'next'
import { brand } from '@/config/brand'

/**
 * robots.txt.
 * مسیرهای پویا و بدون ارزش سئو (پنل کاربری، سبد خرید، تسویه حساب، API و
 * صفحات جستجوی فیلترشده) از خزش خارج می‌شوند تا بودجه خزش هدر نرود.
 */
export default function robots(): MetadataRoute.Robots {
  const base = brand.url.replace(/\/$/, '')

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/account',
          '/account/',
          '/cart',
          '/checkout',
          '/compare',
          '/shop?*sort=',
          '/shop?*page=',
          '/*?q=',
          '/*?utm_',
        ],
      },
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
