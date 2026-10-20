'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { useStore } from '@/components/providers/store-provider'
import { Button, ButtonLink } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { computeOrderTotals, lookupCoupon, SHIPPING_METHODS } from '@/lib/commerce'
import { formatJalaliDate, formatPrice, toLatinDigits, toPersianDigits } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

type Step = 1 | 2 | 3 | 4

const steps: { id: Step; title: string; description: string }[] = [
  { id: 1, title: 'اطلاعات تحویل', description: 'گیرنده و آدرس ارسال' },
  { id: 2, title: 'روش ارسال', description: 'زمان و هزینه تحویل' },
  { id: 3, title: 'روش پرداخت', description: 'آنلاین، درب منزل یا اقساط' },
  { id: 4, title: 'تأیید سفارش', description: 'بازبینی نهایی و ثبت' },
]

/**
 * روش‌های ارسال از `lib/commerce` می‌آید — همان منبعی که سرور هزینه را از
 * آن حساب می‌کند. تعریف دوباره اینجا یعنی احتمال اختلاف مبلغ نمایش‌داده‌شده
 * با مبلغ نهایی؛ پس فقط از یک جا خوانده می‌شود.
 */
const shippingMethods = SHIPPING_METHODS

/**
 * همه روش‌های پرداخت شناخته‌شده با متن فارسی‌شان.
 * نمایش در تسویه بر اساس پاسخ `/api/payments/methods` فیلتر می‌شود تا فقط
 * روش‌هایی دیده شوند که سرور واقعاً قبول می‌کند — این فهرست فقط متن دارد.
 */
const ALL_PAYMENT_METHODS = [
  {
    id: 'online',
    title: 'پرداخت آنلاین (زرین‌پال / آیدی‌پی)',
    description: 'انتقال امن به درگاه بانکی. اطلاعات کارت شما در فروشگاه ذخیره نمی‌شود.',
    badge: 'پیشنهاد می‌شود',
  },
  {
    id: 'snappay',
    title: 'پرداخت اعتباری اسنپ‌پی',
    description: 'الان بخر، بعداً قسطی پرداخت کن. اقساط‌بندی در صفحه اسنپ‌پی انجام می‌شود.',
    badge: null,
  },
  {
    id: 'cod',
    title: 'پرداخت درب منزل',
    description: 'پس از بررسی کالا، مبلغ را به مامور ارسال پرداخت کنید.',
    badge: null,
  },
  {
    id: 'installment',
    title: 'خرید اقساطی',
    description: 'اعتبارسنجی آنلاین، بازپرداخت ۶ تا ۲۴ ماه بدون ضامن.',
    badge: null,
  },
]

/** اطلاعات گیرنده که پس از مرحله اول نگه داشته می‌شود تا هنگام ثبت ارسال شود */
interface DeliveryInfo {
  fullName: string
  phone: string
  province: string
  city: string
  address: string
  postalCode: string
  receiver: string
}

/** سفارش ثبت‌شده — فقط چیزی که از سرور برگشته، نه چیزی که ما حدس زده‌ایم */
interface PlacedOrder {
  orderNumber: string
  status: string
  createdAt: string
  totals: { subtotal: number; discount: number; shipping: number; total: number }
  gateway: string
  /**
   * وضعیت اتصال درگاه پرداخت.
   * `redirectUrl` تهی یعنی درگاه در این محیط در دسترس نیست؛ در این حالت
   * به کاربر می‌گوییم سفارش ثبت شده و پرداخت بعداً انجام می‌شود — نه اینکه
   * خیال کند پرداخت موفق بوده.
   */
  paymentPending: boolean
  /** دلیل دقیق در دسترس نبودن درگاه، از خود سرور (اختیاری) */
  note: string | null
}

