/** @type {import('next').NextConfig} */

/**
 * هدرهای امنیتی پایه.
 * CSP در حالت گزارش‌دهی (Report-Only) فعال است تا با Next.js و سرویس‌های
 * خارجی (درگاه پرداخت، چت‌بات، آپلود تصویر) تعارض نداشته باشد.
 * پس از پیکربندی دامنه‌های نهایی، آن را به حالت اجباری تغییر دهید.
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob: https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https:",
      "frame-src 'self' https:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' https:",
    ].join('; '),
  },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // مخزن تصاویر (آروان/لیارا) — بعداً با دامنه نهایی جایگزین شود
      { protocol: 'https', hostname: '**.arvanstorage.ir' },
      { protocol: 'https', hostname: '**.liara.space' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
