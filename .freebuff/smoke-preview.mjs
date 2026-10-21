/** آزمون دود پیش‌نمایش — API زنده روی پورت ۸۰۰۰. */

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
  return { status: res.status, body, headers: res.headers }
}

const health = await call('health', '/health')
const products = await call('products', '/products?perPage=3')
const articles = await call('articles', '/articles')
const faqs = await call('faqs', '/faqs')
const terms = await call('legal terms', '/legal/terms')
const loyalty = await call('loyalty', '/loyalty')
const otp = await call('otp request', '/auth/otp/request', {
  method: 'POST',
  body: JSON.stringify({ phone: '۰۹۱۲۱۲۳۴۵۶۷' }),
})
const verify = await call('otp verify', '/auth/otp/verify', {
  method: 'POST',
  body: JSON.stringify({ phone: '09121234567', code: otp.body.devCode }),
})
const token = verify.body.token

const order = await call(
  'authenticated checkout',
  '/checkout',
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [{ slug: 'pars-khazar-tea-maker-3l', quantity: 2 }],
      firstName: 'مینا',
      lastName: 'احمدی',
      phone: '09121234567',
      province: 'تهران',
      city: 'تهران',
      line: 'خیابان ولیعصر، پلاک ۱۲',
      paymentMethod: 'cod',
      couponCode: 'NODEHI10',
      idempotencyKey: crypto.randomUUID(),
    }),
  },
  201
)

await call('account orders after login', '/account/orders', {
  headers: { Authorization: `Bearer ${token}` },
})

const track = order.body?.order?.orderNumber?.toLowerCase()
await call('track (lowercase + +98 phone)', '/orders/track', {
  method: 'POST',
  body: JSON.stringify({ orderNumber: track, phone: '+989121234567' }),
})

const badPhone = await call(
  'invalid phone message',
  '/checkout',
  {
    method: 'POST',
    body: JSON.stringify({
      items: [{ slug: 'pars-khazar-tea-maker-3l', quantity: 1 }],
      firstName: 'مینا',
      lastName: 'احمدی',
      phone: '123',
      province: 'تهران',
      city: 'تهران',
      line: 'خیابان ولیعصر، پلاک ۱۲',
      paymentMethod: 'cod',
    }),
  },
  422
)

const review1 = await call(
  'guest review 1',
  '/products/pars-khazar-tea-maker-3l/reviews',
  {
    method: 'POST',
    body: JSON.stringify({ rating: 5, title: 'عالی', body: 'کیفیت ساخت خوب بود و سریع رسید.' }),
  },
  201
)
await call(
  'guest review 2',
  '/products/pars-khazar-tea-maker-3l/reviews',
  {
    method: 'POST',
    body: JSON.stringify({ rating: 4, title: 'خوب', body: 'ارزش خرید دارد اما بسته‌بندی ساده بود.' }),
  },
  201
)

// محدودیت نرخ OTP: سه درخواست مجاز، چهارمی باید ۴۲۹ شود.
const throttlePhone = '09129999999'
const statuses = []
for (let i = 0; i < 4; i++) {
  const res = await fetch(base + '/auth/otp/request', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: throttlePhone }),
  })
  statuses.push(res.status)
}
const throttled = statuses.slice(0, 3).every((s) => s === 200) && statuses[3] === 429
if (!throttled) failures++
console.log(`${throttled ? '✓' : '✗'} otp throttle — ${statuses.join(',')} (انتظار 200,200,200,429)`)

const nosniff = health.headers.get('x-content-type-options') === 'nosniff'
if (!nosniff) failures++
console.log(`${nosniff ? '✓' : '✗'} security header X-Content-Type-Options`)

const persianError = /شماره همراه/.test(JSON.stringify(badPhone.body))
if (!persianError) failures++
console.log(`${persianError ? '✓' : '✗'} پیام اعتبارسنجی فارسی`)

console.log('---')
console.log('catalogSize:', health.body.catalogSize, '| products:', products.body.total)
console.log('articles:', articles.body.total, '| faqs:', faqs.body.total, '| terms sections:', terms.body.page.sections.length)
console.log('loyalty tiers:', loyalty.body.tiers.length)
console.log('order:', order.body?.order?.orderNumber, '| total:', order.body?.order?.total)
console.log('review ids:', review1.body?.review?.id)
console.log(failures === 0 ? '\nهمه بررسی‌ها موفق بود.' : `\n${failures} بررسی ناموفق.`)
process.exit(failures === 0 ? 0 : 1)
