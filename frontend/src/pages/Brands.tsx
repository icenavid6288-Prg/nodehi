import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { brandsMeta, usePageMeta } from '../lib/seo'

export default function Brands() {
  const { brands } = useCatalog()

  usePageMeta(brandsMeta())

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-extrabold">برندهای فروشگاه</h1>
      <p className="mt-1 text-sm text-ink-muted">کالاهای هر برند را با گارانتی رسمی و قیمت روز ببینید.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            to={`/brand/${brand.slug}`}
            className="rounded-2xl border border-surface-border bg-white p-5 transition hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-card"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold">{brand.name}</h2>
              <span className="ltr-inline text-[11px] text-ink-subtle">{brand.nameEn}</span>
            </div>
            {brand.origin && <p className="mt-1 text-[11px] text-ink-subtle">کشور مبدأ: {brand.origin}</p>}
            <p className="mt-2 text-xs leading-6 text-ink-muted">{brand.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
