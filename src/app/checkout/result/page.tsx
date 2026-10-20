import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ButtonLink } from '@/components/ui/button'
import { zarinpalErrorMessage } from '@/lib/server/payments/zarinpal'
import { cleanText } from '@/lib/server/validation'
import { cn } from '@/lib/utils/cn'

export const metadata: Metadata = {
  title: 'نتیجه پرداخت',
  // صفحه نتیجه پرداخت هرگز نباید در موتور جست‌وجو ایندکس شود: نه ارزش
  // محتوایی دارد و نه لینکش باید عمومی شود.
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

/** وضعیت‌هایی که ممکن است در آدرس بیایند — هر مقدار دیگری `unknown` می‌شود */
const STATES = ['paid', 'already_paid', 'failed', 'unverifiable', 'unknown'] as const
type PaymentState = (typeof STATES)[number]

interface StateCopy {
  tone: 'success' | 'info' | 'warning' | 'danger'
  title: string
  description: string
}

/**
 * متن هر وضعیت.
 * متن‌ها در کد می‌مانند (و در آدرس منتقل نمی‌شوند) تا صفحه نتیجه هرگز
 * محتوای دلخواه مهاجم را نمایش ندهد.
 */
const COPY: Record<PaymentState, StateCopy> = {
  paid: {
    tone: 'success',
    title: 'پرداخت شما با موفقیت انجام شد',
    description:
      'پرداخت تأیید شد و سفارش شما در حال آماده‌سازی است. پیامک تأیید به شماره همراه ثبت‌شده ارسال می‌شود.',
  },
  already_paid: {
    tone: 'info',
    title: 'پرداخت این سفارش پیش‌تر تأیید شده است',
    description:
      'این تراکنش قبلاً تأیید شده بود؛ نیازی به پرداخت دوباره نیست. اگر مبلغی دوباره از حساب شما کسر شده باشد، تا ۷۲ ساعت آینده به‌صورت خودکار بازمی‌گردد.',
  },
  failed: {
    tone: 'danger',
    title: 'پرداخت انجام نشد',
    description:
      'تراکنش از سوی درگاه تأیید نشد و مبلغی از حساب شما کسر نشده است. سفارش شما ثبت شده و پرداخت آن را می‌توانید دوباره انجام دهید.',
  },
  unverifiable: {
    tone: 'warning',
    title: 'تأیید پرداخت هنوز قطعی نیست',
    description:
      'ارتباط ما با درگاه هنگام تأیید برقرار نشد. اگر مبلغ را پرداخت کرده‌اید، پول شما نزد درگاه محفوظ است و وضعیت سفارش به‌زودی به‌روزرسانی می‌شود؛ شماره سفارش را نگه دارید و با پشتیبانی تماس بگیرید.',
  },
  unknown: {
    tone: 'warning',
    title: 'نتیجه پرداخت مشخص نیست',
    description:
      'می‌توانیم نتیجه این تراکنش را پیدا کنیم. اگر مبلغی کسر شده است، در فهرست پرداخت‌های بانکی خود کد پیگیری را ببینید و با پشتیبانی تماس بگیرید.',
  },
}

const TONES: Record<StateCopy['tone'], { badge: string; icon: string; ring: string }> = {
  success: { badge: 'bg-success/10 text-success', icon: '✓', ring: 'border-success/30' },
  info: { badge: 'bg-secondary/10 text-secondary-dark', icon: '✓', ring: 'border-secondary/30' },
  warning: { badge: 'bg-amber-50 text-amber-700', icon: '!', ring: 'border-amber-200' },
  danger: { badge: 'bg-danger/10 text-danger', icon: '✕', ring: 'border-danger/30' },
}

/**
 * صفحه نتیجه پرداخت.
 * GET /checkout/result?state=paid&order=ND-123456&code=-51
 *
 * این صفحه فقط نمایش می‌دهد و هیچ‌چیز را تغییر نمی‌دهد؛ تسویه پیش از رسیدن
 * کاربر (در مسیر callback) انجام شده است. اگر کاربر همین آدرس را رفرش کند،
 * صرفاً همان نتیجه را می‌بیند.
 */
export default function PaymentResultPage({
  searchParams,
}: {
  searchParams: { state?: string; order?: string; code?: string }
}) {
  const rawState = cleanText(searchParams.state, 20)
  const state: PaymentState = (STATES as readonly string[]).includes(rawState)
    ? (rawState as PaymentState)
    : 'unknown'

  const orderNumber = cleanText(searchParams.order, 30) || null
  const parsedCode = Number.parseInt(cleanText(searchParams.code, 8), 10)
  const code = Number.isFinite(parsedCode) ? parsedCode : null

  const copy = COPY[state]
  const tone = TONES[copy.tone]

  // متن دقیق خطای درگاه روی توصیف عمومی سوار می‌شود تا کاربر فقط
  // «پرداخت انجام نشد» نبیند؛ مثلاً خطای ‎-51 یعنی خود کاربر لغو کرده است.
  const specifics =
    state === 'failed' && code !== null ? zarinpalErrorMessage(code, '') : ''

  return (
    <div className="container-page">
      <div className="py-4">
        <Breadcrumbs
          items={[
            { name: 'سبد خرید', path: '/cart' },
            { name: 'تسویه حساب', path: '/checkout' },
            { name: 'نتیجه پرداخت', path: '/checkout/result' },
          ]}
        />
      </div>

      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-2xl border border-surface-border bg-white px-6 py-14 text-center">
        <span
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full text-2xl font-extrabold',
            tone.badge,
          )}
          aria-hidden
        >
          {tone.icon}
        </span>

        <div>
          <h1 className="text-lg font-extrabold text-ink">{copy.title}</h1>
          {orderNumber ? (
            <p className="mt-2 text-sm leading-7 text-ink-muted">
              شماره سفارش:{' '}
              <span className="ltr-inline font-bold text-primary">{orderNumber}</span>
            </p>
          ) : null}
        </div>

        <div className={cn('w-full rounded-xl border px-4 py-3 text-xs leading-6', tone.ring)}>
          <p className="text-ink-muted">{copy.description}</p>
          {specifics ? <p className="mt-2 font-bold text-ink">{specifics}</p> : null}
          {code !== null && state === 'failed' ? (
            <p className="mt-2 text-[11px] text-ink-subtle">
              کد پیگیری خطا در درگاه: <span className="ltr-inline">{code}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {orderNumber ? (
            <ButtonLink href={`/track?order=${encodeURIComponent(orderNumber)}`} variant="primary" size="md">
              پیگیری سفارش
            </ButtonLink>
          ) : null}
          <ButtonLink href="/account/orders" variant="outline" size="md">
            سفارش‌های من
          </ButtonLink>
          <ButtonLink href="/cart" variant="ghost" size="md">
            بازگشت به سبد خرید
          </ButtonLink>
        </div>

        <p className="text-[11px] leading-6 text-ink-subtle">
          اگر مبلغی از حساب شما کسر شده ولی سفارش پرداخت‌شده نیست، حتماً شماره سفارش و کد پیگیری بانکی را برای
          پشتیبانی بفرستید.
        </p>
      </div>
    </div>
  )
}
