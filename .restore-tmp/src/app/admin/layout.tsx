import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AdminNav, type AdminNavBadges } from '@/components/admin/admin-nav'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { buildMetadata } from '@/lib/seo'
import { getAdminNavCounts, getStaffUser, STAFF_ROLE_LABELS } from '@/lib/server/admin'
import { getCurrentUser } from '@/lib/server/auth/session'

export const metadata: Metadata = buildMetadata({
  title: 'پنل مدیریت',
  description: 'مدیریت سفارش‌ها، مشتریان، کمپین‌ها و گزارش‌های فروشگاه نودهی.',
  path: '/admin',
  noIndex: true,
})

/**
 * پوسته پنل مدیریت.
 *
 * کنترل دسترسی سمت سرور و پیش از رندر انجام می‌شود:
 *  • مهمان → صفحه ورود با بازگشت به همین مسیر
 *  • کاربر عادی (نقش customer) → ۴۰۴؛ عمداً «دسترسی ندارید» نمی‌گوییم تا
 *    وجود مسیر مدیریت برای کاربر عادی افشا نشود.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffUser()

  if (!staff) {
    const user = await getCurrentUser()
    if (!user) redirect('/login?next=/admin')
    // کاربر وارد‌شده اما بدون نقش مدیریتی — مسیر را ناموجود جلوه می‌دهیم.
    // از notFound() استفاده می‌کنیم (نه redirect به مسیر ناموجود) تا همان
    // صفحه ۴۰۴ خود سایت با کد وضعیت درست ۴۰۴ رندر شود.
    notFound()
  }

  // شمارش کارهای معوق — در پوسته خوانده می‌شود تا نشان‌ها در همهٔ صفحه‌های پنل
  // یکسان دیده شوند، نه فقط در داشبورد
  const counts = await getAdminNavCounts()
  const badges: AdminNavBadges = {
    '/admin/products': { count: counts.inactiveProducts, title: 'کالای غیرفعال (خارج از فروشگاه)' },
    '/admin/orders': { count: counts.unpaidOnlineOrders, title: 'سفارش آنلاین پرداخت‌نشده' },
    '/admin/reviews': { count: counts.pendingReviews, title: 'نظر در انتظار تأیید' },
    '/admin/messages': { count: counts.newMessages, title: 'پیام خوانده‌نشده' },
    '/admin/stock-alerts': { count: counts.activeStockAlerts, title: 'هشدار موجودی در انتظار' },
  }

  return (
    <div className="container-page">
      <div className="py-4">
        <Breadcrumbs items={[{ name: 'پنل مدیریت', path: '/admin' }]} />
      </div>

      <div className="grid gap-6 pb-12 lg:grid-cols-[264px_1fr]">
        <AdminNav
          badges={badges}
          user={{
            displayName: [staff.firstName, staff.lastName].filter(Boolean).join(' ') || staff.phone,
            role: staff.role,
            roleLabel: STAFF_ROLE_LABELS[staff.role] ?? staff.role,
          }}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
