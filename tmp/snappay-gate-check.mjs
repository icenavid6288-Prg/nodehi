/** بررسی دروازه فعال‌سازی: غیرفعال از پنل → حذف از methods و ۴۰۰ در checkout؛ فعال دوباره → برگشت */
const BASE = 'http://127.0.0.1:3000'

async function api(path, options = {}) {
  const response = await fetch(BASE + path, options)
  const text = await response.text()
  let body = null
  try {
    body = JSON.parse(text)
  } catch {}
  return { status: response.status, body, raw: text }
}

// ورود
const reqRes = await api('/api/auth/otp/request', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ phone: '09120000000' }),
})
const devCode = reqRes.body?.devCode
if (!devCode) throw new Error('no devCode: ' + reqRes.raw)
const verifyRes = await fetch(BASE + '/api/auth/otp/verify', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ phone: '09120000000', code: devCode }),
})
const cookie = (verifyRes.headers.get('set-cookie') ?? '').split(';')[0]

const setEnabled = (enabled) =>
  api('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ group: 'snappay', values: { 'integration.snappay.enabled': enabled } }),
  })

const checkoutSnappay = () =>
  api('/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      items: [{ slug: 'emersun-top-freezer-13ft', quantity: 1 }],
      paymentMethod: 'snappay',
      customer: {
        firstName: 'آزمون',
        lastName: 'دروازه',
        phone: '09120000002',
        province: 'تهران',
        city: 'تهران',
        line: 'خیابان آزمون، پلاک ۲',
      },
    }),
  })

const out = {}

// ۱) غیرفعال کردن از پنل
const off = await setEnabled(false)
out.disable = { status: off.status, ok: off.body?.ok === true }

const methodsOff = await api('/api/payments/methods')
out.methodsWhenDisabled = methodsOff.body?.methods

const checkoutOff = await checkoutSnappay()
out.checkoutWhenDisabled = { status: checkoutOff.status, message: checkoutOff.body?.message }

// ۲) فعال کردن دوباره
const on = await setEnabled(true)
out.enable = { status: on.status, ok: on.body?.ok === true }

const methodsOn = await api('/api/payments/methods')
out.methodsWhenEnabled = methodsOn.body?.methods

const checkoutOn = await checkoutSnappay()
out.checkoutWhenEnabled = { status: checkoutOn.status, gateway: checkoutOn.body?.payment?.gateway }

// قضاوت نهایی
out.passed =
  out.disable.ok === true &&
  !out.methodsWhenDisabled?.includes('snappay') &&
  checkoutOff.status === 400 &&
  out.enable.ok === true &&
  out.methodsWhenEnabled?.includes('snappay') &&
  checkoutOn.status === 201

console.log(JSON.stringify(out, null, 2))
process.exit(out.passed ? 0 : 1)
