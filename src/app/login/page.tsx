import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { buildMetadata } from '@/lib/seo'
import { getCurrentUser } from '@/lib/server/auth/session'
import { isStaffRole } from '@/lib/server/auth/users'

export const metadata: Metadata = buildMetadata({
  title: 'ورود و ثبت‌نام',
  description: 'ورود یا ثبت‌نام سریع در فروشگاه نودهی با شماره همراه و کد پیامکی.',
  path: '/login',
  noIndex: true,
})

/**
 * صفحه ورود.
 * اگر کاربر از قبل وارد شده باشد، بی‌دلیل فرم نشان داده نمی‌شود و به پنل
 * هدایت می‌گردد.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  const user = await getCurrentUser()
  if (user) {
    // ⚠️ باید پیش از رندر فرم باشد؛ `useSearchParams` در فرم نمی‌تواند
    // ریدایرکت سمت سرور انجام دهد و کاربرِ وارد‌شده فرم بی‌فایده می‌دید.
    const requested = (searchParams.next ?? '').trim()
    const safeNext = requested.startsWith('/') && !requested.startsWith('//') ? requested : null
    redirect(safeNext ?? (isStaffRole(user.role) ? '/admin' : '/account'))
  }

  return (
    <div className="container-page">
      <div className="py-4">
        <Breadcrumbs items={[{ name: 'ورود و ثبت‌نام', path: '/login' }]} />
      </div>

      <div className="pb-14 pt-2">
        <Suspense
          fallback={
            <div className="mx-auto w-full max-w-md rounded-2xl border border-surface-border bg-white p-12 text-center text-sm text-ink-muted">
              در حال بارگذاری…
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
