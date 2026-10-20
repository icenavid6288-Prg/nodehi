import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const __dir = dirname(fileURLToPath(import.meta.url))
const BASE = 'http://127.0.0.1:3000'

async function api(path, options = {}) {
  const response = await fetch(BASE + path, options)
  const text = await response.text()
  let body = null
  try { body = JSON.parse(text) } catch {}
  const headers = {}
  response.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })
  return { status: response.status, body, text, headers }
}

const slug = process.argv[2] ?? 'emersun-top-freezer-13ft'

// login
let reqRes = await api('/api/auth/otp/request', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ phone: '09120000000' }),
})
const devCode = reqRes.body?.devCode
console.log('devCode:', devCode)
if (!devCode) throw new Error('no devCode')

let verifyRes = await api('/api/auth/otp/verify', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ phone: '09120000000', code: devCode }),
})
const setCookie = verifyRes.headers['set-cookie'] ?? ''
const cookie = setCookie.split(';')[0]
console.log('login ok:', verifyRes.status, 'cookie:', !!cookie)

// checkout
const checkout = await api('/api/checkout', {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({
    items: [{ slug, quantity: 1 }],
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
console.log('checkout status:', checkout.status)
console.log('checkout body:', checkout.text.slice(0, 1200))
