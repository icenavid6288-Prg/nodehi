import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { post, type AuthUser } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useNoindex } from '../lib/seo'

type OtpRequest = { ok: boolean; devCode?: string; expiresIn: number; message: string }
type OtpVerify = { ok: boolean; token: string; user: AuthUser }

export default function Login() {
  useNoindex('ورود / ثبت‌نام', '/login')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rawNext = searchParams.get('next') ?? ''
  // فقط مسیر داخلی مجاز است تا پارامتر next به بازکردن مقصد بیرونی تبدیل نشود.
  const nextPath = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/account'
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function requestOtp(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await post<OtpRequest>('/auth/otp/request', { phone })
      setDevCode(result.devCode ?? null)
      setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال کد ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await post<OtpVerify>('/auth/otp/verify', { phone, code })
      signIn(result.token, result.user)
      navigate(nextPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'کد وارد شده معتبر نیست.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-page py-14">
      <div className="mx-auto max-w-sm rounded-2xl border border-surface-border bg-white p-6 shadow-card">
        <h1 className="text-xl font-extrabold">ورود به نودهی</h1>
        <p className="mt-1 text-xs leading-6 text-ink-muted">
          ورود با شماره همراه و کد یک‌بارمصرف انجام می‌شود؛ رمز عبوری لازم نیست.
        </p>

        {step === 'phone' ? (
          <form onSubmit={requestOtp} className="mt-5 grid gap-3">
            <label className="block text-xs">
              <span className="mb-1 block text-ink-muted">شماره همراه</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                placeholder="09120000000"
                required
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-sm ltr-inline"
              />
            </label>
            {error && <p className="rounded-xl bg-danger/10 p-3 text-xs text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary py-3 text-sm font-extrabold text-white hover:bg-primary-light disabled:opacity-60"
            >
              {loading ? 'در حال ارسال...' : 'دریافت کد ورود'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-5 grid gap-3">
            <p className="text-xs text-ink-muted">کد ۵ رقمی ارسال‌شده به {phone} را وارد کنید.</p>
            {devCode && (
              <p className="rounded-xl bg-secondary/10 p-3 text-xs text-secondary-dark">
                حالت توسعه: کد شما <span className="ltr-inline font-extrabold">{devCode}</span> است.
              </p>
            )}
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              maxLength={5}
              required
              className="h-11 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-center text-lg tracking-[0.4em] ltr-inline"
            />
            {error && <p className="rounded-xl bg-danger/10 p-3 text-xs text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary py-3 text-sm font-extrabold text-white hover:bg-primary-light disabled:opacity-60"
            >
              {loading ? 'در حال بررسی...' : 'ورود به حساب'}
            </button>
            <button type="button" onClick={() => setStep('phone')} className="text-xs text-ink-muted hover:text-primary">
              تغییر شماره همراه
            </button>
          </form>
        )}

        <p className="mt-5 border-t border-surface-border pt-4 text-center text-[11px] text-ink-subtle">
          با ورود، <Link to="/terms" className="text-ink-muted hover:text-primary">قوانین</Link> و{' '}
          <Link to="/privacy" className="text-ink-muted hover:text-primary">حریم خصوصی</Link> را می‌پذیرید.
        </p>
      </div>
    </div>
  )
}
