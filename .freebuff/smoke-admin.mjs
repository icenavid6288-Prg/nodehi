/** آزمون دود API مدیریت روی سرور زنده. */

const base = 'http://127.0.0.1:8000/api'
let failures = 0

async function call(label, path, init = {}, expected = 200) {
  const res = await fetch(base + path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  const ok = res.status === expected
  if (!ok) failures++
  console.log(`${ok ? '✓' : '✗'} ${label} — ${res.status} (انتظار ${expected})`)
  if (!ok) console.log('   ', JSON.stringify(body).slice(0, 300))
  return body
}

const otp = await call('admin otp', '/auth/otp/request', {
  method: 'POST',
  body: JSON.stringify({ phone: '09120000000' }),
})
const verify = await call('admin verify', '/auth/otp/verify', {
  method: 'POST',
  body: JSON.stringify({ phone: '09120000000', code: otp.devCode }),
})
const auth = { Authorization: `Bearer ${verify.token}` }

const stats = await call('stats', '/admin/stats', { headers: auth })
await call('products list', '/admin/products?perPage=5', { headers: auth })

const slug = 'admin-smoke-' + Date.now().toString(36)
const created = await call(
  'create product',
  '/admin/products',
  {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      name: 'کالای آزمون پنل',
      slug,
      category: 'refrigerator',
      brand: 'samsung',
      price: 12300000,
      stock: 3,
      shortDescription: 'برای آزمون دود پنل مدیریت ساخته شده است.',
      highlights: ['آزمون'],
      specs: [{ label: 'ظرفیت', value: '۱۰ فوت' }],
      tags: ['آزمون'],
      images: [],
      relatedSlugs: [],
      isActive: true,
    }),
  },
  201
)

await call(
  'patch product',
  `/admin/products/${slug}`,
  {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ name: 'کالای آزمون ویرایش‌شده', isActive: false }),
  },
  200
)

await call('unauthorized admin', '/admin/stats', {}, 401)

// سفارش موجود: وضعیت را به processing و سپس cancelled ببر و موجودی برگردد.
const orders = await call('orders list', '/admin/orders?perPage=5', { headers: auth })
const target = orders.items.find((order) => order.status === 'pending')

if (target) {
  await call(
    'order to processing',
    `/admin/orders/${target.orderNumber}`,
    { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'processing' }) },
    200
  )
  await call(
    'order to cancelled',
    `/admin/orders/${target.orderNumber}`,
    { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'cancelled' }) },
    200
  )
} else {
  console.log('• سفارش pending برای آزمون انتقال وضعیت پیدا نشد (رد شد).')
}

const audit = await call('audit list', '/admin/audit', { headers: auth })
await call(
  'delete product',
  `/admin/products/${slug}`,
  { method: 'DELETE', headers: auth },
  200
)

console.log('---')
console.log('stats:', JSON.stringify(stats.products), 'orders:', stats.orders.total)
console.log('created:', created?.product?.slug)
console.log('audit total:', audit.total, '| first action:', audit.items?.[0]?.action)
console.log(failures === 0 ? '\nهمه بررسی‌های مدیریت موفق بود.' : `\n${failures} بررسی ناموفق.`)
process.exit(failures === 0 ? 0 : 1)
