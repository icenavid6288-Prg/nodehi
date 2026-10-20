import type { MetadataRoute } from 'next'
import { brand } from '@/config/brand'

/** مانیفست PWA — نصب سایت روی موبایل به‌عنوان اپلیکیشن */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — ${brand.tagline}`,
    short_name: brand.name,
    description: brand.description,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F6F8FA',
    theme_color: '#0F2A43',
    lang: 'fa-IR',
    dir: 'rtl',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'کالاهای آماده ارسال', url: '/ready-to-ship' },
      { name: 'پیگیری سفارش', url: '/account/orders' },
      { name: 'سبد خرید', url: '/cart' },
    ],
  }
}
