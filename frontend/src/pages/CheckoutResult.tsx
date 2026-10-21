import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { post } from '../lib/api'
import { CheckIcon, ShieldIcon } from '../components/icons'
import { useNoindex } from '../lib/seo'

/**
 * صفحهٔ نتیجهٔ پرداخت آنلاین.
 *
 * درگاه فقط `state`، شمارهٔ سفارش و کد خطا را در آدرس برمی‌گرداند؛ متن فارسی
 * همین‌جا ساخته می‌شود تا کسی نتواند با ساختن لینک، پیام دلخواه خودش را روی
 * سایت نشان دهد.
 */

const STATE_COPY: Record<string, { title: string; description: string; tone: 'success' | 'danger' | 'warning' }> = {
  paid: {
    title: 'پرداخت با موفقیت انجام شد',
    description: 'مبلغ از حساب شما کسر شد و سفارش وارد مرحلهٔ آماده‌سازی می‌شود.',
    tone: 'success',
  },
  already_paid: {
    title: 'این سفارش قبلاً پرداخت شده است',
    description: 'نیازی به پرداخت دوباره نیست؛ وضعیت سفارش را از پیگیری سفارش ببینید.',
    tone: 'success',
  },
  failed: {
    title: 'پرداخت انجام نشد',
    description: 'مبلغی از حساب شما کسر نشده است. سفارش ثبت شده و می‌توانید دوباره تلاش کنید.',
    tone: 'danger',
  },
  unverifiable: {
    title: 'وضعیت پرداخت هنوز مشخص نیست',
    description:
      'ارتباط با درگاه قطع شد. اگر مبلغی از حساب شما کسر شده، پرداخت را دوباره انجام ندهید و با پشتیبانی تماس بگیرید.',
    tone: 'warning',
  },
  unknown: {
    title: 'بازگشت از درگاه معتبر نبود',
    description: 'اطلاعات تراکنش پیدا نشد. اگر مبلغی کسر شده با پشتیبانی تماس بگیرید.',
    tone: 'danger',
  },
}

const ERROR_CODE_COPY: Record<string, string> = {
  '-50': 'مبلغ تأییدشده با مبلغ سفارش یکسان نبود؛ با پشتیبانی تماس بگیرید.',
  '-51': 'پرداخت لغو شد یا تراکنش ناموفق بود.',
  '-54': 'شناسهٔ تراکنش نامعتبر است.',
  '-55': 'تراکنش در درگاه پیدا نشد.',
  '-12': 'تعداد تلاش‌ها زیاد بود؛ کمی بعد دوباره امتحان کنید.',
}

type LastPayment = { orderNumber: string; phone: string }

function readLastPayment(): LastPayment | null {
  try {
    const raw = sessionStorage.getItem('nodehi.lastPayment')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LastPayment>
    return parsed.orderNumber && parsed.phone
      ? { orderNumber: parsed.orderNumber, phone: parsed.phone }
      : null
  } catch {
    return null
  }
}

export default function CheckoutResult() {
  const [params] = useSearchParams()
  useNoindex('نتیجهٔ پرداخت', '/checkout/result')
  const state = params.get('state') ?? 'unknown'
  const orderNumber = params.get('order')
  const code = params.get('code')

  const copy = STATE_COPY[state] ?? STATE_COPY.unknown
  const codeMessage = code ? ERROR_CODE_COPY[code] : null

  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)

  const last = readLastPayment()
  const canRetry =
    state === 'failed' && orderNumber !== null && last !== null && last.orderNumber === orderNumber

  async function retry() {
    if (!last) return
    setRetrying(true)
    setRetryError(null)

    try {
      const result = await post<{ ok: boolean; redirectUrl: string }>('/payments/zarinpal/start', {
        orderNumber: last.orderNumber,
        phone: last.phone,
      })
      window.location.assign(result.redirectUrl)
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'شروع دوبارهٔ پرداخت ممکن نشد.')
      setRetrying(false)
    }
  }

  const tone =
    copy.tone === 'success'
      ? 'bg-success/10 text-success'
      : copy.tone === 'warning'
        ? 'bg-amber-50 text-amber-600'
        : 'bg-danger/10 text-danger'

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-surface-border bg-white p-8 text-center shadow-card">
        <div className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full ${tone}`}>
          {copy.tone === 'success' ? <CheckIcon className="h-6 w-6" /> : <ShieldIcon className="h-6 w-6" />}
        </div>

        <h1 className="text-xl font-extrabold">{copy.title}</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">{copy.description}</p>

        {orderNumber && (
          <p className="mt-4 text-sm text-ink-muted">
            شماره سفارش:{' '}
            <span className="ltr-inline font-bold text-primary">{orderNumber}</span>
          </p>
        )}

        {codeMessage && (
          <p className="mt-3 rounded-xl bg-surface-muted p-3 text-xs leading-6 text-ink-muted">
            {codeMessage}
          </p>
        )}

        {retryError && (
          <p className="mt-3 rounded-xl bg-danger/10 p-3 text-xs leading-6 text-danger">{retryError}</p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {canRetry && (
            <button
              type="button"
              onClick={retry}
              disabled={retrying}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {retrying ? 'در حال انتقال...' : 'تلاش دوباره برای پرداخت'}
            </button>
          )}
          <Link
            to="/track"
            className={`rounded-xl px-5 py-2.5 text-sm font-bold ${
              canRetry ? 'border border-surface-border' : 'bg-primary text-white'
            }`}
          >
            پیگیری سفارش
          </Link>
          <Link to="/shop" className="rounded-xl border border-surface-border px-5 py-2.5 text-sm font-bold">
            ادامه خرید
          </Link>
        </div>
      </div>
    </div>
  )
}
