import type { Metadata } from 'next'
import { InstallForm } from '@/components/install/install-form'
import { getInstallState } from '@/lib/server/install'
import { brand } from '@/config/brand'

export const metadata: Metadata = {
  title: 'نصب سایت',
  // صفحه نصب نباید ایندکس شود
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const CHECK_LABELS: Array<{ key: 'databaseConfigured' | 'migrationsApplied' | 'adminExists' | 'catalogSeeded'; label: string }> = [
  { key: 'databaseConfigured', label: 'اتصال دیتابیس (DATABASE_URL)' },
  { key: 'migrationsApplied', label: 'ساخت جداول (مهاجرت دیتابیس)' },
  { key: 'adminExists', label: 'حساب مدیر' },
  { key: 'catalogSeeded', label: 'داده اولیه (کاتالوگ و درگاه‌ها)' },
]

/**
 * ویزارد نصب سایت روی هاست.
 *
 * برای هاست‌هایی که فقط بیلد آماده را اجرا می‌کنند: پس از استقرار، این مسیر
 * را باز کنید و شماره مدیر را بگذارید؛ سرور خودش جداول را می‌سازد و داده
 * اولیه را می‌کارد. پس از کامل‌شدن نصب، همین صفحه برای همیشه پیام
 * «نصب‌شده» نشان می‌دهد و API آن ۴۰۴ می‌شود.
 *
 * مسیرهای جایگزین: `npm run setup` (CLI) همین کار را پیش از استقرار انجام می‌دهد.
 */
export default async function InstallPage() {
  const state = await getInstallState()

  if (state.installed) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-xl font-extrabold text-ink">سایت قبلاً نصب شده است</h1>
        <p className="text-sm leading-7 text-ink-muted">
          دیتابیس آماده و حساب مدیر ساخته شده است؛ مسیر نصب بسته شد. برای ورود به پنل مدیریت به{' '}
          <a href="/login?next=/admin" className="text-primary underline underline-offset-4">
            ورود کارکنان
          </a>{' '}
          بروید.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-extrabold text-ink">نصب {brand.name}</h1>
        <p className="text-sm leading-7 text-ink-muted">
          با واردکردن شماره همراه مدیر، سرور جداول دیتابیس را می‌سازد و داده اولیه (کاتالوگ، درگاه‌های پرداخت و
          حساب مدیر) را می‌کارد. چند ثانیه طول می‌کشد و پس از آن مسیر نصب برای همیشه بسته می‌شود.
        </p>
      </header>

      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <h2 className="text-sm font-bold text-ink">وضعیت فعلی</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {CHECK_LABELS.map((item) => {
            const ok = Boolean(state[item.key])
            return (
              <li key={item.key} className="flex items-center gap-2">
                <span className={ok ? 'text-success' : 'text-ink-subtle'}>{ok ? '✓' : '○'}</span>
                <span className={ok ? 'text-ink' : 'text-ink-muted'}>{item.label}</span>
              </li>
            )
          })}
        </ul>
        {!state.prismaCliAvailable ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-700">
            ⚠️ ابزار پریسما روی سرور نصب نیست؛ پیش از شروع، <span className="ltr-inline font-bold">npm install</span>{' '}
            را اجرا کنید (یا نصب را با <span className="ltr-inline font-bold">npm run setup</span> روی سرور انجام دهید).
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <InstallForm tokenRequired={state.tokenRequired} />
      </section>

      <p className="text-center text-xs leading-6 text-ink-subtle">
        برای تنظیمات تکمیلی (پیامک، درگاه پرداخت، دامنه) پس از نصب به پنل مدیریت مراجعه کنید.
      </p>
    </div>
  )
}
