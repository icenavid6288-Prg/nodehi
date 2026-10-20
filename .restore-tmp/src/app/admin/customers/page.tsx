import Link from 'next/link'
import type { Metadata } from 'next'
import { UserRoleSelect } from '@/components/admin/user-role-select'
import { prisma } from '@/lib/db'
import { buildMetadata } from '@/lib/seo'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate, formatPrice, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'مشتریان',
  description: 'فهرست مشتریان ثبت‌شده فروشگاه نودهی همراه با تعداد سفارش و مجموع خرید.',
  path: '/admin/customers',
  noIndex: true,
})

const ROLE_FILTERS = [
  { label: 'همه', value: '' },
  { label: 'مشتری', value: 'customer' },
  { label: 'اپراتور', value: 'operator' },
  { label: 'حسابدار', value: 'accountant' },
  { label: 'مدیر کل', value: 'admin' },
]

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string }
}) {
  const staff = await getStaffUser()
  const canManage = Boolean(staff && isAdminRole(staff.role))

  const search = (searchParams.q ?? '').trim()
  const roleFilter = ROLE_FILTERS.some((item) => item.value === searchParams.role)
    ? (searchParams.role as string)
    : ''

  const users = await prisma.user.findMany({
    where: {
      ...(roleFilter ? { role: roleFilter } : {}),
      // جست‌وجو روی شماره و نام؛ چون شماره یکتاست، هم‌پوشانی ندارد
      ...(search
        ? {
            OR: [
              { phone: { contains: search } },
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })

  // مجموع خرید هر مشتری در یک کوئری جداگانه — نه در حلقه (N+1)
  const spendGroups = users.length
    ? await prisma.order.groupBy({
        by: ['userId'],
        where: {
          userId: { in: users.map((user) => user.id) },
          status: { not: 'cancelled' },
        },
        _sum: { total: true },
        _count: { _all: true },
      })
    : []

  const spendByUser = new Map(
    spendGroups.map((group) => [
      group.userId as string,
      { total: group._sum.total ?? 0, orders: group._count._all },
    ]),
  )

  const isFiltered = Boolean(search || roleFilter)

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">مشتریان</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          {toPersianDigits(
            await prisma.user.count(),
          )}{' '}
          کاربر در دیتابیس ثبت شده است. این فهرست ۶۰ کاربر آخر را نشان می‌دهد؛ برای یافتن سریع، از جست‌وجو
          استفاده کنید.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/users"
            className="rounded-xl border border-surface-border px-3.5 py-2 text-xs text-ink-muted transition-colors hover:border-primary/30 hover:text-primary"
          >
            مرکز مدیریت نقش‌ها ←
          </Link>
          <Link
            href="/admin/users?role=operator"
            className="rounded-xl border border-surface-border px-3.5 py-2 text-xs text-ink-muted transition-colors hover:border-primary/30 hover:text-primary"
          >
            کارکنان (اپراتور، حسابدار، مدیر کل)
          </Link>
        </div>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-surface-border bg-white p-4">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5">
          <span className="text-xs text-ink-muted">جست‌وجو در نام، شماره یا ایمیل</span>
          <input
            name="q"
            defaultValue={search}
            placeholder="مثلاً ۰۹۱۲ یا مریم"
            className="h-11 rounded-xl border border-surface-border bg-white px-3.5 text-sm outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </label>

        {roleFilter ? <input type="hidden" name="role" value={roleFilter} /> : null}

        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-dark"
        >
          جست‌وجو
        </button>

        {isFiltered ? (
          <Link
            href="/admin/customers"
            className="flex h-11 items-center rounded-xl border border-surface-border px-4 text-sm text-ink-muted transition-colors hover:bg-surface-muted"
          >
            پاک کردن
          </Link>
        ) : null}
      </form>

      <nav aria-label="فیلتر نقش" className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((item) => {
          const active = roleFilter === item.value
          const params = new URLSearchParams()
          if (item.value) params.set('role', item.value)
          if (search) params.set('q', search)
          const query = params.toString()
          return (
            <Link
              key={item.value || 'all'}
              href={query ? `/admin/customers?${query}` : '/admin/customers'}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary/[0.06] text-primary'
                  : 'border-surface-border text-ink-muted hover:bg-surface-muted',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-14 text-center text-sm text-ink-muted">
          کاربری با این شرط پیدا نشد.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-border bg-white">
          <table className="w-full min-w-[720px] text-right text-xs">
            <thead>
              <tr className="bg-surface-muted text-ink-muted">
                <th className="px-4 py-3 font-medium">کاربر</th>
                <th className="px-4 py-3 font-medium">شماره همراه</th>
                <th className="px-4 py-3 font-medium">نقش</th>
                <th className="px-4 py-3 font-medium">سفارش</th>
                <th className="px-4 py-3 font-medium">مجموع خرید</th>
                <th className="px-4 py-3 font-medium">تاریخ عضویت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {users.map((user) => {
                const stat = spendByUser.get(user.id)
                const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
                return (
                  <tr key={user.id} className="hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-[11px] font-bold text-primary">
                          {name ? name.slice(0, 1) : '؟'}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/customers/${user.id}`}
                            className="block truncate font-medium text-ink hover:text-primary"
                          >
                            {name || 'بدون نام'}
                          </Link>
                          {user.email ? (
                            <p dir="ltr" className="truncate text-left text-[10px] text-ink-subtle">
                              {user.email}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="ltr-inline px-4 py-3 tabular-nums text-ink-muted">
                      {toPersianDigits(user.phone)}
                    </td>
                    <td className="px-4 py-3">
                      <UserRoleSelect
                        userId={user.id}
                        role={user.role}
                        isSelf={staff?.id === user.id}
                        canManage={canManage}
                      />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-muted">
                      {toPersianDigits(stat?.orders ?? 0)}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium text-ink">
                      {stat && stat.total > 0 ? formatPrice(stat.total) : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-subtle">{formatJalaliDate(user.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] leading-5 text-ink-subtle">
        روی نام هر کاربر بزنید تا پروفایل کامل او (سفارش‌ها، آدرس‌ها، نظرات و فعالیت حساب) باز شود. نقش
        کاربر را می‌توانید از روی همین ردیف هم عوض کنید (فقط مدیر کل). امتیاز باشگاه و جزئیات کامل در صفحهٔ
        پروفایل اصلاح می‌شود و همهٔ این عملیات در لاگ حسابرسی ثبت می‌گردد. نقش حساب خودتان و تنزل یا
        غیرفعال‌کردن آخرین مدیر کلِ فعال سامانه ممکن نیست تا دسترسی پنل قطع نشود.
      </p>
    </div>
  )
}
