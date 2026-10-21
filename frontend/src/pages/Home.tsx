import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get, type ProductSummary } from '../lib/api'
import { useCatalog } from '../context/CatalogContext'
import ProductCard from '../components/ProductCard'
import { CheckIcon, ShieldIcon, StarIcon, TruckIcon } from '../components/icons'
import { toFa } from '../lib/format'
import { homeMeta, usePageMeta } from '../lib/seo'

type ProductList = { items: ProductSummary[]; total: number }

function Section({
  title,
  description,
  href,
  products,
}: {
  title: string
  description: string
  href: string
  products: ProductSummary[]
}) {
  if (products.length === 0) return null

  return (
    <section className="container-page mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold sm:text-2xl">{title}</h2>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
        <Link to={href} className="text-sm font-bold text-secondary hover:text-secondary-dark">
          مشاهده همه ←
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const { categories } = useCatalog()
  const [popular, setPopular] = useState<ProductSummary[]>([])
  const [fresh, setFresh] = useState<ProductSummary[]>([])
  const [ready, setReady] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)

  // متادیتای خانه از هستهٔ مشترک سئو می‌آید تا با نسخهٔ پررندرشدهٔ ایستا یکی باشد.
  usePageMeta(homeMeta())

  useEffect(() => {
    Promise.all([
      get<ProductList>('/products?sort=popular&perPage=8'),
      get<ProductList>('/products?sort=newest&perPage=4'),
      get<ProductList>('/products?inStock=1&sort=discount&perPage=4'),
    ])
      .then(([popularData, freshData, readyData]) => {
        setPopular(popularData.items)
        setFresh(freshData.items)
        setReady(readyData.items)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="pb-4">
      <section className="relative overflow-hidden bg-gradient-to-l from-secondary-dark via-secondary to-secondary-light">
        <div className="container-page grid items-center gap-8 py-12 md:grid-cols-2 md:py-16">
          <div className="text-white">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
              <StarIcon className="h-3.5 w-3.5" />
              {toFa('۲۳')} کالای منتخب با گارانتی رسمی
            </span>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
              لوازم خانگی مطمئن،
              <br />
              با ارسال سریع و نصب رایگان
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/85">
              یخچال، لباسشویی، ظرفشویی، تلویزیون و کولر گازی از برندهای معتبر؛ با ضمانت اصالت کالا و امکان
              پرداخت در محل.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-primary shadow-lg transition hover:bg-surface-muted"
              >
                مشاهده فروشگاه
              </Link>
              <Link
                to="/shop?onSale=1"
                className="rounded-xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                تخفیف‌های ویژه
              </Link>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-3 text-sm text-white sm:grid-cols-3 md:grid-cols-1">
            {[
              { icon: <TruckIcon />, text: 'ارسال همان‌روز در تهران و کرج' },
              { icon: <ShieldIcon />, text: 'گارانتی معتبر و ضمانت اصالت' },
              { icon: <CheckIcon />, text: 'پرداخت در محل و خرید اقساطی' },
            ].map((item) => (
              <li
                key={item.text}
                className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20">{item.icon}</span>
                <span className="text-xs leading-6 sm:text-sm">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page -mt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.slice(0, 8).map((category) => (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className="flex items-center justify-between gap-2 rounded-2xl border border-surface-border bg-white px-4 py-3 shadow-card transition hover:-translate-y-0.5 hover:border-secondary/40"
            >
              <span className="text-sm font-bold">{category.name}</span>
              <span className="text-[11px] text-ink-subtle">{toFa(category.count)} کالا</span>
            </Link>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="container-page mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-2xl bg-white shadow-card" />
          ))}
        </div>
      ) : (
        <>
          <Section
            title="پرفروش‌ترین لوازم خانگی"
            description="انتخاب‌های محبوب مشتریان نودهی بر اساس تعداد خرید و رضایت ثبت‌شده."
            href="/shop?sort=popular"
            products={popular}
          />
          <Section
            title="آماده ارسال امروز"
            description="کالاهایی که در انبار موجود هستند و امروز ارسال می‌شوند."
            href="/shop?inStock=1"
            products={ready}
          />
          <Section
            title="جدیدترین محصولات"
            description="تازه‌ترین کالاهای اضافه‌شده به فروشگاه نودهی."
            href="/shop?sort=newest"
            products={fresh}
          />
        </>
      )}
    </div>
  )
}
