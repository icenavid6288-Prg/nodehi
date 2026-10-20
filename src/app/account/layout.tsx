import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccountNav } from '@/components/account/account-nav'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { buildMetadata } from '@/lib/seo'
import { getCurrentUser } from '@/lib/server/auth/session'
import { toPublicUser } from '@/lib/server/auth/users'

export const metadata: Metadata = buildMetadata({
  title: 'پنل کاربری',
  description: 'مدیریت سفارش‌ها، آدرس‌ها، علاقه‌مندی‌ها و امتیاز باشگاه مشتریان نودهی.',
  path: '/account',
  noIndex: true,
})

/**
 * پوسته پنل کاربری.
 *
 * محافظت از این بخش اینجا و **سمت سرور** انجام می‌شود، نه با کامپوننت کلاینت.
 * دلیل: اگر فقط کلاینت بررسی کند، صفحه و داده‌هایش ابتدا رندر و ارسال می‌شوند
 * و کاربر مهمان می‌تواند محتوای HTML را ببیند. با `redirect` سرور، هیچ بایتی
 * از محتوای خصوصی به مرورگر نمی‌رسد.
 *
 * خواندن کوکی، این بخش را پویا (dynamic) می‌کند که برای صفحات شخصی درست است.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?next=/account')
  }

  const publicUser = toPublicUser(user)

  return (
    <div className="container-page">
      <div className="py-4">
        <Breadcrumbs items={[{ name: 'پنل کاربری', path: '/account' }]} />
      </div>

      <div className="grid gap-6 pb-12 lg:grid-cols-[264px_1fr]">
        {/* کاربر از سرور می‌آید تا سایدبار بدون تأخیر شبکه پر شود */}
        <AccountNav user={publicUser} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
