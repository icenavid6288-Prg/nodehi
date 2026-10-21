import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { get, post, type OrderResponse } from '../lib/api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST, price, toFa } from '../lib/format'

type CheckoutResponse = {
  ok: boolean
  order: OrderResponse
  payment?: { type: string; message: string; redirectUrl: string | null }
}

type PaymentMethodRow = { key: string; label: string; description?: string; hint?: string; sandbox?: boolean }

/** فقط وقتی API روش‌ها را برنگرداند استفاده می‌شود. */
const fallbackPaymentOptions: PaymentMethodRow[] = [
  { key: 'cod', label: 'پرداخت در محل', description: 'هنگام تحویل کالا پرداخت می‌کنید.' },
  { key: 'online', label: 'پرداخت آنلاین', description: 'درگاه بانکی (در این محیط آزمایشی).' },
  { key: 'installment', label: 'خرید اقساطی', description: 'پرداخت اقساطی با اسنپ‌پی.' },
]

export default function Checkout() {
  const { lines, subtotal, clear } = useCart()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<CheckoutResponse | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [couponCode, setCouponCode] = useState('')
  const [methods, setMethods] = useState<PaymentMethodRow[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})

  // کلید یکتا یک‌بار در شروع تسویه ساخته می‌شود. نسخهٔ قبلی از Date.now()
  // استفاده می‌کرد که قابل حدس بود و می‌توانست به سفارش کاربر دیگری برخورد کند.
  const idempotencyKey = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `ui-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )

  useEffect(() => {
    get<{ settings: Record<string, string> }>('/settings/public')
      .then((data) => setSettings(data.settings ?? {}))
      .catch(() => undefined)

    get<{ items: PaymentMethodRow[] }>('/payments/methods')
      .then((data) => setMethods(data.items ?? []))
      .catch(() => undefined)
  }, [])

  const paymentOptions = useMemo(
    () =>
      (methods.length > 0 ? methods : fallbackPaymentOptions).map((method) => ({
        key: method.key,
        label: method.label,
        hint: method.description ?? method.hint ?? '',
      })),
    [methods]
  )

  // اگر روش انتخاب‌شده از پنل غیرفعال شده باشد، اولین روش فعال انتخاب می‌شود.
  useEffect(() => {
    if (paymentOptions.length > 0 && !paymentOptions.some((option) => option.key === paymentMethod)) {
      setPaymentMethod(paymentOptions[0].key)
    }
  }, [paymentOptions, paymentMethod])

  // هزینهٔ ارسال از تنظیمات سرور می‌آید؛ نسخهٔ قبلی آن را هاردکد کرده بود و
  // با تغییر تنظیمات پنل، مبلغ نمایشی با مبلغ نهایی اختلاف پیدا می‌کرد.
  const freeThreshold = Number(settings['shipping.freeThreshold'] ?? FREE_SHIPPING_THRESHOLD)
  const shippingCost = Number(settings['shipping.cost'] ?? SHIPPING_COST)
  const shipping = subtotal >= freeThreshold ? 0 : shippingCost

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
        idempotencyKey: idempotencyKey.current,
      })

      clear()
      setDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت سفارش ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-surface-border bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-success/10 text-2xl text-success">
            ✓
          </div>
          <h1 className="text-xl font-extrabold">سفارش شما ثبت شد</h1>
          <p className="mt-2 text-sm text-ink-muted">
            شماره سفارش: <span className="ltr-inline font-bold text-primary">{done.order.orderNumber}</span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            مبلغ: <span className="font-bold">{price(done.order.total)}</span> تومان
          </p>
          {done.payment?.message && (
            <p className="mt-3 rounded-xl bg-surface-muted p-3 text-xs leading-6 text-ink-muted">
              {done.payment.message}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/track" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
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
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                placeholder="مثلاً NODEHI10"
                className="h-10 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-sm ltr-inline"
              />
            </label>

            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">کالاها</dt>
                <dd className="font-bold">{price(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">ارسال</dt>
                <dd className="font-bold">{shipping === 0 ? 'رایگان' : price(shipping)}</dd>
              </div>
              <div className="flex justify-between border-t border-surface-border pt-2 text-base">
                <dt className="font-bold">قابل پرداخت</dt>
                <dd className="font-extrabold text-primary">{price(subtotal + shipping)} تومان</dd>
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