export default function CheckoutPage() {
  const { cart, cartSubtotal, clearCart, hydrated, couponCode, setCouponCode } = useStore()
  const [step, setStep] = useState<Step>(1)
  const [shippingId, setShippingId] = useState(shippingMethods[0]!.id)
  const [paymentId, setPaymentId] = useState('online')
  const [delivery, setDelivery] = useState<DeliveryInfo | null>(null)
  const [placed, setPlaced] = useState<PlacedOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  /**
   * کلید یکتایی درخواست.
   * یک بار در طول همین نشست تسویه ساخته می‌شود و تغییر نمی‌کند تا اگر کاربر
   * دوباره روی «ثبت سفارش» بزند یا شبکه قطع و وصل شود، سرور همان سفارش قبلی
   * را برگرداند و سفارش دوتایی ثبت نشود.
   */
  const idempotencyKey = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `key-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )

  const shipping = shippingMethods.find((method) => method.id === shippingId) ?? shippingMethods[0]!

  /** روش‌های مجاز از سرور — تا فیلتر شدن پاسخ، همه شناخته‌شده‌ها (پیش‌فرض گذشته) */
  const [enabledMethodIds, setEnabledMethodIds] = useState<string[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/payments/methods')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.methods) && data.methods.length > 0) {
          setEnabledMethodIds(data.methods as string[])
        }
      })
      .catch(() => {
        // بی‌صدا: پیش‌فرض یعنی همه روش‌ها — همان رفتار سرور وقتی ردیفی نیست
      })
    return () => {
      cancelled = true
    }
  }, [])
  const paymentMethods = enabledMethodIds
    ? ALL_PAYMENT_METHODS.filter((method) => enabledMethodIds.includes(method.id))
    : ALL_PAYMENT_METHODS
  const payment = paymentMethods.find((method) => method.id === paymentId) ?? paymentMethods[0]!

  // اگر روش انتخابی به‌تازگی از فهرست حذف شده (مثلاً مدیر اسنپ‌پی را خاموش کرد
  // در حین تسویه)، به اولین روش موجود برمی‌گردیم تا کاربر روی گزینه مرده ثبت نکند
  useEffect(() => {
    if (enabledMethodIds && !enabledMethodIds.includes(paymentId) && paymentMethods[0]) {
      setPaymentId(paymentMethods[0].id)
    }
    // paymentId عمداً در وابستگی‌ها نیست: فقط حذفِ روش باید این را اجرا کند
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledMethodIds])

  // پیش‌نمایش مبلغ از همین تابعی می‌آید که سرور برای مبلغ نهایی استفاده می‌کند؛
  // پس عددی که کاربر می‌بیند دقیقاً همان عددی است که ثبت می‌شود.
  const preview = computeOrderTotals(cartSubtotal, couponCode, shipping.id)

  const breadcrumbItems = [{ name: 'سبد خرید', path: '/cart' }, { name: 'تسویه حساب', path: '/checkout' }]

  /**
   * خواندن و اعتبارسنجی اطلاعات گیرنده.
   * اعتبارسنجی نهایی در سرور تکرار می‌شود؛ این لایه فقط برای بازخورد سریع است.
   */
  function readDelivery(form: HTMLFormElement): { info: DeliveryInfo; fields: Record<string, string> } {
    const data = new FormData(form)
    const info: DeliveryInfo = {
      fullName: String(data.get('fullName') ?? '').trim(),
      phone: toLatinDigits(String(data.get('phone') ?? '')).replace(/[^\d]/g, ''),
      province: String(data.get('province') ?? '').trim(),
      city: String(data.get('city') ?? '').trim(),
      address: String(data.get('address') ?? '').trim(),
      postalCode: toLatinDigits(String(data.get('postalCode') ?? '')).replace(/[^\d]/g, ''),
      receiver: String(data.get('receiver') ?? '').trim(),
    }

    const fields: Record<string, string> = {}
    if (info.fullName.length < 3) fields.fullName = 'نام و نام خانوادگی را کامل وارد کنید.'
    if (!/^09\d{9}$/.test(info.phone)) fields.phone = 'شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.'
    if (info.province.length < 2) fields.province = 'استان را وارد کنید.'
    if (info.city.length < 2) fields.city = 'شهر را وارد کنید.'
    if (info.address.length < 10) fields.address = 'نشانی کامل پستی را وارد کنید.'
    if (!/^\d{10}$/.test(info.postalCode)) fields.postalCode = 'کد پستی باید ۱۰ رقم باشد.'

    return { info, fields }
  }

  function handleDeliveryNext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { info, fields } = readDelivery(event.currentTarget)
    setErrors(fields)
    if (Object.keys(fields).length > 0) return
    // اطلاعات نگه داشته می‌شود تا در پایان، بدون خواندن دوباره فرم، ارسال شود
    setDelivery(info)
    setSubmitError('')
    setStep(2)
  }

  function applyCouponInline(event: React.FormEvent) {
    event.preventDefault()
    const code = toLatinDigits(couponInput).trim().toUpperCase()
    if (!lookupCoupon(code, cartSubtotal)) {
      setSubmitError('این کد تخفیف معتبر نیست یا شرط مبلغ سبدش برقرار نیست.')
      return
    }
    setCouponCode(code)
    setCouponInput('')
    setSubmitError('')
  }

  /** ثبت واقعی سفارش روی سرور */
  async function submitOrder() {
    if (!delivery) {
      setSubmitError('اطلاعات گیرنده کامل نیست؛ مرحله اول را دوباره پر کنید.')
      setStep(1)
      return
    }
    if (cart.length === 0 || submitting) return

    setSubmitting(true)
    setSubmitError('')

    // فرم یک فیلد «نام و نام خانوادگی» دارد؛ برای فاکتور به دو بخش شکسته می‌شود
    const [firstName, ...rest] = delivery.fullName.split(/\s+/)
    const lastName = rest.join(' ') || firstName || ''

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': idempotencyKey.current,
        },
        body: JSON.stringify({
          // فقط نامک و تعداد می‌رود؛ قیمت را سرور از کاتالوگ می‌خواند
          items: cart.map((line) => ({ slug: line.slug, quantity: line.quantity })),
          customer: {
            firstName,
            lastName,
            phone: delivery.phone,
            province: delivery.province,
            city: delivery.city,
            line: delivery.address,
            postalCode: delivery.postalCode,
          },
          paymentMethod: paymentId,
          shippingMethod: shipping.id,
          couponCode: couponCode ?? '',
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.ok) {
        const serverFields: Record<string, string> = data?.error?.fields ?? {}
        setErrors(serverFields)
        setSubmitError(data?.error?.message ?? 'ثبت سفارش ناموفق بود.')
        // اگر ایراد از اطلاعات گیرنده است، کاربر را به همان مرحله برمی‌گردانیم
        if (serverFields.firstName || serverFields.phone || serverFields.line) {
          setStep(1)
        }
        return
      }

      // آدرس درگاه را سرور می‌سازد و اینجا فقط منتقل می‌شویم. پیش از
      // انتقال، پروتکل بررسی می‌شود: هرگز نباید مقدار خام پاسخ سرور به
      // location داده شود.
      const redirectUrl =
        typeof data.payment?.redirectUrl === 'string' ? data.payment.redirectUrl : null
      if (redirectUrl && /^https?:\/\//i.test(redirectUrl)) {
        clearCart()
        window.location.assign(redirectUrl)
        return
      }

      // شماره سفارش از سرور می‌آید، نه از مرورگر — منبع حقیقت یکی است
      setPlaced({
        orderNumber: data.order.id,
        status: data.order.status,
        createdAt: data.order.createdAt,
        totals: data.order.totals,
        gateway: data.payment?.gateway ?? paymentId,
        paymentPending: paymentId === 'online' || paymentId === 'snappay',
        note: typeof data.payment?.note === 'string' ? data.payment.note : null,
      })
      clearCart()
      setStep(4)
    } catch {
      setSubmitError('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!hydrated) {
    return (
      <div className="container-page py-10">
        <div className="rounded-2xl border border-surface-border bg-white p-12 text-center text-sm text-ink-muted">
          در حال آماده‌سازی فرایند خرید…
        </div>
      </div>
    )
  }

  // صفحه موفقیت سفارش — همه اعداد از پاسخ سرور خوانده می‌شوند
  if (placed) {
    return (
      <div className="container-page py-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-2xl border border-surface-border bg-white px-6 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-8 w-8">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h1 className="text-lg font-extrabold text-ink">سفارش شما با موفقیت ثبت شد</h1>
            <p className="mt-2 text-sm leading-7 text-ink-muted">
              شماره سفارش شما <span className="ltr-inline font-bold text-primary">{placed.orderNumber}</span> است.
              می‌توانید وضعیت آن را از همین حالا پیگیری کنید.
            </p>
          </div>

          {placed.paymentPending ? (
            <p className="w-full rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-700">
              {placed.note ??
                'سفارش شما ثبت شد، اما درگاه پرداخت آنلاین در این محیط فعال نیست. کارشناس فروش برای هماهنگی پرداخت با شما تماس می‌گیرد؛ تا آن زمان مبلغی از حساب شما کسر نمی‌شود.'}
            </p>
          ) : (
            <p className="w-full rounded-xl bg-secondary/10 px-4 py-3 text-xs leading-6 text-secondary-dark">
              پیامک تأیید سفارش به شماره همراه شما ارسال می‌شود. برای پیگیری، همیشه می‌توانید از همین صفحه و شماره
              سفارش استفاده کنید.
            </p>
          )}

          <dl className="w-full rounded-xl bg-surface-muted p-5 text-right text-sm">
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-ink-muted">تاریخ ثبت</dt>
              <dd className="font-medium text-ink">{formatJalaliDate(placed.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-ink-muted">روش ارسال</dt>
              <dd className="font-medium text-ink">{shipping.label}</dd>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-ink-muted">روش پرداخت</dt>
              <dd className="font-medium text-ink">{payment.title}</dd>
            </div>
            {placed.totals.discount > 0 ? (
              <div className="flex items-center justify-between border-t border-surface-border py-1.5 pt-3">
                <dt className="text-ink-muted">تخفیف</dt>
                <dd className="font-medium text-success tabular-nums">
                  − {formatPrice(placed.totals.discount)}
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between py-1.5">
              <dt className="text-ink-muted">هزینه ارسال</dt>
              <dd className="font-medium tabular-nums text-ink">
                {placed.totals.shipping === 0 ? 'رایگان' : formatPrice(placed.totals.shipping)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-surface-border py-1.5 pt-3">
              <dt className="font-bold text-ink">مبلغ کل ثبت‌شده</dt>
              <dd className="text-base font-extrabold tabular-nums text-primary">
                {formatPrice(placed.totals.total)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href={`/track?order=${placed.orderNumber}`} variant="primary" size="md">
              پیگیری سفارش
            </ButtonLink>
            <ButtonLink href="/account/orders" variant="outline" size="md">
              سفارش‌های من
            </ButtonLink>
            <ButtonLink href="/shop" variant="ghost" size="md">
              ادامه خرید
            </ButtonLink>
          </div>
        </div>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="container-page py-10">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-surface-border bg-white px-6 py-16 text-center">
          <p className="text-sm font-bold text-ink">سبد خرید شما خالی است</p>
          <p className="max-w-md text-xs leading-6 text-ink-muted">
            برای ورود به مرحله تسویه حساب، ابتدا محصولی را به سبد خرید اضافه کنید.
          </p>
          <ButtonLink href="/shop" variant="primary" size="sm">
            رفتن به فروشگاه
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page">
      <div className="py-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <h1 className="pb-6 text-xl font-extrabold text-ink sm:text-2xl">تسویه حساب</h1>

      {/* نشانگر مراحل */}
      <ol className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="مراحل تسویه حساب">
        {steps.map((item) => {
          const state = step === item.id ? 'current' : step > item.id ? 'done' : 'upcoming'
          return (
            <li
              key={item.id}
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-4 py-3',
                state === 'current'
                  ? 'border-primary bg-primary/[0.06]'
                  : state === 'done'
                    ? 'border-secondary/30 bg-secondary/[0.06]'
                    : 'border-surface-border bg-white',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  state === 'current'
                    ? 'bg-primary text-white'
                    : state === 'done'
                      ? 'bg-secondary text-white'
                      : 'bg-surface-muted text-ink-muted',
                )}
              >
                {state === 'done' ? '✓' : toPersianDigits(item.id)}
              </span>
              <span className="min-w-0">
                <span className={cn('block truncate text-xs font-bold', state === 'upcoming' ? 'text-ink-muted' : 'text-ink')}>
                  {item.title}
                </span>
                <span className="hidden truncate text-[10px] text-ink-subtle sm:block">{item.description}</span>
              </span>
            </li>
          )
        })}
      </ol>

      <div className="grid gap-6 pb-12 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          {/* مرحله ۱: اطلاعات تحویل */}
          {step === 1 ? (
            <form onSubmit={handleDeliveryNext} className="flex flex-col gap-5 rounded-2xl border border-surface-border bg-white p-5 sm:p-6" noValidate>
              <h2 className="text-sm font-bold text-ink">اطلاعات گیرنده و آدرس ارسال</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="نام و نام خانوادگی" htmlFor="fullName" error={errors.fullName}>
                  <Input id="fullName" name="fullName" autoComplete="name" placeholder="مثلاً مریم احمدی" />
                </Field>
                <Field label="شماره همراه" htmlFor="phone" error={errors.phone} hint="کد پیگیری سفارش به این شماره پیامک می‌شود.">
                  <Input id="phone" name="phone" inputMode="tel" dir="ltr" className="text-left" autoComplete="tel" placeholder="09120000000" />
                </Field>
                <Field label="استان" htmlFor="province" error={errors.province}>
                  <Input id="province" name="province" autoComplete="address-level1" placeholder="مثلاً تهران" />
                </Field>
                <Field label="شهر" htmlFor="city" error={errors.city}>
                  <Input id="city" name="city" autoComplete="address-level2" placeholder="مثلاً تهران" />
                </Field>
              </div>

              <Field label="نشانی کامل پستی" htmlFor="address" error={errors.address}>
                <Textarea id="address" name="address" autoComplete="street-address" placeholder="خیابان، کوچه، پلاک، واحد" />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="کد پستی" htmlFor="postalCode" error={errors.postalCode} hint="۱۰ رقم بدون خط تیره">
                  <Input id="postalCode" name="postalCode" inputMode="numeric" dir="ltr" className="text-left" autoComplete="postal-code" placeholder="1234567890" />
                </Field>
                <Field label="نام تحویل‌گیرنده (اختیاری)" htmlFor="receiver">
                  <Input id="receiver" name="receiver" placeholder="اگر شخص دیگری کالا را تحویل می‌گیرد" />
                </Field>
              </div>

              <label className="flex items-start gap-2.5 text-xs leading-6 text-ink-muted">
                <input type="checkbox" defaultChecked className="mt-1 h-4 w-4 rounded border-surface-border accent-secondary" />
                این نشانی را به‌عنوان آدرس پیش‌فرض حساب خود ذخیره کن.
              </label>

              <div className="flex justify-between gap-3 border-t border-surface-border pt-4">
                <ButtonLink href="/cart" variant="ghost" size="md">
                  بازگشت به سبد
                </ButtonLink>
                <Button type="submit" variant="primary" size="md">
                  ادامه به روش ارسال
                </Button>
              </div>
            </form>
          ) : null}

          {/* مرحله ۲: روش ارسال */}
          {step === 2 ? (
            <div className="flex flex-col gap-5 rounded-2xl border border-surface-border bg-white p-5 sm:p-6">
              <h2 className="text-sm font-bold text-ink">روش و زمان ارسال را انتخاب کنید</h2>

              <ul className="flex flex-col gap-3">
                {shippingMethods.map((method) => (
                  <li key={method.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                        shippingId === method.id ? 'border-primary bg-primary/[0.06]' : 'border-surface-border hover:border-primary/40',
                      )}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        value={method.id}
                        checked={shippingId === method.id}
                        onChange={() => setShippingId(method.id)}
                        className="mt-1 h-4 w-4 accent-primary"
                      />
                      <span className="flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-bold text-ink">{method.label}</span>
                          <span className="text-xs font-bold text-primary tabular-nums">{formatPrice(method.cost)}</span>
                        </span>
                        <span className="mt-1 block text-xs leading-6 text-ink-muted">{method.description}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <div className="flex justify-between gap-3 border-t border-surface-border pt-4">
                <Button variant="ghost" size="md" onClick={() => setStep(1)}>
                  بازگشت
                </Button>
                <Button variant="primary" size="md" onClick={() => setStep(3)}>
                  ادامه به روش پرداخت
                </Button>
              </div>
            </div>
          ) : null}

          {/* مرحله ۳: روش پرداخت */}
          {step === 3 ? (
            <div className="flex flex-col gap-5 rounded-2xl border border-surface-border bg-white p-5 sm:p-6">
              <h2 className="text-sm font-bold text-ink">روش پرداخت را انتخاب کنید</h2>

              <ul className="flex flex-col gap-3">
                {paymentMethods.map((method) => (
                  <li key={method.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                        paymentId === method.id ? 'border-primary bg-primary/[0.06]' : 'border-surface-border hover:border-primary/40',
                      )}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={paymentId === method.id}
                        onChange={() => setPaymentId(method.id)}
                        className="mt-1 h-4 w-4 accent-primary"
                      />
                      <span className="flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-ink">{method.title}</span>
                          {method.badge ? (
                            <span className="rounded-full bg-secondary/[0.12] px-2 py-0.5 text-[10px] font-medium text-secondary-dark">
                              {method.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs leading-6 text-ink-muted">{method.description}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <p className="rounded-xl bg-surface-muted p-4 text-xs leading-6 text-ink-muted">
                <span className="font-bold text-ink">نکته امنیتی:</span> اطلاعات کارت بانکی شما تنها در صفحات امن
                درگاه پرداخت وارد می‌شود و هیچ‌گاه در سرورهای نودهی ذخیره یا پردازش نمی‌گردد. تمام تراکنش‌ها روی
                بستر HTTPS و با توکن‌سازی انجام می‌شود.
              </p>

              <div className="flex justify-between gap-3 border-t border-surface-border pt-4">
                <Button variant="ghost" size="md" onClick={() => setStep(2)}>
                  بازگشت
                </Button>
                <Button variant="primary" size="md" onClick={() => setStep(4)}>
                  بازبینی و تأیید نهایی
                </Button>
              </div>
            </div>
          ) : null}

          {/* مرحله ۴: تأیید */}
          {step === 4 ? (
            <div className="flex flex-col gap-5 rounded-2xl border border-surface-border bg-white p-5 sm:p-6">
              <h2 className="text-sm font-bold text-ink">بازبینی نهایی سفارش</h2>

              <ul className="flex flex-col gap-3">
                {cart.map((line) => (
                  <li key={line.productId} className="flex items-center justify-between gap-3 border-b border-surface-border pb-3 text-sm last:border-0 last:pb-0">
                    <Link href={`/product/${line.slug}`} className="min-w-0 flex-1 truncate text-ink transition-colors hover:text-primary">
                      {line.name}
                    </Link>
                    <span className="shrink-0 text-xs text-ink-muted">×{toPersianDigits(line.quantity)}</span>
                    <span className="shrink-0 text-xs font-bold text-ink tabular-nums">{formatPrice(line.price * line.quantity)}</span>
                  </li>
                ))}
              </ul>

              <dl className="flex flex-col gap-2.5 rounded-xl bg-surface-muted p-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-muted">روش ارسال</dt>
                  <dd className="font-medium text-ink">{shipping.label}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-muted">روش پرداخت</dt>
                  <dd className="font-medium text-ink">{payment.title}</dd>
                </div>
                {preview.coupon ? (
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-muted">کد تخفیف {preview.coupon.code}</dt>
                    <dd className="font-medium text-success tabular-nums">
                      − {formatPrice(preview.discount)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-surface-border pt-2.5">
                  <dt className="font-bold text-ink">مبلغ نهایی</dt>
                  <dd className="text-base font-extrabold text-primary tabular-nums">{formatPrice(preview.total)}</dd>
                </div>
              </dl>

              <label className="flex items-start gap-2.5 text-xs leading-6 text-ink-muted">
                <input type="checkbox" defaultChecked className="mt-1 h-4 w-4 rounded border-surface-border accent-secondary" />
                <span>
                  <Link href="/terms" className="font-medium text-primary hover:text-accent">
                    قوانین و مقررات
                  </Link>{' '}
                  و شرایط بازگشت کالای نودهی را مطالعه کرده و می‌پذیرم.
                </span>
              </label>

              {submitError ? (
                <p role="alert" className="rounded-xl bg-danger/[0.08] px-4 py-3 text-xs leading-6 text-danger">
                  {submitError}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-between gap-3 border-t border-surface-border pt-4">
                <Button variant="ghost" size="md" onClick={() => setStep(3)} disabled={submitting}>
                  بازگشت
                </Button>
                <Button
                  variant="accent"
                  size="md"
                  onClick={() => void submitOrder()}
                  disabled={submitting || cart.length === 0}
                >
                  {submitting
                    ? 'در حال ثبت سفارش…'
                    : paymentId === 'online' || paymentId === 'snappay'
                      ? 'ثبت سفارش و انتقال به درگاه'
                      : 'ثبت نهایی سفارش'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* خلاصه سفارش کنار */}
        <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-32">
          <div className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">خلاصه پرداخت</h2>

            {/* کد تخفیف — اعمال و حذف در همین صفحه تا اگر سرور کد را رد کرد،
                کاربر بتواند بدون بازگشت به سبد مشکل را حل کند */}
            {couponCode ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-secondary/[0.08] px-3.5 py-2.5 text-xs">
                <span className="font-bold text-secondary-dark">کد {couponCode} اعمال شد</span>
                <button
                  type="button"
                  onClick={() => setCouponCode(null)}
                  className="text-[11px] text-ink-muted underline transition-colors hover:text-danger"
                >
                  حذف
                </button>
              </div>
            ) : (
              <form onSubmit={applyCouponInline} className="flex gap-2">
                <Input
                  dir="ltr"
                  className="text-left uppercase"
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value)}
                  placeholder="کد تخفیف"
                  aria-label="کد تخفیف"
                />
                <Button type="submit" variant="outline" size="md" className="shrink-0">
                  اعمال
                </Button>
              </form>
            )}

            <dl className="flex flex-col gap-2.5 border-b border-surface-border pb-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">جمع کالاها ({toPersianDigits(cart.length)} قلم)</dt>
                <dd className="font-medium text-ink tabular-nums">{formatPrice(cartSubtotal)}</dd>
              </div>
              {preview.discount > 0 ? (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-muted">تخفیف</dt>
                  <dd className="font-medium text-success tabular-nums">− {formatPrice(preview.discount)}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">هزینه ارسال</dt>
                <dd className={cn('font-medium tabular-nums', preview.shipping === 0 ? 'text-success' : 'text-ink')}>
                  {preview.shipping === 0 ? 'رایگان' : formatPrice(preview.shipping)}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between pt-4">
              <span className="text-sm font-bold text-ink">مبلغ قابل پرداخت</span>
              <span className="text-base font-extrabold text-primary tabular-nums">{formatPrice(preview.total)}</span>
            </div>

            <ul className="mt-4 flex flex-col gap-1.5 border-t border-surface-border pt-4 text-[11px] text-ink-muted">
              <li>✓ تراکنش روی بستر امن SSL</li>
              <li>✓ عدم ذخیره اطلاعات کارت بانکی</li>
              <li>✓ امکان لغو سفارش پیش از ارسال</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
