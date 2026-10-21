import { useCallback, useEffect, useState } from 'react'
import { del, get } from '../lib/api'
import { price, toFa } from '../lib/format'
import { useCatalog } from '../context/CatalogContext'
import ProductForm from './ProductForm'
import type { AdminProduct, AdminProductList } from './types'
import { AdminCard, EmptyState, ErrorNote, PageHeader, Pagination, SuccessNote } from './ui'

export default function Products() {
  const { categoryName, brandName } = useCatalog()
  const [data, setData] = useState<AdminProductList | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminProduct | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ page: String(page), perPage: '12', status })
    if (query.trim()) params.set('q', query.trim())

    get<AdminProductList>(`/admin/products?${params.toString()}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'دریافت محصولات ناموفق بود.'))
      .finally(() => setLoading(false))
  }, [page, status, query])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
    setMessage(null)
  }

  function openEdit(product: AdminProduct) {
    setEditing(product)
    setFormOpen(true)
    setMessage(null)
  }

  async function remove(product: AdminProduct) {
    if (!window.confirm(`«${product.name}» حذف شود؟ این کار قابل بازگشت نیست.`)) return

    setError(null)
    setMessage(null)

    try {
      await del<{ ok: boolean }>(`/admin/products/${product.slug}`)
      setMessage('محصول حذف شد.')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف محصول ناموفق بود.')
    }
  }

  return (
    <div>
      <PageHeader
        title="محصولات"
        description="افزودن، ویرایش و حذف کالاهای فروشگاه."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-light"
          >
            + کالای جدید
          </button>
        }
      />

      <ErrorNote message={error} />
      <SuccessNote message={message} />

      {formOpen && (
        <div className="my-4">
          <ProductForm
            product={editing}
            onSaved={(text) => {
              setFormOpen(false)
              setEditing(null)
              setMessage(text)
              load()
            }}
            onCancel={() => {
              setFormOpen(false)
              setEditing(null)
            }}
          />
        </div>
      )}

      <AdminCard className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border p-3">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="جستجوی نام یا نامک..."
            className="h-10 flex-1 rounded-xl border border-surface-border bg-surface-muted px-3 text-sm outline-none focus:border-secondary focus:bg-white"
          />

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className="h-10 rounded-xl border border-surface-border bg-white px-3 text-xs"
          >
            <option value="all">همهٔ وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
          </select>
        </div>

        {loading && <p className="p-6 text-center text-sm text-ink-muted">در حال بارگذاری...</p>}

        {!loading && data && data.items.length === 0 && (
          <div className="p-4">
            <EmptyState text="کالایی با این فیلتر پیدا نشد." />
          </div>
        )}

        {!loading && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-xs">
              <thead className="bg-surface-muted text-ink-muted">
                <tr>
                  <th className="p-3 font-bold">کالا</th>
                  <th className="p-3 font-bold">دسته / برند</th>
                  <th className="p-3 font-bold">قیمت</th>
                  <th className="p-3 font-bold">موجودی</th>
                  <th className="p-3 font-bold">وضعیت</th>
                  <th className="p-3 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.items.map((product) => (
                  <tr key={product.slug} className="align-middle hover:bg-surface-muted/50">
                    <td className="p-3">
                      <div className="font-bold">{product.name}</div>
                      <div className="mt-1 text-[11px] text-ink-subtle" dir="ltr">
                        {product.slug}
                      </div>
                    </td>
                    <td className="p-3 text-ink-muted">
                      {categoryName(product.category)}
                      <div className="mt-1 text-[11px] text-ink-subtle">{brandName(product.brand)}</div>
                    </td>
                    <td className="p-3 font-bold">{price(product.price)}</td>
                    <td className="p-3">
                      <span className={product.stock <= 0 ? 'font-bold text-danger' : 'font-bold'}>
                        {toFa(product.stock)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-bold ${
                          product.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {product.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="rounded-lg border border-surface-border px-2.5 py-1.5 font-bold hover:border-secondary"
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(product)}
                          className="rounded-lg border border-surface-border px-2.5 py-1.5 font-bold text-danger hover:border-danger/40"
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

        {data && (
          <div className="border-t border-surface-border p-3">
            <div className="mb-2 text-center text-[11px] text-ink-subtle">
              {toFa(data.total)} کالا
            </div>
            <Pagination page={data.page} pageCount={data.pageCount} onChange={setPage} />
          </div>
        )}
      </AdminCard>
    </div>
  )
}
