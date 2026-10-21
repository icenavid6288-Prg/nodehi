import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { get, post, type OrderResponse } from '../lib/api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST, price, toFa } from '../lib/format'
import { useNoindex } from '../lib/seo'

type CheckoutResponse = {
  ok: boolean
  order: OrderResponse
  payment?: {
    type: string
    message: string | null
    redirectUrl: string | null
    gateway?: string
    sandbox?: boolean
  }
}

const paymentOptions = [
  { key: 'cod', label: 'پرداخت در محل', hint: 'هنگام تحویل کالا پرداخت می‌کنید.' },
  { key: 'online', label: 'پرداخت آنلاین', hint: 'درگاه امن زرین‌پال با کارت بانکی.' },
  { key: 'installment', label: 'خرید اقساطی', hint: 'پرداخت اقساطی با اسنپ‌پی.' },
]

export default function Checkout() {
  const { lines, subtotal, clear } = useCart()
  const { user } = useAuth()
  useNoindex('تسویه حساب', '/checkout')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<CheckoutResponse | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState<{ code: string; label: string; percent: number } | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [shippingConfig, setShippingConfig] = useState({
    free: FREE_SHIPPING_THRESHOLD,
    cost: SHIPPING_COST,
  })

  // قواعد ارسال از تنظیمات سرور خوانده می‌شود تا مبلغ نمایشی با فاکتور یکی باشد.
  useEffect(() => {
    get<{ settings: Record<string, string> }>('/settings/public')
      .then((data) => {
        const free = Number(data.settings['shipping.freeThreshold'])
        const cost = Number(data.settings['shipping.cost'])
        setShippingConfig({
          free: Number.isFinite(free) ? free : FREE_SHIPPING_THRESHOLD,
          cost: Number.isFinite(cost) ? cost : SHIPPING_COST,
        })
      })
      .catch(() => {
        /* در نبود تنظیمات، مقدارهای پیش‌فرض همین فایل استفاده می‌شوند */
      })
  }, [])

  // پس از ثبت سفارش آنلاین، کاربر خودکار به درگاه بانکی منتقل می‌شود؛ دکمهٔ
  // دستی هم در همان صفحه هست تا اگر مرورگر انتقال را مسدود کرد، مسیر بسته نشود.
  useEffect(() => {
    const url = done?.payment?.redirectUrl
    if (!url) return

    const timer = window.setTimeout(() => window.location.assign(url), 1200)
    return () => window.clearTimeout(timer)
  }, [done])

  const discount = coupon ? Math.round((subtotal * coupon.percent) / 100) : 0
  const shipping = subtotal >= shippingConfig.free ? 0 : shippingConfig.cost
  const payable = Math.max(subtotal - discount + shipping, 0)

  async function applyCoupon() {
    const code = couponCode.trim()
    setCouponError(null)

    if (!code) {
      setCoupon(null)
      return
    }

    setCouponLoading(true)
    try {
      const result = await post<{
        ok: boolean
        coupon: { code: string; label: string; percent: number; discount: number }
      }>('/coupons/validate', { code, subtotal })
      setCoupon(result.coupon)
    } catch (err) {
      setCoupon(null)
      setCouponError(err instanceof Error ? err.message : 'این کد تخفیف پذیرفته نشد.')
    } finally {
      setCouponLoading(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lines.length === 0) return

    const form = new FormData(event.currentTarget)
    setLoading(true)
    setError(null)

    try {
      const result = await post<CheckoutResponse>('/checkout', {
        items: lines.map((line) => ({ slug: line.slug, quantity: line.quantity })),
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        phone: String(form.get('phone') ?? ''),
        email: String(form.get('email') ?? '') || null,
        province: String(form.get('province') ?? ''),
        city: String(form.get('city') ?? ''),
        line: String(form.get('line') ?? ''),
        postalCode: String(form.get('postalCode') ?? '') || null,
        note: String(form.get('note') ?? '') || null,
        paymentMethod,
        couponCode: couponCode || null,
        idempotencyKey: createIdempotencyKey(),
      })

      clear()

      // شمارهٔ سفارش و همراه، برای «تلاش دوباره» در صفحهٔ نتیجه و درگاه
      // نگه داشته می‌شود؛ داده‌های حساسی در آن نیست.
      if (result.payment?.type === 'online') {
        sessionStorage.setItem(
          'nodehi.lastPayment',
          JSON.stringify({ orderNumber: result.order.orderNumber, phone: String(form.get('phone') ?? '') }),
        )
      }

      setDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت سفارش ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    const gatewayUrl = done.payment?.redirectUrl ?? null

    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-surface-border bg-white p-8 text-center shadow-card">
          <div className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full text-2xl ${gatewayUrl ? 'bg-secondary/10 text-secondary-dark' : 'bg-success/10 text-success'}`}>
            {gatewayUrl ? '↗' : '✓'}
          </div>
          <h1 className="text-xl font-extrabold">
            {gatewayUrl ? 'در حال انتقال به درگاه پرداخت' : 'سفارش شما ثبت شد'}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            شماره سفارش: <span className="ltr-inline font-bold text-primary">{done.order.orderNumber}</span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            مبلغ: <span className="font-bold">{price(done.order.total)}</span> تومان
          </p>

          {gatewayUrl ? (
            <>
              <p className="mt-3 text-xs leading-6 text-ink-muted">
                اگر به‌طور خودکار منتقل نشدید، دکمهٔ زیر را بزنید. پس از پرداخت به همین سایت
                برمی‌گردید.
              </p>
              <a
                href={gatewayUrl}
                className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
              >
                رفتن به درگاه بانکی
              </a>
              {done.payment?.sandbox && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] leading-6 text-amber-700">
                  درگاه در حالت آزمایشی (sandbox) است؛ پرداخت واقعی انجام نمی‌شود.
                </p>
              )}
            </>
          ) : (
            done.payment?.message && (
              <p className="mt-3 rounded-xl bg-surface-muted p-3 text-xs leading-6 text-ink-muted">
                {done.payment.message}
              </p>
            )
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/track" className="rounded-xl border border-surface-border px-5 py-2.5 text-sm font-bold">
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

  if (lines.length === 0) {
    return <Navigate to="/cart" replace />
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-extrabold">تسویه حساب</h1>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="mb-4 text-sm font-extrabold">اطلاعات گیرنده</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="firstName" label="نام" defaultValue={user?.firstName ?? ''} required />
              <Field name="lastName" label="نام خانوادگی" defaultValue={user?.lastName ?? ''} required />
              <Field name="phone" label="شماره همراه" defaultValue={user?.phone ?? ''} required inputMode="tel" />
              <Field name="email" label="ایمیل (اختیاری)" type="email" />
              <Field name="province" label="استان" required />
              <Field name="city" label="شهر" required />
              <Field name="line" label="نشانی کامل" required className="sm:col-span-2" />
              <Field name="postalCode" label="کد پستی (اختیاری)" inputMode="numeric" />
              <Field name="note" label="توضیح سفارش (اختیاری)" className="sm:col-span-2" />
            </div>
          </section>

          <section className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="mb-3 text-sm font-extrabold">روش پرداخت</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {paymentOptions.map((option) => (
                <label
                  key={option.key}
                  className={`cursor-pointer rounded-xl border p-3 text-sm transition ${
                    paymentMethod === option.key
                      ? 'border-secondary bg-secondary/5'
                      : 'border-surface-border hover:border-secondary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.key}
                    checked={paymentMethod === option.key}
                    onChange={() => setPaymentMethod(option.key)}
                    className="sr-only"
                  />
                  <span className="block font-bold">{option.label}</span>
                  <span className="mt-1 block text-[11px] text-ink-muted">{option.hint}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
            <h2 className="mb-4 text-sm font-extrabold">خلاصه سفارش</h2>
            <ul className="mb-4 grid gap-2 text-xs">
              {lines.map((line) => (
                <li key={line.slug} className="flex justify-between gap-2">
                  <span className="text-ink-muted">
                    {line.name} × {toFa(line.quantity)}
                  </span>
                  <span className="shrink-0 font-bold">{price(line.price * line.quantity)}</span>
                </li>
              ))}
            </ul>

            <label className="mb-4 block text-xs">
              <span className="mb-1 block text-ink-muted">کد تخفیف</span>
              <input
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(event.target.value.toUpperCase())
                  setCoupon(null)
                  setCouponError(null)
                }}
                placeholder="مثلاً NODEHI10"
                className="h-10 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-sm ltr-inline"
              />
            </label>

            <button
              type="button"
              onClick={applyCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="mb-4 w-full rounded-xl border border-surface-border py-2 text-xs font-bold hover:border-secondary disabled:opacity-50"
            >
              {couponLoading ? 'در حال بررسی...' : 'اعمال کد تخفیف'}
            </button>

            {coupon && (
              <p className="mb-4 rounded-xl bg-success/10 p-2 text-xs text-success">
                {coupon.label} ({toFa(coupon.percent)}٪) اعمال شد.
              </p>
            )}
            {couponError && <p className="mb-4 rounded-xl bg-danger/10 p-2 text-xs text-danger">{couponError}</p>}

            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">کالاها</dt>
                <dd className="font-bold">{price(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>تخفیف</dt>
                  <dd className="font-bold">−{price(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-muted">ارسال</dt>
                <dd className="font-bold">{shipping === 0 ? 'رایگان' : price(shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-surface-border pt-2 text-base">
                <dt className="font-bold">قابل پرداخت</dt>
                <dd className="font-extrabold text-primary">{price(payable)} تومان</dd>
              </div>
            </dl>

            {error && <p className="mt-3 rounded-xl bg-danger/10 p-3 text-xs text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-extrabold text-white hover:bg-primary-light disabled:opacity-60"
            >
              {loading ? 'در حال ثبت سفارش...' : 'ثبت سفارش'}
            </button>
          </div>
        </aside>
      </form>
    </div>
  )
}

/** کلید یکتای ثبت سفارش — حدس‌زدنی نیست و از تکرار تصادفی جلوگیری می‌کند. */
function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `ui-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function Field({
  name,
  label,
  required,
  type = 'text',
  inputMode,
  defaultValue,
  className = '',
}: {
  name: string
  label: string
  required?: boolean
  type?: string
  inputMode?: 'tel' | 'numeric' | 'email'
  defaultValue?: string
  className?: string
}) {
  return (
    <label className={`block text-xs ${className}`}>
      <span className="mb-1 block text-ink-muted">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        inputMode={inputMode}
        required={required}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-sm outline-none focus:border-secondary focus:bg-white"
      />
    </label>
  )
}
