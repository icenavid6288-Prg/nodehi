import Link from 'next/link'
import type { Metadata } from 'next'
import { UserRoleSelect, UserStatusToggle } from '@/components/admin/user-role-select'
import { prisma } from '@/lib/db'
import { ALL_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, isStaffRoleValue, type UserRole } from '@/lib/roles'
import { buildMetadata } from '@/lib/seo'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate, formatPrice, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'کاربران و نقش‌ها',
  description: 'مدیریت کاربران فروشگاه نودهی: تغییر نقش، فعال و غیرفعال کردن حساب و شمارش هر نقش.',
  path: '/admin/users',
  noIndex: true,
})

/**
 * صفحهٔ «کاربران و نقش‌ها».
 *
 * چرا این صفحه لازم بود: تغییر نقش کاربر وجود داشت، اما فقط از پروفایل هر کاربر
 * و دو کلیک عمیق‌تر در دسترس بود. اینجا همهٔ کاربران با نقش فعلی‌شان دیده
 * می‌شوند و نقش از روی همان ردیف عوض می‌شود.
 *
 * کنترل نقش از سرور می‌آید: اپراتور و حسابدار صفحه را می‌بینند ولی کنترل تغییر
 * نقش ندارند؛ تصمیم نهایی هم سمت سرور گرفته می‌شود (`/api/admin/users/:id`).
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string }
}) {
  const staff = await getStaffUser()
  const canManage = Boolean(staff && isAdminRole(staff.role))

  const search = (searchParams.q ?? '').trim()
  const roleFilter = (ALL_ROLES as string[]).includes(searchParams.role ?? '')
    ? (searchParams.role as UserRole)
    : null

  const [users, roleGroups, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...(roleFilter ? { role: roleFilter } : {}),
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
      take: 200,
    }),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.count(),
  ])

  // مجموع خرید هر کاربر در یک کوئری جداگانه — نه در حلقه (N+1)
  const spendGroups = users.length
    ? await prisma.order.groupBy({
        by: ['userId'],
        where: { userId: { in: users.map((user) => user.id) }, status: { not: 'cancelled' } },
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

  const countByRole = new Map(roleGroups.map((group) => [group.role, group._count._all]))

  // کارکنان اول فهرست بیایند تا کاربران با دسترسی پنل در نگاه اول دیده شوند
  const ordered = [...users].sort((a, b) => {
    const aStaff = isStaffRoleValue(a.role) ? 0 : 1
    const bStaff = isStaffRoleValue(b.role) ? 0 : 1
    if (aStaff !== bStaff) return aStaff - bStaff
    return 0
  })

  const isFiltered = Boolean(search || roleFilter)

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">کاربران و نقش‌ها</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          {toPersianDigits(total)} کاربر در دیتابیس ثبت شده است. نقش هر کاربر را از روی همین فهرست
          می‌توانید عوض کنید؛ هر تغییر در لاگ حسابرسی با نام شما ثبت می‌شود.
        </p>
      </header>

      {/* راهنمای دسترسی نقش‌ها — تا معلوم باشد هر نقش دقیقاً چه می‌تواند بکند */}
      <section className="rounded-2xl border border-surface-border bg-white p-5">
        <h2 className="text-sm font-bold text-ink">هر نقش چه دسترسی‌ای دارد؟</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_ROLES.map((item) => (
            <div
              key={item}
              className={cn(
                'rounded-xl border px-4 py-3',
                item === 'admin' ? 'border-primary/30 bg-primary/[0.04]' : 'border-surface-border',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-ink">{ROLE_LABELS[item]}</span>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] tabular-nums text-ink-muted">
                  {toPersianDigits(countByRole.get(item) ?? 0)} نفر
                </span>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-ink-subtle">{ROLE_DESCRIPTIONS[item]}</p>
            </div>
          ))}
        </div>
        {!canManage ? (
          <p className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-[11px] leading-5 text-ink-muted">
            نقش شما اجازهٔ تغییر کاربران را نمی‌دهد؛ این فهرست فقط‌خواندنی است. تغییر نقش و وضعیت حساب
            تنها کار «مدیر کل» است.
          </p>
        ) : (
          <p className="mt-4 text-[11px] leading-5 text-ink-subtle">
            دو محافظت همیشگی: نقش حساب خودتان قابل تغییر نیست، و «آخرین مدیر کلِ فعال» نه تنزل‌پذیر است و
            نه غیرفعال‌شدنی — وگرنه هیچ‌کس به پنل دسترسی نمی‌داشت.
          </p>
        )}
      </section>

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
            href="/admin/users"
            className="flex h-11 items-center rounded-xl border border-surface-border px-4 text-sm text-ink-muted transition-colors hover:bg-surface-muted"
          >
            پاک کردن
          </Link>
        ) : null}
      </form>

      <nav aria-label="فیلتر نقش" className="flex flex-wrap gap-2">
        <FilterTab label="همه" count={total} active={roleFilter === null} href={tabHref(null, search)} />
        {ALL_ROLES.map((item) => (
          <FilterTab
            key={item}
            label={ROLE_LABELS[item]}
            count={countByRole.get(item) ?? 0}
            active={roleFilter === item}
            href={tabHref(item, search)}
          />
        ))}
      </nav>

      {ordered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-border bg-white px-6 py-14 text-center text-sm text-ink-muted">
          کاربری با این شرط پیدا نشد.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-border bg-white">
          <table className="w-full min-w-[900px] text-right text-xs">
            <thead>
              <tr className="bg-surface-muted text-ink-muted">
                <th className="px-4 py-3 font-medium">کاربر</th>
                <th className="px-4 py-3 font-medium">نقش</th>
                <th className="px-4 py-3 font-medium">وضعیت حساب</th>
                <th className="px-4 py-3 font-medium">سفارش</th>
                <th className="px-4 py-3 font-medium">مجموع خرید</th>
                <th className="px-4 py-3 font-medium">آخرین ورود</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">پروفایل</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {ordered.map((user) => {
                const stat = spendByUser.get(user.id)
                const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
                const isSelf = staff?.id === user.id
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
                          <p className="ltr-inline truncate text-[10px] tabular-nums text-ink-subtle">
                            {toPersianDigits(user.phone)}
                          </p>
                        </div>
                        {isSelf ? (
                          <span className="shrink-0 rounded-full bg-primary/[0.08] px-2 py-0.5 text-[10px] text-primary">
                            شما
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <UserRoleSelect
                        userId={user.id}
                        role={user.role}
                        isSelf={isSelf}
                        canManage={canManage}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <UserStatusToggle
                        userId={user.id}
                        isActive={user.isActive}
                        isSelf={isSelf}
                        canManage={canManage}
                      />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-muted">
                      {toPersianDigits(stat?.orders ?? 0)}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-medium text-ink">
                      {stat && stat.total > 0 ? formatPrice(stat.total) : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-subtle">
                      {user.lastLoginAt ? formatJalaliDate(user.lastLoginAt) : 'ثبت نشده'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${user.id}`}
                        className="whitespace-nowrap text-[11px] text-primary hover:underline"
                      >
                        پروفایل ←
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] leading-5 text-ink-subtle">
        این فهرست تا ۲۰۰ کاربر آخر را نشان می‌دهد؛ برای یافتن سریع از جست‌وجو و فیلتر نقش استفاده کنید.
        جزئیات کامل هر کاربر (سفارش‌ها، آدرس‌ها، نظرات و فعالیت) در صفحهٔ پروفایل اوست.
      </p>
    </div>
  )
}

/** پیوند یک تب فیلتر با نگه‌داشتن عبارت جست‌وجو */
function tabHref(role: UserRole | null, search: string): string {
  const params = new URLSearchParams()
  if (role) params.set('role', role)
  if (search) params.set('q', search)
  const query = params.toString()
  return query ? `/admin/users?${query}` : '/admin/users'
}

function FilterTab({
  label,
  count,
  active,
  href,
}: {
  label: string
  count: number
  active: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary/[0.06] text-primary'
          : 'border-surface-border text-ink-muted hover:bg-surface-muted',
      )}
    >
      {label}
      <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] tabular-nums text-ink-subtle">
        {toPersianDigits(count)}
      </span>
    </Link>
  )
}
