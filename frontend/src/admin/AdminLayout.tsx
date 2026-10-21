import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toFa } from '../lib/format'

const links = [
  { to: '/admin', end: true, label: 'داشبورد', icon: '▤' },
  { to: '/admin/products', end: false, label: 'محصولات', icon: '▦' },
  { to: '/admin/orders', end: false, label: 'سفارش‌ها', icon: '🧾' },
  { to: '/admin/reviews', end: false, label: 'نظرات', icon: '★' },
  { to: '/admin/audit', end: false, label: 'گزارش فعالیت', icon: '◷' },
]

export default function AdminLayout() {
  const { user, ready, signOut } = useAuth()

  if (!ready) {
    return <div className="container-page py-20 text-center text-sm text-ink-muted">در حال بررسی دسترسی...</div>
  }

  if (!user) return <Navigate to="/login?next=/admin" replace />

  // کاربر عادی نباید حتی وجود مسیر مدیریت را ببیند؛ همان ۴۰۴ سایت نمایش
  // داده می‌شود، نه پیام «دسترسی ندارید».
  if (!['admin', 'operator'].includes(user.role)) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-extrabold">صفحه پیدا نشد</h1>
        <p className="mt-2 text-sm text-ink-muted">آدرسی که وارد کرده‌اید وجود ندارد.</p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
          بازگشت به خانه
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-30 border-b border-surface-border bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-sm font-extrabold text-primary">
              نودهی <span className="text-ink-subtle">/</span> پنل مدیریت
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="hidden text-ink-muted sm:inline">{user.fullName}</span>
            <Link to="/" className="rounded-lg border border-surface-border px-3 py-1.5 hover:border-secondary">
              نمایش سایت
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-surface-border px-3 py-1.5 text-danger hover:border-danger/40"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-6 lg:py-6">
        <aside className="lg:w-52 lg:shrink-0">
          <nav className="flex gap-1 overflow-x-auto lg:grid lg:gap-1" aria-label="منوی مدیریت">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-primary font-bold text-white'
                      : 'text-ink-muted hover:bg-white hover:text-primary'
                  }`
                }
              >
                <span aria-hidden className="text-xs opacity-80">
                  {link.icon}
                </span>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-3 hidden rounded-xl border border-surface-border bg-white p-3 text-[11px] leading-6 text-ink-subtle lg:block">
            هر تغییر در این پنل در «گزارش فعالیت» با نام کاربر ثبت می‌شود.
            <div className="mt-1">شمارهٔ شما: {toFa(user.phone)}</div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
