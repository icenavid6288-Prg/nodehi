import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get, type ProductSummary } from '../lib/api'
import { useCatalog } from '../context/CatalogContext'
import ProductCard from '../components/ProductCard'
import HeroSlideshow from '../components/HeroSlideshow'
import { CategoryIcon } from '../components/icons'
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
      <HeroSlideshow />

      {/* دسته‌بندی‌ها در جریان عادی صفحه و بعد از هیرو می‌آیند تا با اسلایدشو
          هم‌پوشانی نکنند؛ پیش‌تر با حاشیهٔ منفی زیر بخش هیرو پنهان می‌شدند. */}
      <section className="container-page mt-10">
        <div className="mb-4 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-extrabold sm:text-2xl">دسته‌بندی‌ها</h2>
            <p className="mt-1 text-sm text-ink-muted">از یخچال و لباسشویی تا لوازم کوچک؛ سریع‌تر به کالای مورد نظرتان برسید.</p>
          </div>
          <Link to="/shop" className="shrink-0 text-sm font-bold text-secondary hover:text-secondary-dark">
            همه محصولات ←
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.slice(0, 8).map((category) => (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-surface-border bg-white px-3.5 py-3 shadow-card transition hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-float"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary/10 text-secondary-dark transition group-hover:bg-secondary group-hover:text-secondary-foreground">
                <CategoryIcon name={category.icon} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{category.name}</span>
                <span className="mt-0.5 block text-[11px] text-ink-subtle">{toFa(category.count)} کالا</span>
              </span>
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
