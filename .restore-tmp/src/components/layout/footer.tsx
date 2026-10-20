import Link from 'next/link'
import { Logo } from '@/components/layout/logo'
import { brand } from '@/config/brand'
import { getCategories } from '@/lib/server/catalog'
import { trustPoints } from '@/lib/data/content'

const quickLinks = [
  { href: '/shop', label: 'فروشگاه' },
  { href: '/ready-to-ship', label: 'کالاهای آماده ارسال' },
  { href: '/brands', label: 'برندها' },
  { href: '/loyalty', label: 'باشگاه مشتریان' },
  { href: '/guides', label: 'راهنمای خرید' },
  { href: '/blog', label: 'مقالات آموزشی' },
  { href: '/faq', label: 'سوالات متداول' },
]

const serviceLinks = [
  { href: '/account', label: 'پنل کاربری' },
  { href: '/track', label: 'پیگیری سفارش (مهمان)' },
  { href: '/account/orders', label: 'سفارش‌های من' },
  { href: '/account/addresses', label: 'آدرس‌های من' },
  { href: '/compare', label: 'مقایسه محصولات' },
  { href: '/contact', label: 'تماس با ما' },
  { href: '/about', label: 'درباره نودهی' },
]

const legalLinks = [
  { href: '/terms', label: 'قوانین و مقررات' },
  { href: '/privacy', label: 'حریم خصوصی' },
  { href: '/faq#shipping', label: 'شرایط مرجوعی' },
]

/**
 * پیوند ورود کارکنان.
 *
 * چرا در فوتر و نه در هدر؟ پنل مدیریت عمداً برای کاربر عادی افشا نمی‌شود
 * (کاربر بدون نقش، همان ۴۰۴ سایت را می‌بیند). ولی کارمند هم باید راهی برای
 * ورود داشته باشد؛ پیوند «ورود کارکنان» یک الگوی رایج و کم‌سر‌و‌صدا است که
 * هیچ اطلاعاتی دربارهٔ محتوای پنل لو نمی‌دهد.
 */
const staffLoginHref = '/login?next=/admin'

