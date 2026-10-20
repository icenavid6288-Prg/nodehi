#!/usr/bin/env node
/**
 * آزمون دود API لاراول — بدون وابستگی به کتابخانه تست.
 *
 *   node scripts/smoke-api.mjs [baseUrl]
 *
 * هر بررسی وضعیت HTTP مورد انتظار را می‌سنجد و در پایان کد خروج غیرصفر
 * برمی‌گرداند اگر چیزی شکسته باشد.
 */

const base = process.argv[2] ?? 'http://127.0.0.1:8000/api'
let failures = 0

async function check(label, path, expected, init = {}) {
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) },
    })
    const text = await response.text()
    const ok = response.status === expected
    if (!ok) failures += 1
    console.log(`${ok ? '✓' : '✗'} ${label} — ${response.status} (انتظار ${expected})`)
    return { status: response.status, body: text ? JSON.parse(text) : null }
  } catch (error) {
    failures += 1
    console.log(`✗ ${label} — خطای شبکه: ${error.message}`)
    return { status: 0, body: null }
  }
}

const health = await check('health', '/health', 200)
const products = await check('products', '/products?perPage=5', 200)
await check('product detail', '/products/pars-khazar-tea-maker-3l', 200)
const categories = await check('categories', '/categories', 200)
const brands = await check('brands', '/brands', 200)
await check('search', '/search?q=' + encodeURIComponent('یخچال'), 200)
await check('settings', '/settings/public', 200)
const methods = await check('payment methods', '/payments/methods', 200)
await check('reviews list', '/products/pars-khazar-tea-maker-3l/reviews', 200)
await check('contact create', '/contact', 201, {
  method: 'POST',
  body: JSON.stringify({ name: 'آزمون', phone: '09120000000', subject: 'تست', message: 'پیام آزمون دود' }),
})
await check('stock alert create', '/stock-alerts', 201, {
  method: 'POST',
  body: JSON.stringify({ productSlug: 'pars-khazar-tea-maker-3l', phone: '09120000001' }),
})
const articles = await check('articles', '/articles', 200)
await check('article detail', '/articles/how-to-choose-refrigerator', 200)
await check('article not found', '/articles/no-such-article', 404)
const faqs = await check('faqs', '/faqs', 200)
await check('legal index', '/legal', 200)
await check('legal page', '/legal/terms', 200)
await check('legal not found', '/legal/no-such-page', 404)
const loyalty = await check('loyalty', '/loyalty', 200)
await check('checkout validation', '/checkout', 422, { method: 'POST', body: JSON.stringify({ items: [] }) })
await check('track not found', '/orders/track', 404, {
  method: 'POST',
  body: JSON.stringify({ orderNumber: 'ND-000000-XXXXXX', phone: '09120000000' }),
})
await check('otp wrong code', '/auth/otp/verify', 422, {
  method: 'POST',
  body: JSON.stringify({ phone: '09120000002', code: '00000' }),
})

if (health.body?.ok) console.log(`\n  catalogSize = ${health.body.catalogSize}`)
if (products.body?.ok) console.log(`  محصولات = ${products.body.total}`)
if (categories.body?.ok) console.log(`  دسته‌ها = ${categories.body.items.length}`)
if (brands.body?.ok) console.log(`  برندها = ${brands.body.items.length}`)
if (methods.body?.ok) console.log(`  روش‌های پرداخت = ${methods.body.items.length}`)
if (articles.body?.ok) console.log(`  مقالات = ${articles.body.total}`)
if (faqs.body?.ok) console.log(`  پرسش‌های متداول = ${faqs.body.total}`)
if (loyalty.body?.ok) console.log(`  سطوح باشگاه مشتریان = ${loyalty.body.tiers.length}`)

console.log(failures === 0 ? '\nهمه بررسی‌ها موفق بود.\n' : `\n${failures} بررسی ناموفق.\n`)
process.exit(failures === 0 ? 0 : 1)
