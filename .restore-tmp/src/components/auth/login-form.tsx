'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { toLatinDigits } from '@/lib/utils/format'

/** شماره‌های همراه ایران به قالب ۰۹xxxxxxxxx */
const MOBILE_PATTERN = /^09\d{9}$/

type Step = 'phone' | 'code'

/**
 * فرم ورود/ثبت‌نام دو مرحله‌ای.
 *
 * در نودهی ثبت‌نام و ورود یکی هستند: کاربر شماره می‌دهد، کد را تأیید می‌کند و
 * اگر حساب نداشته باشد خودکار ساخته می‌شود. این کم‌اصطکاک‌ترین الگو برای
 * فروشگاه ایرانی است.
 */
export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser, refresh } = useAuth()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const codeInputRef = useRef<HTMLInputElement>(null)

/**
   * مقصد بازگشت پس از ورود.
   * فقط مسیرهای نسبی پذیرفته می‌شوند تا از «بازگردانی باز» (open redirect)
   * به دامنه مهاجم جلوگیری شود.
   *
   * اگر `next` ندهیم، مقصد بر پایه نقش کاربر انتخاب می‌شود: کارکنان به پنل
   * مدیریت و مشتریان به پیشخوان خودشان می‌روند. باگ واقعی: همه به `/account`
   * می‌رفتند و مدیر راهی برای رسیدن به پنل پیدا نمی‌کرد.
   */
  const requestedNext = (() => {
    const raw = searchParams.get('next') ?? ''
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw
    return null
  })()

  // شمارش معکوس ارسال دوباره کد
  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = window.setInterval(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearInterval(timer)
  }, [secondsLeft])

  const requestCode = useCallback(
    async (targetPhone: string) => {
      setPending(true)
      setError('')
      try {
        const response = await fetch('/api/auth/otp/request', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: targetPhone }),
        })
        const data = await response.json()

        if (!response.ok || !data.ok) {
          setError(data?.error?.message ?? 'ارسال کد ناموفق بود. دوباره تلاش کنید.')
          return false
        }

        setStep('code')
        setCode('')
        setDevCode(data.devCode ?? null)
        setSecondsLeft(60)
        // فوکوس روی ورودی کد، پس از رندر مرحله دوم
        window.setTimeout(() => codeInputRef.current?.focus(), 50)
        return true
      } catch {
        setError('ارتباط با سرور برقرار نشد. اتصال خود را بررسی کنید.')
        return false
      } finally {
        setPending(false)
      }
    },
    [],
  )

  function submitPhone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = toLatinDigits(phone).replace(/\D/g, '')
    if (!MOBILE_PATTERN.test(normalized)) {
      setError('شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.')
      return
    }
    setPhone(normalized)
    void requestCode(normalized)
  }

  async function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = toLatinDigits(code).replace(/\D/g, '')
    if (normalized.length !== 5) {
      setError('کد ورود ۵ رقم است.')
      return
    }

    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, code: normalized }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setError(data?.error?.message ?? 'کد وارد‌شده درست نیست.')
        return
      }

      // کاربر از پاسخ ست می‌شود تا هدر بدون درخواست دوباره به‌روز شود
      setUser(data.user)
      void refresh()
      // کارکنان پیش‌فرض به پنل مدیریت می‌روند، نه پیشخوان مشتری
      const destination = requestedNext ?? (data.user?.isAdmin ? '/admin' : '/account')
      router.push(destination)
      router.refresh()
    } catch {
      setError('ارتباط با سرور برقرار نشد. اتصال خود را بررسی کنید.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-surface-border bg-white p-6 sm:p-7">
        <h1 className="text-lg font-extrabold text-ink">
          {step === 'phone' ? 'ورود یا ثبت‌نام' : 'کد ورود را وارد کنید'}
        </h1>
        <p className="mt-2 text-xs leading-6 text-ink-muted">
          {step === 'phone'
            ? 'شماره همراه خود را وارد کنید؛ کد ورود برایتان پیامک می‌شود. اگر حساب نداشته باشید، خودکار ساخته می‌شود.'
            : `کد ۵ رقمی ارسال‌شده به ${phone} را وارد کنید.`}
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-danger/[0.08] px-4 py-3 text-xs text-danger">
            {error}
          </p>
        ) : null}

        {/* راهنمای حالت توسعه — در تولید هرگز نمایش داده نمی‌شود چون سرور
            فیلد devCode را برنمی‌گرداند. */}
        {step === 'code' && devCode ? (
          <p className="mt-4 rounded-xl border border-dashed border-secondary/40 bg-secondary/[0.08] px-4 py-3 text-xs text-secondary-dark">
            حالت توسعه: سرویس پیامک متصل نیست، کد شما <span className="font-bold ltr-inline">{devCode}</span> است.
          </p>
        ) : null}

        {step === 'phone' ? (
          <form onSubmit={submitPhone} className="mt-5 flex flex-col gap-4" noValidate>
            <Field label="شماره همراه" htmlFor="login-phone">
              <Input
                id="login-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                dir="ltr"
                className="text-left"
                autoComplete="tel"
                autoFocus
                placeholder="09120000000"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  setError('')
                }}
                aria-describedby="login-phone-hint"
              />
            </Field>

            <Button type="submit" variant="primary" size="lg" disabled={pending}>
              {pending ? 'در حال ارسال کد…' : 'دریافت کد ورود'}
            </Button>

            <p id="login-phone-hint" className="text-[11px] leading-5 text-ink-subtle">
              با ورود، <Link href="/terms" className="text-primary hover:underline">قوانین و مقررات</Link> و{' '}
              <Link href="/privacy" className="text-primary hover:underline">حریم خصوصی</Link> نودهی را می‌پذیرید.
            </p>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-5 flex flex-col gap-4" noValidate>
            <Field label="کد ورود" htmlFor="login-code" hint="کد ۵ رقمی پیامک‌شده">
              <Input
                id="login-code"
                name="code"
                ref={codeInputRef}
                inputMode="numeric"
                dir="ltr"
                className="text-center text-lg font-bold tracking-[0.4em]"
                autoComplete="one-time-code"
                maxLength={5}
                placeholder="- - - - -"
                value={code}
                onChange={(event) => {
                  setCode(toLatinDigits(event.target.value).replace(/\D/g, '').slice(0, 5))
                  setError('')
                }}
                aria-describedby="login-code-status"
              />
            </Field>

            <p id="login-code-status" role="status" aria-live="polite" className="min-h-5 text-xs">
              {secondsLeft > 0 ? (
                <span className="text-ink-subtle">
                  ارسال دوباره کد تا {secondsLeft} ثانیه دیگر ممکن است.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void requestCode(phone)}
                  disabled={pending}
                  className="text-primary hover:underline disabled:opacity-50"
                >
                  ارسال دوباره کد
                </button>
              )}
            </p>

            <Button type="submit" variant="accent" size="lg" disabled={pending}>
              {pending ? 'در حال بررسی…' : 'ورود به حساب'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setCode('')
                setError('')
                setDevCode(null)
              }}
              className="text-xs text-ink-muted transition-colors hover:text-primary"
            >
              ← تغییر شماره همراه
            </button>
          </form>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-surface-border bg-surface-muted/60 p-5">
        <h2 className="text-xs font-bold text-ink">چرا ورود با شماره تلفن؟</h2>
        <ul className="mt-2.5 flex flex-col gap-1.5 text-[11px] leading-5 text-ink-muted">
          <li>✓ نیازی به حفظ کردن رمز عبور نیست.</li>
          <li>✓ شماره شما تأیید می‌شود، پس پیگیری سفارش و اطلاع‌رسانی ارسال دقیق کار می‌کند.</li>
          <li>✓ هیچ رمزی ذخیره نمی‌شود، پس چیزی برای لو رفتن وجود ندارد.</li>
        </ul>
      </div>
    </div>
  )
}
