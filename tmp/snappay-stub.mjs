/**
 * شبیه‌ساز API اسنپ‌پی برای آزمون سرتاسری محلی.
 * جریان واقعی را دنبال می‌کند: OAuth با Basic → توکن ساخت تراکنش →
 * verify → settle. توکن‌های ساخته‌شده در حافظه نگه داشته می‌شوند.
 */
import http from 'node:http'

const PORT = Number(process.env.STUB_PORT ?? 9999)
const paymentTokens = new Map()
const verified = new Set()

function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      // OAuth — Basic client:secret + grant_type=password
      if (url.pathname.endsWith('/oauth/token')) {
        const auth = req.headers.authorization ?? ''
        if (!auth.startsWith('Basic ')) return json(res, 401, { error: 'invalid_client' })
        expectBasic(auth.slice(6))
        const form = new URLSearchParams(body)
        if (form.get('grant_type') !== 'password' || form.get('scope') !== 'online-merchant') {
          return json(res, 400, { status: 'error', message: 'grant نادرست' })
        }
        return json(res, 200, { access_token: 'stub-bearer-1', expires_in: 3600 })
      }

      // بقیه مسیرها Bearer می‌خواهند
      if (req.headers.authorization !== 'Bearer stub-bearer-1') {
        return json(res, 401, { status: 'error', message: 'توکن نامعتبر' })
      }

      if (url.pathname.endsWith('/payment/v1/token')) {
        const data = JSON.parse(body)
        if (!Array.isArray(data.cartList) || data.cartList.length === 0) {
          return json(res, 200, { status: 'error', message: 'cartList خالی' })
        }
        const paymentToken = `stub-${data.transactionId}-${String(Math.random()).slice(2, 8)}`
        paymentTokens.set(paymentToken, { ...data, verified: false, settled: false })
        return json(res, 200, { paymentToken })
      }

      if (url.pathname.endsWith('/payment/v1/verify')) {
        const data = JSON.parse(body)
        const record = paymentTokens.get(data.paymentToken)
        if ((record ?? null) === null || record === undefined) {
          return json(res, 200, { status: 'error', message: 'تراکنش یافت نشد' })
        }
        return json(res, 200, {
          amount: record.amount,
          transactionId: `stub-ref-${data.paymentToken.slice(-4)}`,
        })
      }

      if (url.pathname.endsWith('/payment/v1/settle')) {
        const data = JSON.parse(body)
        if (!paymentTokens.has(data.paymentToken)) {
          return json(res, 200, { status: 'error', message: 'تراکنش یافت نشد' })
        }
        return json(res, 200, { status: 'ok' })
      }

      json(res, 404, { status: 'error', message: `مسیر ناشناخته: ${url.pathname}` })
    })
  })
  .listen(PORT, () => {
    console.log(`snappay stub on :${PORT}`)
  })

function expectBasic(raw) {
  const decoded = Buffer.from(raw, 'base64').toString('utf8')
  if (decoded !== 'client-id:client-secret') {
    throw new Error(`bad basic credentials: ${decoded}`)
  }
}
