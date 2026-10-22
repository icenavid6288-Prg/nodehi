import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  ShieldIcon,
  StarIcon,
  TruckIcon,
} from './icons'
import { get, type HeroSlide } from '../lib/api'
import { toFa } from '../lib/format'

/** فاصلهٔ چرخش خودکار؛ کمتر از ۵ ثانیه برای خواندن متن فارسی کافی نیست. */
const AUTOPLAY_MS = 6500

type Feature = { icon: ReactNode; text: string }

type Cta = {
  href: string
  label: string
  /** دکمهٔ سفید (کنش اصلی) یا دکمهٔ خط‌دار (کنش دوم) */
  primary?: boolean
}

type Slide = {
  id: string
  badge: string
  title: string
  /** خط دوم تیتر؛ در پنل اختیاری است */
  titleAccent?: string | null
  text: string
  ctas: Cta[]
  features: Feature[]
  /** تصویر پس‌زمینه؛ خالی یعنی فقط گرادیان دیده شود */
  image: string
  /** گرادیان پشتیبان؛ تا وقتی تصویر نیامده یا اگر خطا داد، دیده می‌شود */
  gradient: string
  /** فقط اسلاید اول h1 می‌گیرد تا صفحه یک تیتر اصلی داشته باشد */
  headingLevel?: 'h1' | 'h2'
}

/** تم انتخابی ادمین → گرادیان Tailwind؛ کلاس‌ها ثابت‌اند تا در build پیدا شوند. */
const THEME_GRADIENTS: Record<string, string> = {
  primary: 'from-primary-dark via-primary to-primary-light',
  secondary: 'from-secondary-dark via-secondary to-secondary-light',
  accent: 'from-accent-dark via-accent to-accent-light',
}

/** آیکون مزیت‌ها به ترتیب؛ متن از پنل می‌آید و آیکون ثابت می‌ماند. */
const FEATURE_ICONS: ReactNode[] = [<TruckIcon key="truck" />, <ShieldIcon key="shield" />, <CheckIcon key="check" />]

/**
 * محتوای پشتیبان.
 *
 * اسلایدها از API (و در نهایت از پنل مدیریت) می‌آیند؛ اگر هیچ اسلاید فعالی
 * تعریف نشده باشد یا درخواست شکست بخورد، همین سه اسلاید نمایش داده می‌شوند
 * تا صفحهٔ اصلی هرگز بدون هیرو نماند.
 */
const fallbackSlides: Slide[] = [
  {
    id: 'promise',
    badge: '۲۳ کالای منتخب با گارانتی رسمی',
    headingLevel: 'h1',
    title: 'لوازم خانگی مطمئن،',
    titleAccent: 'با ارسال سریع و نصب رایگان',
    text: 'یخچال، لباسشویی، ظرفشویی، تلویزیون و کولر گازی از برندهای معتبر؛ با ضمانت اصالت کالا و امکان پرداخت در محل.',
    ctas: [
      { href: '/shop', label: 'مشاهده فروشگاه', primary: true },
      { href: '/shop?onSale=1', label: 'تخفیف‌های ویژه' },
    ],
    features: [
      { icon: <TruckIcon />, text: 'ارسال همان‌روز در تهران و کرج' },
      { icon: <ShieldIcon />, text: 'گارانتی معتبر و ضمانت اصالت' },
      { icon: <CheckIcon />, text: 'پرداخت در محل و خرید اقساطی' },
    ],
    image: '/hero/promise.jpg',
    gradient: THEME_GRADIENTS.primary,
  },
  {
    id: 'festival',
    badge: 'جشنواره تا ۳۵٪ تخفیف',
    title: 'تخفیف پایان فصل،',
    titleAccent: 'روی منتخبی از لوازم خانگی',
    text: 'یخچال، لباسشویی و تلویزیون‌های پرفروش با تخفیف مستقیم، گارانتی رسمی و ارسال سریع — تا پایان موجودی.',
    ctas: [
      { href: '/shop?onSale=1', label: 'دیدن تخفیف‌ها', primary: true },
      { href: '/shop?sort=popular', label: 'پرفروش‌ها' },
    ],
    features: [
      { icon: <StarIcon />, text: 'تخفیف تا ۳۵٪ روی کالاهای منتخب' },
      { icon: <TruckIcon />, text: 'ارسال رایگان برای خرید بالای ۱۰ میلیون تومان' },
      { icon: <CheckIcon />, text: 'امکان پرداخت در محل' },
    ],
    image: '/hero/festival.jpg',
    gradient: THEME_GRADIENTS.secondary,
  },
  {
    id: 'installment',
    badge: 'خرید اقساطی تا ۱۲ ماه',
    title: 'خرید اقساطی بدون دغدغه،',
    titleAccent: 'با امتیاز باشگاه مشتریان',
    text: 'با هر خرید امتیاز بگیرید و در خرید بعدی تخفیف بگیرید؛ برای کالاهای منتخب، اقساط بدون بهره با بازپرداخت منعطف.',
    ctas: [
      { href: '/loyalty', label: 'شرایط خرید اقساطی', primary: true },
      { href: '/track', label: 'پیگیری سفارش' },
    ],
    features: [
      { icon: <CheckIcon />, text: 'اقساط ۴ تا ۱۲ ماهه' },
      { icon: <StarIcon />, text: 'امتیاز باشگاه مشتریان روی هر خرید' },
      { icon: <ShieldIcon />, text: 'پشتیبانی ۷ روز هفته' },
    ],
    image: '/hero/installment.jpg',
    gradient: THEME_GRADIENTS.accent,
  },
]