export async function Footer() {
  // دسته‌ها از دیتابیس می‌آیند؛ فوتر یک سرور کامپوننت است، پس مستقیم await می‌کند
  const categories = await getCategories()
  return (
    <footer className="mt-12 border-t border-surface-border bg-white">
      {/* نوار مزایا */}
      <div className="border-b border-surface-border bg-surface-muted">
        <div className="mx-auto grid max-w-container gap-4 px-4 py-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {trustPoints.map((point) => (
            <div key={point.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-secondary-dark shadow-sm">
                <TrustIcon name={point.icon} />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{point.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-ink-muted">{point.description}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-container gap-8 px-4 py-10 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo showTagline />
          <p className="mt-4 max-w-sm text-sm leading-6 text-ink-muted">{brand.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <SocialLink href={brand.social.instagram} label="اینستاگرام" icon="instagram" />
            <SocialLink href={brand.social.telegram} label="تلگرام" icon="telegram" />
            <SocialLink href={brand.social.whatsapp} label="واتس‌اپ" icon="whatsapp" />
            <SocialLink href={brand.social.linkedin} label="لینکدین" icon="linkedin" />
          </div>
        </div>

        <FooterColumn title="دسته‌بندی‌ها">
          <ul className="flex flex-col gap-2 text-sm">
            {categories.slice(0, 6).map((category) => (
              <li key={category.slug}>
                <Link href={`/category/${category.slug}`} className="text-ink-muted transition-colors hover:text-primary">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </FooterColumn>

        <FooterColumn title="دسترسی سریع">
          <ul className="flex flex-col gap-2 text-sm">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-ink-muted transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </FooterColumn>

        <FooterColumn title="خدمات مشتریان">
          <ul className="flex flex-col gap-2 text-sm">
            {serviceLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-ink-muted transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </FooterColumn>
      </div>

      <div className="border-t border-surface-border">
        <div className="mx-auto grid max-w-container gap-5 px-4 py-7 text-sm md:grid-cols-2">
          <address className="flex flex-col gap-2 not-italic text-ink-muted">
            <span className="font-bold text-ink">راه‌های ارتباط با نودهی</span>
            <span>{brand.contact.address}</span>
            <span>کد پستی: {brand.contact.postalCode}</span>
            <span>
              تلفن:{' '}
              <a href={`tel:${brand.contact.phoneRaw}`} className="font-medium text-primary">
                {brand.contact.phone}
              </a>{' '}
              · همراه:{' '}
              <a href={`tel:${brand.contact.mobile}`} className="font-medium text-primary">
                {brand.contact.mobile}
              </a>
            </span>
            <span>
              ایمیل:{' '}
              <a href={`mailto:${brand.contact.email}`} className="font-medium text-primary">
                {brand.contact.email}
              </a>
            </span>
            <span>ساعات پاسخگویی: {brand.contact.workingHours}</span>
          </address>

          <div className="flex flex-col gap-3 md:items-end">
            <p className="text-xs font-bold text-ink">نمادهای اعتماد</p>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <TrustSeal label="نماد اعتماد الکترونیکی" />
              <TrustSeal label="اتحادیه کشوری کسب‌وکارهای مجازی" />
              <TrustSeal label="پرداخت امن زرین‌پال" />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-surface-border bg-surface-muted">
        <div className="mx-auto flex max-w-container flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-ink-muted sm:flex-row">
          <p>© ۱۴۰۵ تمامی حقوق مادی و معنوی این وب‌سایت برای فروشگاه {brand.name} محفوظ است.</p>
          <ul className="flex flex-wrap items-center gap-4">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={staffLoginHref} className="transition-colors hover:text-primary">
                ورود کارکنان
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold text-ink">{title}</h2>
      {children}
    </div>
  )
}

function SocialLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-ink-muted transition-colors hover:border-primary hover:text-primary"
    >
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden="true">
        {icon === 'instagram' ? (
          <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4a3.9 3.9 0 01-1.4-1 3.9 3.9 0 01-1-1.4c-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.6a6.2 6.2 0 100 12.4 6.2 6.2 0 000-12.4zm0 2.2a4 4 0 110 8 4 4 0 010-8zm6.4-.7a1.4 1.4 0 11-2.9 0 1.4 1.4 0 012.9 0z" />
        ) : icon === 'telegram' ? (
          <path d="M21.6 4.3L18.9 19c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.4.4-.8.4l.3-4.3 8-7.2c.3-.3 0-.4-.5-.1L7.3 13.3 3 12c-1-.3-1-1 .2-1.4l17-6.5c.8-.3 1.5.2 1.4 1.2z" />
        ) : icon === 'whatsapp' ? (
          <path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm0 2a8 8 0 016.9 12.1l.7 2.6-2.7-.7A8 8 0 1112 4zm-3.3 4c-.2 0-.5.1-.7.3-.3.3-.8.9-.8 1.8s.6 1.8.7 2c.1.1 1.2 2 3 2.8 1.5.7 1.9.6 2.2.6.4 0 1.2-.5 1.4-1 .2-.5.2-1 .1-1.1 0-.1-.2-.2-.4-.3l-1.3-.7c-.2-.1-.3-.1-.5.1l-.6.8c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.8-1.2-.6-.6-1-1.2-1-1.4-.1-.2 0-.3.1-.4l.4-.5c.1-.2.1-.3 0-.5l-.6-1.4c-.1-.3-.2-.3-.4-.3h-.3z" />
        ) : (
          <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.75-1.95 4 0 4.75 2.5 4.75 5.8V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.2 1.4-2.2 2.9V21H9z" />
        )}
      </svg>
    </a>
  )
}

function TrustSeal({ label }: { label: string }) {
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-surface-border bg-white p-1.5 text-center text-[9px] leading-tight text-ink-subtle">
      {label}
    </span>
  )
}

function TrustIcon({ name }: { name: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-5 w-5',
    'aria-hidden': true,
  }
  switch (name) {
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
    case 'truck':
      return (
        <svg {...common}>
          <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="17" cy="18" r="1.6" />
        </svg>
      )
    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 10-2.3 6.3" />
          <path d="M20 5v6h-6" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...common}>
          <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
          <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" />
        </svg>
      )
    case 'support':
      return (
        <svg {...common}>
          <path d="M5 13v-1a7 7 0 0114 0v1" />
          <rect x="3" y="13" width="4" height="6" rx="1.5" />
          <rect x="17" y="13" width="4" height="6" rx="1.5" />
          <path d="M19 19v.5a2.5 2.5 0 01-2.5 2.5H13" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
          <path d="M2.5 10h19M6 14.5h4" />
        </svg>
      )
  }
}
