import { useEffect, useState, type FormEvent } from 'react'
import { del, get, patch, post, type AdminProduct, type Paginated } from '../../lib/api'
import { useCatalog } from '../../context/CatalogContext'
import { price, toFa } from '../../lib/format'
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  ErrorNote,
  Field,
  Modal,
  Notice,
  Pagination,
  inputClass,
  textareaClass,
} from './adminUi'

export default function AdminProducts() {
  const { categories, brands } = useCatalog()
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paginated<AdminProduct> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editor, setEditor] = useState<{ product: AdminProduct | null } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ page: String(page), perPage: '20' })
    if (search) params.set('q', search)
    if (status) params.set('status', status)

    get<Paginated<AdminProduct>>(`/admin/products?${params}`)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت محصولات ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [search, status, page, reloadKey])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(query.trim())
  }

  async function remove(product: AdminProduct) {
    if (!window.confirm(`محصول «${product.name}» حذف شود؟`)) return

    setError(null)
    try {
      await del(`/admin/products/${product.id}`)
      setNotice('محصول حذف شد.')
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف محصول ناموفق بود.')
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="محصولات"
        description="افزودن، ویرایش، غیرفعال‌سازی و حذف کالاهای کاتالوگ. نامک محصول پس از ایجاد قابل تغییر نیست."
        actions={
          <button
            type="button"
            onClick={() => {
              setNotice(null)
              setEditor({ product: null })
            }}
            className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-light"
          >
            محصول جدید
          </button>
        }
      />

      <Notice message={notice} />
      <ErrorNote message={error} />

      <AdminCard className="mt-3 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border p-3">
          <form onSubmit={submitSearch} className="flex flex-1 flex-wrap gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجوی نام یا نامک محصول..."
              className={`${inputClass} sm:max-w-xs`}
              aria-label="جستجوی محصول"
            />
            <button type="submit" className="rounded-xl bg-surface-muted px-4 text-xs font-bold hover:bg-surface-border">
              جستجو
            </button>
          </form>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className={`${inputClass} w-auto`}
            aria-label="وضعیت محصول"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
            <option value="out_of_stock">ناموجود</option>
            <option value="low_stock">موجودی کم</option>
          </select>
        </div>

        {loading && <EmptyState message="در حال بارگذاری..." />}
        {!loading && data && data.items.length === 0 && <EmptyState message="محصولی با این فیلترها پیدا نشد." />}

        {!loading && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-xs">
              <thead className="bg-surface-muted text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-bold">محصول</th>
                  <th className="px-4 py-3 font-bold">دسته / برند</th>
                  <th className="px-4 py-3 font-bold">قیمت</th>
                  <th className="px-4 py-3 font-bold">موجودی</th>
                  <th className="px-4 py-3 font-bold">وضعیت</th>
                  <th className="px-4 py-3 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.items.map((product) => (
                  <tr key={product.id} className="hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <p className="font-bold">{product.name}</p>
                      <p className="ltr-inline mt-1 text-[10px] text-ink-subtle">{product.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {product.categoryName}
                      <span className="mx-1 text-ink-subtle">/</span>
                      {product.brandName}
                    </td>
                    <td className="px-4 py-3 font-bold">{price(product.price)} تومان</td>
                    <td className={`px-4 py-3 font-bold ${product.stock <= 0 ? 'text-danger' : ''}`}>
                      {toFa(product.stock)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                          !product.isActive
                            ? 'bg-surface-muted text-ink-muted'
                            : product.stock > 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {!product.isActive ? 'غیرفعال' : product.stock > 0 ? 'فعال' : 'ناموجود'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNotice(null)
                            setEditor({ product })
                          }}
                          className="rounded-lg border border-surface-border px-3 py-1.5 font-bold hover:bg-surface-muted"
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(product)}
                          className="rounded-lg border border-danger/30 px-3 py-1.5 font-bold text-danger hover:bg-danger/5"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <Pagination page={data.page} pageCount={data.pageCount} total={data.total} onChange={setPage} />
        )}
      </AdminCard>

      {editor && (
        <ProductEditor
          product={editor.product}
          categories={categories}
          brands={brands}
          onClose={() => setEditor(null)}
          onSaved={(message) => {
            setEditor(null)
            setNotice(message)
            setReloadKey((key) => key + 1)
          }}
        />
      )}
    </div>
  )
}

type EditorProps = {
  product: AdminProduct | null
  categories: { slug: string; name: string }[]
  brands: { slug: string; name: string }[]
  onClose: () => void
  onSaved: (message: string) => void
}

