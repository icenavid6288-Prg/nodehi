import { useEffect, useState, type FormEvent } from 'react'
import { patch, post } from '../lib/api'
import { useCatalog } from '../context/CatalogContext'
import type { AdminProduct } from './types'
import { AdminCard, ErrorNote } from './ui'

type Props = {
  product: AdminProduct | null
  onSaved: (message: string) => void
  onCancel: () => void
}

const splitLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

const splitCommas = (value: string) =>
  value
    .split(/[,،]/)
    .map((item) => item.trim())
    .filter(Boolean)

export default function ProductForm({ product, onSaved, onCancel }: Props) {
  const { categories, brands } = useCatalog()
  const editing = product !== null

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [compareAtPrice, setCompareAtPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [highlights, setHighlights] = useState('')
  const [specs, setSpecs] = useState('')
  const [images, setImages] = useState('')
  const [tags, setTags] = useState('')
  const [relatedSlugs, setRelatedSlugs] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(product?.name ?? '')
    setSlug(product?.slug ?? '')
    setCategory(product?.category ?? '')
    setBrand(product?.brand ?? '')
    setPrice(product ? String(product.price) : '')
    setCompareAtPrice(product?.compareAtPrice ? String(product.compareAtPrice) : '')
    setStock(String(product?.stock ?? 0))
    setShortDescription(product?.shortDescription ?? '')
    setDescription(product?.description ?? '')
    setHighlights((product?.highlights ?? []).join('\n'))
    setSpecs((product?.specs ?? []).map((spec) => `${spec.label} | ${spec.value}`).join('\n'))
    setImages((product?.images ?? []).join('\n'))
    setTags((product?.tags ?? []).join('، '))
    setRelatedSlugs((product?.relatedSlugs ?? []).join('، '))
    setVideoUrl(product?.videoUrl ?? '')
    setIsActive(product?.isActive ?? true)
  }, [product])

  // انتخاب پیش‌فرض دسته/برند فقط وقتی کاتالوگ برسد پر می‌شود؛ اگر این دو در
  // افکت بالا بودند، هر بار لود شدن کاتالوگ کل فرم (و تایپ کاربر) بازنویسی
  // می‌شد.
  useEffect(() => {
    if (!product && !category) setCategory(categories[0]?.slug ?? '')
    if (!product && !brand) setBrand(brands[0]?.slug ?? '')
  }, [product, categories, brands, category, brand])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      name: name.trim(),
      category,
      brand,
      price: Number(price) || 0,
      compareAtPrice: compareAtPrice.trim() === '' ? null : Number(compareAtPrice),
      stock: Number(stock) || 0,
      shortDescription: shortDescription.trim(),
      description: description.trim() || null,
      highlights: splitLines(highlights),
      specs: splitLines(specs).map((line) => {
        const [label, ...rest] = line.split('|')
        return { label: label.trim(), value: rest.join('|').trim() }
      }),
      images: splitLines(images),
      tags: splitCommas(tags),
      relatedSlugs: splitCommas(relatedSlugs),
      videoUrl: videoUrl.trim() || null,
      isActive,
    }

    try {
      if (editing) {
        // نامک عمداً فرستاده نمی‌شود؛ سرور تغییر آن را رد می‌کند.
        await patch<{ ok: boolean }>(`/admin/products/${product.slug}`, payload)
        onSaved('تغییرات محصول ذخیره شد.')
      } else {
        await post<{ ok: boolean }>('/admin/products', { ...payload, slug: slug.trim() })
        onSaved('محصول جدید ساخته شد.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیرهٔ محصول ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'h-10 w-full rounded-xl border border-surface-border bg-surface-muted px-3 text-sm outline-none transition focus:border-secondary focus:bg-white'
  const labelClass = 'block text-xs'
  const labelText = 'mb-1 block text-ink-muted'

  return (
    <AdminCard className="p-5">
      <form onSubmit={submit} className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold">{editing ? `ویرایش «${product.name}»` : 'کالای جدید'}</h2>
          <button type="button" onClick={onCancel} className="text-xs text-ink-muted hover:text-primary">
            بستن فرم
          </button>
        </div>

        <section className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={labelText}>نام کالا *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
          </label>

          <label className={labelClass}>
            <span className={labelText}>نامک (slug) *</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required={!editing}
              disabled={editing}
              placeholder="samsung-side-by-side-rs68"
              className={`${inputClass} ltr-inline disabled:opacity-60`}
              dir="ltr"
            />
            {editing && (
              <span className="mt-1 block text-[11px] text-ink-subtle">
                نامک پس از ساخت تغییر نمی‌کند.
              </span>
            )}
          </label>

          <label className={labelClass}>
            <span className={labelText}>دسته‌بندی *</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {categories.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            <span className={labelText}>برند *</span>
            <select value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass}>
              {brands.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            <span className={labelText}>قیمت (تومان) *</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              required
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span className={labelText}>قیمت پیش از تخفیف</span>
            <input
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span className={labelText}>موجودی انبار</span>
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className={inputClass}
            />
          </label>
        </section>

        <section className="grid gap-3">
          <label className={labelClass}>
            <span className={labelText}>توضیح کوتاه *</span>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              required
              rows={2}
              className="w-full rounded-xl border border-surface-border bg-surface-muted p-3 text-sm outline-none focus:border-secondary focus:bg-white"
            />
          </label>

          <label className={labelClass}>
            <span className={labelText}>توضیح کامل</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-surface-border bg-surface-muted p-3 text-sm leading-7 outline-none focus:border-secondary focus:bg-white"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelText}>ویژگی‌های کلیدی (هر خط یک مورد)</span>
              <textarea
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-surface-border bg-surface-muted p-3 text-sm outline-none focus:border-secondary focus:bg-white"
              />
            </label>

            <label className={labelClass}>
              <span className={labelText}>مشخصات فنی (هر خط: عنوان | مقدار)</span>
              <textarea
                value={specs}
                onChange={(e) => setSpecs(e.target.value)}
                rows={4}
                placeholder="ظرفیت | ۴۵۰ لیتر"
                className="w-full rounded-xl border border-surface-border bg-surface-muted p-3 text-sm outline-none focus:border-secondary focus:bg-white"
              />
            </label>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            <span className={labelText}>تصاویر (هر خط یک آدرس)</span>
            <textarea
              value={images}
              onChange={(e) => setImages(e.target.value)}
              rows={3}
              placeholder="https://..."
              dir="ltr"
              className="w-full rounded-xl border border-surface-border bg-surface-muted p-3 text-sm outline-none focus:border-secondary focus:bg-white"
            />
          </label>

          <div className="grid gap-3">
            <label className={labelClass}>
              <span className={labelText}>برچسب‌ها (با کاما جدا کنید)</span>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} />
            </label>

            <label className={labelClass}>
              <span className={labelText}>کالاهای مرتبط (نامک، با کاما)</span>
              <input
                value={relatedSlugs}
                onChange={(e) => setRelatedSlugs(e.target.value)}
                dir="ltr"
                className={`${inputClass} ltr-inline`}
              />
            </label>

            <label className={labelClass}>
              <span className={labelText}>ویدئو (اختیاری)</span>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                dir="ltr"
                className={`${inputClass} ltr-inline`}
              />
            </label>
          </div>
        </section>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          نمایش در فروشگاه (کالای غیرفعال در سایت دیده نمی‌شود)
        </label>

        <ErrorNote message={error} />

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-60"
          >
            {saving ? 'در حال ذخیره...' : editing ? 'ذخیرهٔ تغییرات' : 'ساخت محصول'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-surface-border px-5 py-2.5 text-sm font-bold"
          >
            انصراف
          </button>
        </div>
      </form>
    </AdminCard>
  )
}
