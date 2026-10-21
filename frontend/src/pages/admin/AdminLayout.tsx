import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { CartIcon, ShieldIcon } from '../../components/icons'
import { useNoindex } from '../../lib/seo'

const links = [
  { to: '/admin/products', label: 'محصولات' },
  { to: '/admin/orders', label: 'سفارش‌ها' },
  { to: '/admin/coupons', label: 'کدهای تخفیف' },
  { to: '/admin/reviews', label: 'نظرات' },
]

export default function AdminLayout() {
  const { user, ready, signOut } = useAuth()
  const location = useLocation()
  useNoindex('پنل مدیریت', location.pathname)

  if (!ready) {
    return <p className="container-page py-16 text-center text-sm text-ink-muted">در حال بررسی دسترسی...</p>
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (user.role !== 'admin' && user.role !== 'operator') {
    return (
      <div className="container-page py-16 text-center">
        <ShieldIcon className="mx-auto h-10 w-10 text-ink-subtle" />
        <h1 className="mt-4 text-xl font-extrabold">دسترسی به پنل مدیریت ندارید</h1>
        <p className="mt-2 text-sm text-ink-muted">
          این بخش فقط برای مدیران و اپراتورهای فروشگاه است.
        </p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
          بازگشت به فروشگاه
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-40 border-b border-surface-border bg-primary text-white">
        <div className="container-page flex h-16 items-center gap-4">
          <Link to="/admin/products" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10">
              <CartIcon className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-extrabold">نودهی</span>
              <span className="block text-[10px] text-white/70">پنل مدیریت</span>
            </span>
          </Link>

          <div className="mr-auto flex items-center gap-2 text-xs">
            <span className="hidden text-white/70 sm:inline">{user.fullName} — {user.phone}</span>
            <Link to="/" className="rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10">
              فروشگاه
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20"
            >
              خروج
            </button>
          </div>
        </div>

        <nav className="container-page no-scrollbar flex gap-1 overflow-x-auto pb-1" aria-label="بخش‌های پنل مدیریت">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-t-lg px-4 py-2.5 text-xs font-bold transition ${
                  isActive ? 'bg-surface-muted text-primary' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="container-page py-6">
        <Outlet />
      </main>
    </div>
  )
}