/** تبدیل اسلاید API به ساختار نمایشی؛ اولین اسلاید تیتر اصلی صفحه است. */
function fromApi(item: HeroSlide, index: number): Slide {
  const ctas: Cta[] = [{ href: item.primaryUrl, label: item.primaryLabel, primary: true }]

  if (item.secondaryLabel && item.secondaryUrl) {
    ctas.push({ href: item.secondaryUrl, label: item.secondaryLabel })
  }

  return {
    id: `slide-${item.id}`,
    badge: item.badge ?? '',
    title: item.title,
    titleAccent: item.titleAccent,
    text: item.text,
    ctas,
    features: item.features
      .slice(0, 3)
      .map((text, featureIndex) => ({ icon: FEATURE_ICONS[featureIndex % FEATURE_ICONS.length], text })),
    image: item.image ?? '',
    gradient: THEME_GRADIENTS[item.theme] ?? THEME_GRADIENTS.primary,
    headingLevel: index === 0 ? 'h1' : 'h2',
  }
}

export default function HeroSlideshow() {
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides)
  const [index, setIndex] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  /** توقف موقت هنگام هاور/فوکوس یا وقتی تب پنهان است */
  const [held, setHeld] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  /** هر تصویر فقط وقتی برای اولین بار نمایش داده شود دانلود می‌شود (سبک‌تر برای موبایل) */
  const [loadedSlides, setLoadedSlides] = useState<number[]>([0])
  const touchStartX = useRef<number | null>(null)

  // اسلایدها در پنل مدیریت ویرایش می‌شوند؛ اگر API خالی یا خطادار بود، محتوای
  // پشتیبان بالا می‌ماند و ظاهر صفحه تغییر نمی‌کند.
  useEffect(() => {
    let active = true

    get<{ items: HeroSlide[] }>('/hero-slides')
      .then((data) => {
        if (!active) return
        const mapped = data.items.map(fromApi)
        if (mapped.length > 0) setSlides(mapped)
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [])

  // اگر مدیر تعداد اسلایدها را کم کرد، اندیس فعلی نباید بیرون بزند.
  useEffect(() => {
    setIndex((current) => (current >= slides.length ? 0 : current))
  }, [slides.length])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  // وقتی کاربر تب را ترک می‌کند، چرخش بی‌فایده است و فقط CPU می‌گیرد.
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden)
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    setLoadedSlides((loaded) => (loaded.includes(index) ? loaded : [...loaded, index]))
  }, [index])

  const go = useCallback((target: number) => {
    setIndex(((target % slides.length) + slides.length) % slides.length)
  }, [])

  const next = useCallback(() => go(index + 1), [go, index])
  const prev = useCallback(() => go(index - 1), [go, index])

  const running = autoplay && !reducedMotion && !held && !tabHidden

  useEffect(() => {
    if (!running) return
    // تایمر «یک اسلاید» است، نه بازهٔ تکرارشونده؛ بنابراین پیمایش دستی
    // زمان‌بندی را از نو تنظیم می‌کند و اسلاید تازه فرصت خوانده‌شدن دارد.
    const timer = window.setTimeout(() => go(index + 1), AUTOPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [index, running, go])

  return (
    <section
      className="relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label="پیشنهادهای ویژهٔ نودهی"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      onKeyDown={(event) => {
        // در چیدمان راست‌به‌چپ، فلش چپ یعنی «بعدی».
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          next()
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          prev()
        }
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return
        const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
        if (Math.abs(delta) > 40) (delta > 0 ? prev() : next())
        touchStartX.current = null
      }}
    >
      {/* اسلایدها روی هم در یک خانهٔ گرید می‌نشینند تا ارتفاع هیرو با بلندترین
          اسلاید ثابت بماند و هنگام تعویض، صفحه نپرد. */}
      <div className="grid">
        {slides.map((slide, slideIndex) => {
          const active = slideIndex === index
          const Heading = slide.headingLevel === 'h1' ? 'h1' : 'h2'
          return (
            <div
              key={slide.id}
              className={`relative col-start-1 row-start-1 overflow-hidden bg-gradient-to-l ${slide.gradient} transition-opacity duration-700 ease-out ${
                active ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
              aria-hidden={!active}
              aria-roledescription="slide"
              aria-label={`اسلاید ${toFa(slideIndex + 1)} از ${toFa(slides.length)}`}
            >
              {/* تصویر تزئینی است؛ پیام اسلاید در متن آمده، پس alt خالی می‌ماند. */}
              {loadedSlides.includes(slideIndex) && (
                <img
                  src={slide.image}
                  alt=""
                  aria-hidden="true"
                  loading={slideIndex === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              {/* لایهٔ تیره برای خوانایی متن: سمت راست (متن) تیره‌تر، سمت چپ تصویر دیده می‌شود.
                  روی موبایل کل سطح تیره‌تر است چون متن روی تصویر می‌افتد. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-l from-primary-dark/95 via-primary-dark/80 to-primary-dark/60 md:to-primary-dark/35"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-primary-dark/75 via-transparent to-primary/20" />

              <div
                className={`relative container-page grid items-center gap-8 pb-16 pt-12 transition-transform duration-700 ease-out md:grid-cols-2 md:pb-20 md:pt-16 ${
                  active ? 'translate-y-0' : 'translate-y-2'
                }`}
              >
                <div className="text-white">
                  <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
                    <StarIcon className="h-3.5 w-3.5" />
                    {slide.badge}
                  </span>
                  <Heading className="text-3xl font-extrabold leading-tight sm:text-4xl">
                    {slide.title}
                    {slide.titleAccent ? (
                      <>
                        <br />
                        {slide.titleAccent}
                      </>
                    ) : null}
                  </Heading>
                  <p className="mt-4 max-w-md text-sm leading-7 text-white/85">{slide.text}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {slide.ctas.map((cta) => (
                      <Link
                        key={cta.href}
                        to={cta.href}
                        tabIndex={active ? 0 : -1}
                        className={
                          cta.primary
                            ? 'rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-primary shadow-lg transition hover:bg-surface-muted'
                            : 'rounded-xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10'
                        }
                      >
                        {cta.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <ul className="grid grid-cols-2 gap-3 text-sm text-white sm:grid-cols-3 md:grid-cols-1">
                  {slide.features.map((feature) => (
                    <li
                      key={feature.text}
                      className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20">{feature.icon}</span>
                      <span className="text-xs leading-6 sm:text-sm">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={prev}
        aria-label="اسلاید قبلی"
        className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:grid"
      >
        <ChevronRightIcon />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="اسلاید بعدی"
        className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 sm:grid"
      >
        <ChevronLeftIcon />
      </button>

      <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-2">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => go(slideIndex)}
            aria-label={`رفتن به اسلاید ${toFa(slideIndex + 1)}`}
            aria-current={slideIndex === index ? 'true' : undefined}
            className={`h-2 rounded-full transition-all ${
              slideIndex === index ? 'w-7 bg-white' : 'w-2 bg-white/45 hover:bg-white/70'
            }`}
          />
        ))}

        {/* WCAG 2.2.2: محتوای چرخان باید راه توقف داشته باشد؛ هاور/فوکوس کافی نیست. */}
        {!reducedMotion && (
          <button
            type="button"
            onClick={() => setAutoplay((value) => !value)}
            aria-label={autoplay ? 'توقف چرخش خودکار اسلایدها' : 'ادامهٔ چرخش خودکار اسلایدها'}
            aria-pressed={!autoplay}
            className="mr-2 grid h-7 w-7 place-items-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            {autoplay ? <PauseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </section>
  )
}
