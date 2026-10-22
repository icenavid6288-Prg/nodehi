import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useCatalog } from '../context/CatalogContext'
import { useAuth } from '../context/AuthContext'
import { toFa } from '../lib/format'
import { CartIcon, CompareIcon, MenuIcon, SearchIcon, UserIcon } from './icons'
import AnalyticsTags from './AnalyticsTags'
import MobileMenu from './MobileMenu'
import CompareBar from './CompareBar'
import { useCompare } from '../context/CompareContext'

const navLinks = [
  { to: '/shop', label: 'فروشگاه' },
  { to: '/blog', label: 'مقالات' },
  { to: '/about', label: 'درباره نودهی' },
  { to: '/track', label: 'پیگیری سفارش' },
  { to: '/contact', label: 'تماس با ما' },
]

const serviceLinks = [
  { to: '/guides', label: 'راهنمای خرید لوازم خانگی' },
  { to: '/faq', label: 'سوالات متداول' },
  { to: '/loyalty', label: 'باشگاه مشتریان' },
  { to: '/track', label: 'پیگیری سفارش' },
]

const legalLinks = [
  { to: '/terms', label: 'قوانین و مقررات' },
  { to: '/privacy', label: 'حریم خصوصی' },
]

export default function Layout() {
  const { categories } = useCatalog()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { count } = useCart()
  const { count: compareCount } = useCompare()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AnalyticsTags />
      <div className="bg-primary text-white">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <span className="opacity-80">ارسال سریع به سراسر ایران · ضمانت اصالت کالا</span>
          <span className="hidden opacity-80 sm:block">۰۲۱-۹۱۰۰۰۰۰۰</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-surface-border bg-white/95 backdrop-blur">
        <div className="container-page flex h-16 items-center gap-3">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-surface-border text-primary transition hover:border-secondary/50 hover:bg-surface-muted lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="باز کردن منو"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <MenuIcon />
          </button>

          <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="نودهی — صفحه اصلی">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">
              <CartIcon className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-extrabold text-primary">نودهی</span>
              <span className="block text-[11px] text-ink-muted">لوازم خانگی مطمئن</span>
            </span>
          </Link>

          <form onSubmit={submitSearch} className="relative mx-auto hidden w-full max-w-xl md:block" role="search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجوی محصول، برند یا دسته‌بندی..."
              aria-label="جستجوی محصولات"
              className="h-11 w-full rounded-xl border border-surface-border bg-surface-muted pr-11 pl-24 text-sm outline-none transition focus:border-secondary focus:bg-white"
            />
            <SearchIcon className="pointer-events-none absolute right-3.5 top-3 h-5 w-5 text-ink-subtle" />
            <button
              type="submit"
              className="absolute left-1.5 top-1.5 h-8 rounded-lg bg-primary px-4 text-xs font-bold text-white hover:bg-primary-light"
            >
              جستجو
            </button>
          </form>

          <div className="mr-auto flex items-center gap-1 md:mr-0">
            {user && (user.role === 'admin' || user.role === 'operator') && (
              <Link
                to="/admin"
                className="hidden rounded-xl border border-secondary/40 px-3 py-2 text-xs font-bold text-secondary-dark hover:bg-secondary/10 sm:flex"
              >
                پنل مدیریت
              </Link>
            )}
            <Link
              to={user ? '/account' : '/login'}
              className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface-muted sm:flex"
            >
              <UserIcon />
              <span className="hidden md:inline">{user ? user.fullName.split(' ')[0] : 'ورود / ثبت‌نام'}</span>
            </Link>
            <Link
              to="/compare"
              className="relative hidden items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface-muted sm:flex"
              aria-label={`مقایسهٔ محصولات، ${toFa(compareCount)} کالا`}
            >
              <CompareIcon />
              <span className="hidden md:inline">مقایسه</span>
              {compareCount > 0 && (
                <span className="absolute -top-0.5 right-1 grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
                  {toFa(compareCount)}
                </span>
              )}
            </Link>
            <Link
              to="/cart"
              className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface-muted"
              aria-label={`سبد خرید، ${toFa(count)} کالا`}
            >
              <CartIcon />
              <span className="hidden sm:inline">سبد خرید</span>
              {count > 0 && (
                <span className="absolute -top-0.5 right-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {toFa(count)}
                </span>
              )}
            </Link>
          </div>
        </div>

      </header>

      <div id="mobile-menu">
        <MobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          categories={categories}
          user={user}
          cartCount={count}
          compareCount={compareCount}
        />
      </div>

      <nav className="hidden border-b border-surface-border bg-white lg:block" aria-label="دسته‌بندی کالاها">
        <div className="container-page no-scrollbar flex gap-1 overflow-x-auto py-1">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ink-muted transition hover:bg-surface-muted hover:text-primary"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <CompareBar />

      <footer className="mt-14 border-t border-surface-border bg-white">
        <div className="container-page grid gap-8 py-10 md:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-white">
                <CartIcon className="h-4 w-4" />
              </span>
              <span className="text-lg font-extrabold text-primary">نودهی</span>
            </div>
            <p className="text-sm leading-7 text-ink-muted">
              فروشگاه اینترنتی لوازم خانگی با ضمانت اصالت کالا، گارانتی معتبر و ارسال سریع به سراسر ایران.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold">دسترسی سریع</h3>
            <ul className="grid gap-2 text-sm text-ink-muted">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link className="hover:text-primary" to={link.to}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold">خدمات مشتریان</h3>
            <ul className="grid gap-2 text-sm text-ink-muted">
              {serviceLinks.map((link) => (
                <li key={link.to + link.label}>
                  <Link className="hover:text-primary" to={link.to}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold">تماس با ما</h3>
            <ul className="grid gap-2 text-sm text-ink-muted">
              <li>۰۲۱-۹۱۰۰۰۰۰۰</li>
              <li>info@nodehi.ir</li>
              <li>تهران، خیابان ولیعصر، پلاک ۱۲۳</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-surface-border py-4">
          <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-ink-subtle sm:flex-row">
            <span>© ۱۴۰۵ نودهی — تمامی حقوق محفوظ است.</span>
            <ul className="flex flex-wrap items-center gap-4">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link className="hover:text-primary" to={link.to}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}
