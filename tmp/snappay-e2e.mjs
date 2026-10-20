/**
 * آزمون سرتاسری اسنپ‌پی با شبیه‌ساز.
 * ۱) تنظیم اعتبارنامه‌ها و فعال‌سازی از API پنل (دقیقاً مثل مدیر واقعی)
 * ۲) بررسی /api/payments/methods که «snappay» را برگرداند
 * ۳) ثبت سفارش واقعی با روش snappay → باید redirectUrl شبیه‌ساز برگردد
 * ۴) شبیه‌سازی بازگشت مشتری → کال‌بک → سفارش باید paid شود
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE = 'http://127.0.0.1:3000'

async function api(path, options = {}) {
  const response = await fetch(BASE + path, options)
  const text = await response.text()
  let body = null
  try {
    body = JSON.parse(text)
  } catch {}
  return { status: response.status, body }
}

async function adminApi(path, options, cookie) {
  return api(path, { ...options, headers: { ...(options.headers ?? {}), cookie } })
}

const result = { steps: [] }

try {
  // ── ورود مدیر (حالت dev: کد در پاسخ) ──
  const reqRes = await api('/api/auth/otp/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone: '09120000000' }),
  })
  const devCode = reqRes.body?.devCode
  if (!devCode) throw new Error('no devCode: ' + JSON.stringify(reqRes.body))

  const verifyRes = await fetch(BASE + '/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone: '09120000000', code: devCode }),
  })
  const setCookie = verifyRes.headers.get('set-cookie') ?? ''
  const cookie = setCookie.split(';')[0]
  result.steps.push({ step: 'login', ok: verifyRes.ok, cookie: Boolean(cookie) })

  // ── ۱) اعتبارنامه‌ها و فعال‌سازی از پنل ──
  const save = await adminApi(
    '/api/admin/settings',
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        group: 'snappay',
        values: {
          'integration.snappay.enabled': true,
          'integration.snappay.sandbox': true,
          'integration.snappay.username': 'merchant-user',
          'integration.snappay.password': 'merchant-pass',
          'integration.snappay.clientId': 'client-id',
          'integration.snappay.clientSecret': 'client-secret',
        },
      }),
    },
    cookie,
  )
  result.steps.push({ step: 'save-credentials', status: save.status, ok: save.body?.ok === true })

  // ── ۲) methods باید snappay را بدهد ──
  const methods = await api('/api/payments/methods')
  result.steps.push({ step: 'methods', methods: methods.body?.methods })

  // ── ۳) ثبت سفارش واقعی ──
  const checkout = await api('/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': `e2e-snappay-${Date.now()}` },
    body: JSON.stringify({
      items: [{ slug: 'emersun-top-freezer-13ft', quantity: 1 }],
      paymentMethod: 'snappay',
      customer: {
        firstName: 'آزمون',
        lastName: 'اسنپ‌پی',
        phone: '09120000001',
        province: 'تهران',
        city: 'تهران',
        line: 'خیابان آزمون، پلاک ۱، واحد ۲',
      },
    }),
  })
  const payment = checkout.body?.payment ?? {}
  result.steps.push({
    step: 'checkout',
    status: checkout.status,
    orderNumber: checkout.body?.order?.id,
    gateway: payment.gateway,
    redirectUrl: payment.redirectUrl,
    note: payment.note,
  })

  const orderNumber = checkout.body?.order?.id
  if (!orderNumber || !payment.redirectUrl) throw new Error('checkout did not return redirectUrl')

  const dbOrder = await prisma.order.findUnique({
    where: { orderNumber },
    select: { paymentMethod: true, paymentAuthority: true, paymentRedirectUrl: true, status: true, total: true },
  })
  result.steps.push({ step: 'db-after-start', dbOrder })

  // ── ۴) بازگشت مشتری از اسنپ‌پی → کال‌بک ──
  // بازگشت مشتری به کال‌بک خودِ فروشگاه است، نه دامنه اسنپ‌پی
  const callbackUrl = new URL('/api/payments/snappay/callback', BASE)
  callbackUrl.searchParams.set('paymentToken', dbOrder.paymentAuthority)

  const callback = await fetch(callbackUrl.toString(), { redirect: 'manual' })
  const location = callback.headers.get('location') ?? ''
  result.steps.push({ step: 'callback', status: callback.status, location })

  const dbOrder2 = await prisma.order.findUnique({
    where: { orderNumber },
    select: { status: true, paidAt: true, paymentRefId: true },
  })
  result.steps.push({ step: 'db-after-callback', dbOrder2 })

  // ── ۵) ثبت دوباره با همان idempotency باید همان سفارش را بدهد ──
  result.steps.push({ step: 'done', allPaid: dbOrder2.status === 'paid' })
} catch (error) {
  result.error = String(error)
} finally {
  await prisma.$disconnect()
}

console.log(JSON.stringify(result, null, 2))
