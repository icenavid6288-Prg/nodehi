import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import type { AuthUser, Category } from '../lib/api'
import { toFa } from '../lib/format'
import {
  CartIcon,
  CategoryIcon,
  CloseIcon,
  CompareIcon,
  PhoneIcon,
  SearchIcon,
  ShieldIcon,
  TruckIcon,
  UserIcon,
} from './icons'

const quickLinks = [
  { to: '/shop', label: 'فروشگاه' },
  { to: '/blog', label: 'مقالات' },
  { to: '/guides', label: 'راهنمای خرید' },
  { to: '/loyalty', label: 'باشگاه مشتریان' },
  { to: '/track', label: 'پیگیری سفارش' },
  { to: '/about', label: 'دربارهٔ نودهی' },
  { to: '/contact', label: 'تماس با ما' },
]

/**
 * منوی کشویی موبایل.
 *
 * کشو از سمت راست باز می‌شود، اسکرول صفحه را قفل می‌کند و با Esc بسته
 * می‌شود. همیشه در DOM است تا گذار (transition) نرم اجرا شود.
 */
export default function MobileMenu({
  open,
  onClose,
  categories,
  user,
  cartCount,
  compareCount,
}: {
  open: boolean
  onClose: () => void
  categories: Category[]
  user: AuthUser | null
  cartCount: number
  compareCount: number
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const closeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop')
    setQuery('')
    onClose()
  }

  const isStaff = user && (user.role === 'admin' || user.role === 'operator')

  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        aria-label="بستن منو"
        className={`absolute inset-0 h-full w-full bg-primary-dark/55 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="منوی فروشگاه"
        className={`absolute inset-y-0 right-0 flex w-[88%] max-w-[23rem] flex-col overflow-y-auto bg-white shadow-float transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="sticky top-0 z-10 bg-gradient-to-l from-primary to-primary-dark px-4 pb-4 pt-4 text-white">
          <div className="flex items-center justify-between">
            <Link to="/" onClick={onClose} className="flex items-center gap-2.5" aria-label="نودهی — صفحه اصلی">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
                <CartIcon className="h-5 w-5" />
              </span>
              <span className="leading-tight">
                <span className="block text-base font-extrabold">نودهی</span>
                <span className="block text-[10px] text-white/70">لوازم خانگی مطمئن</span>
              </span>
            </Link>

            <button
              type="button"
              ref={closeRef}
              onClick={onClose}
              aria-label="بستن منو"
              tabIndex={open ? 0 : -1}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={submitSearch} className="relative mt-4" role="search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجوی محصول، برند یا دسته..."
              aria-label="جستجوی محصولات"
              tabIndex={open ? 0 : -1}
              className="h-11 w-full rounded-xl border border-white/15 bg-white/10 pr-10 pl-3 text-sm text-white placeholder:text-white/60 outline-none transition focus:border-secondary-light focus:bg-white/15"
            />
            <SearchIcon className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-white/60" />
          </form>
        </div>

        <div className="flex items-center gap-2 border-b border-surface-border px-4 py-3">
          <Link
            to={user ? '/account' : '/login'}
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            className="flex flex-1 items-center gap-2 rounded-xl bg-surface-muted px-3 py-2 text-xs font-bold"
          >
            <UserIcon className="h-4 w-4 text-primary" />
            {user ? user.fullName.split(' ')[0] : 'ورود / ثبت‌نام'}
          </Link>
          <Link
            to="/cart"
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            className="relative flex items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-bold"
          >
            <CartIcon className="h-4 w-4 text-primary" />
            سبد
            {cartCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {toFa(cartCount)}
              </span>
            )}
          </Link>
          <Link
            to="/compare"
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            className="relative flex items-center gap-1.5 rounded-xl bg-surface-muted px-3 py-2 text-xs font-bold"
            aria-label={`مقایسهٔ محصولات، ${toFa(compareCount)} کالا`}
          >
            <CompareIcon className="h-4 w-4 text-primary" />
            مقایسه
            {compareCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">
                {toFa(compareCount)}
              </span>
            )}
          </Link>
        </div>

        <nav className="px-3 py-3" aria-label="دسته‌بندی کالاها">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-extrabold tracking-wide text-ink-subtle">دسته‌بندی کالاها</h2>
            <Link to="/shop" onClick={onClose} tabIndex={open ? 0 : -1} className="text-[11px] font-bold text-secondary-dark">
              همه
            </Link>
          </div>

          <ul className="grid gap-1">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  to={`/category/${category.slug}`}
                  onClick={onClose}
                  tabIndex={open ? 0 : -1}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-muted"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary/10 text-secondary-dark">
                    <CategoryIcon name={category.icon} className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{category.name}</span>
                  <span className="shrink-0 rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] text-ink-subtle">
                    {toFa(category.count)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="border-t border-surface-border px-3 py-3" aria-label="صفحه‌های فروشگاه">
          <ul className="grid gap-0.5">
            {quickLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  onClick={onClose}
                  tabIndex={open ? 0 : -1}
                  className="block rounded-xl px-2 py-2.5 text-[13px] font-bold text-ink-muted transition hover:bg-surface-muted hover:text-primary"
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            {isStaff && (
              <li>
                <NavLink
                  to="/admin"
                  onClick={onClose}
                  tabIndex={open ? 0 : -1}
                  className="block rounded-xl px-2 py-2.5 text-[13px] font-extrabold text-secondary-dark transition hover:bg-secondary/10"
                >
                  پنل مدیریت
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="mt-auto border-t border-surface-border bg-surface-muted px-4 py-4">
          <a
            href="tel:02191000000"
            tabIndex={open ? 0 : -1}
            className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-xs font-bold shadow-card"
          >
            <span className="flex items-center gap-2">
              <PhoneIcon className="h-4 w-4 text-primary" />
              پشتیبانی ۰۲۱-۹۱۰۰۰۰۰۰
            </span>
            <span className="text-[10px] text-ink-subtle">۹ تا ۲۱</span>
          </a>

          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-ink-muted">
            <span className="flex items-center gap-1">
              <ShieldIcon className="h-3.5 w-3.5 text-secondary-dark" />
              ضمانت اصالت
            </span>
            <span className="flex items-center gap-1">
              <TruckIcon className="h-3.5 w-3.5 text-secondary-dark" />
              ارسال سریع
            </span>
            <span className="flex items-center gap-1">
              <CartIcon className="h-3.5 w-3.5 text-secondary-dark" />
              پرداخت امن
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}