function ProductEditor({ product, categories, brands, onClose, onSaved }: EditorProps) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    categorySlug: product?.category ?? categories[0]?.slug ?? '',
    brandSlug: product?.brand ?? brands[0]?.slug ?? '',
    price: product ? String(product.price) : '',
    compareAtPrice: product?.compareAtPrice ? String(product.compareAtPrice) : '',
    stock: product ? String(product.stock) : '0',
    shortDescription: product?.shortDescription ?? '',
    description: product?.description ?? '',
    highlights: (product?.highlights ?? []).join('\n'),
    images: (product?.images ?? []).join('\n'),
    tags: (product?.tags ?? []).join('، '),
    videoUrl: product?.videoUrl ?? '',
    isActive: product?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      categorySlug: form.categorySlug,
      brandSlug: form.brandSlug,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
      stock: Number(form.stock),
      shortDescription: form.shortDescription.trim(),
      description: form.description,
      highlights: form.highlights.split('\n').map((line) => line.trim()).filter(Boolean),
      images: form.images.split('\n').map((line) => line.trim()).filter(Boolean),
      tags: form.tags.split(/[،,]/).map((tag) => tag.trim()).filter(Boolean),
      videoUrl: form.videoUrl.trim() === '' ? null : form.videoUrl.trim(),
      isActive: form.isActive,
    }

    if (!product) payload.slug = form.slug.trim()

    try {
      if (product) {
        await patch(`/admin/products/${product.id}`, payload)
        onSaved('محصول به‌روزرسانی شد.')
      } else {
        await post('/admin/products', payload)
        onSaved('محصول جدید ساخته شد.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیرهٔ محصول ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={product ? `ویرایش ${product.name}` : 'محصول جدید'} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نام محصول">
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
          </Field>
          <Field label="نامک (slug)" hint={product ? 'نامک پس از ایجاد قابل تغییر نیست.' : 'حروف کوچک لاتین، رقم و خط تیره.'}>
            <input
              required
              disabled={!!product}
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              className={`${inputClass} ltr-inline disabled:bg-surface-muted disabled:text-ink-muted`}
            />
          </Field>
          <Field label="دسته‌بندی">
            <select
              value={form.categorySlug}
              onChange={(e) => set('categorySlug', e.target.value)}
              className={inputClass}
            >
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>{category.name}</option>
              ))}
            </select>
          </Field>
          <Field label="برند">
            <select value={form.brandSlug} onChange={(e) => set('brandSlug', e.target.value)} className={inputClass}>
              {brands.map((brand) => (
                <option key={brand.slug} value={brand.slug}>{brand.name}</option>
              ))}
            </select>
          </Field>
          <Field label="قیمت (تومان)">
            <input
              required
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              className={`${inputClass} ltr-inline`}
            />
          </Field>
          <Field label="قیمت پیش از تخفیف (تومان)" hint="خالی یعنی بدون تخفیف.">
            <input
              type="number"
              min={0}
              value={form.compareAtPrice}
              onChange={(e) => set('compareAtPrice', e.target.value)}
              className={`${inputClass} ltr-inline`}
            />
          </Field>
          <Field label="موجودی انبار">
            <input
              required
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => set('stock', e.target.value)}
              className={`${inputClass} ltr-inline`}
            />
          </Field>
          <Field label="لینک ویدیو (اختیاری)">
            <input value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} className={`${inputClass} ltr-inline`} />
          </Field>
        </div>

        <Field label="توضیح کوتاه">
          <input
            required
            value={form.shortDescription}
            onChange={(e) => set('shortDescription', e.target.value)}
            className={inputClass}
            maxLength={500}
          />
        </Field>

        <Field label="توضیح کامل">
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className={textareaClass}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نکته‌های کلیدی" hint="هر خط یک نکته.">
            <textarea rows={4} value={form.highlights} onChange={(e) => set('highlights', e.target.value)} className={textareaClass} />
          </Field>
          <Field label="تصاویر" hint="هر خط یک آدرس تصویر.">
            <textarea rows={4} value={form.images} onChange={(e) => set('images', e.target.value)} className={`${textareaClass} ltr-inline`} />
          </Field>
        </div>

        <Field label="تگ‌ها" hint="با ویرگول جدا کنید.">
          <input value={form.tags} onChange={(e) => set('tags', e.target.value)} className={inputClass} />
        </Field>

        <p className="rounded-xl bg-surface-muted p-3 text-[11px] leading-6 text-ink-muted">
          مشخصات فنی و ویژگی‌های پیشرفته در این فرم ویرایش نمی‌شوند و مقدار قبلی آن‌ها حفظ می‌شود.
        </p>

        <label className="flex items-center gap-2 text-xs font-bold">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set('isActive', e.target.checked)}
            className="h-4 w-4 accent-secondary"
          />
          نمایش محصول در فروشگاه
        </label>

        <ErrorNote message={error} />

        <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-surface-border px-4 py-2.5 text-xs font-bold">
            انصراف
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-light disabled:opacity-60"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیرهٔ محصول'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
