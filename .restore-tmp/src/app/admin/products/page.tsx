import Link from 'next/link'
import type { Metadata } from 'next'
import { ActionButton } from '@/components/admin/action-button'
import { ProductForm } from '@/components/admin/product-form'
import { prisma } from '@/lib/db'
import { buildMetadata } from '@/lib/seo'
import { getStaffUser, canMutate } from '@/lib/server/admin'
import { toProductSnapshot } from '@/lib/server/catalog'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate, formatPrice, toPersianDigits } from '@/lib/utils/format'

export const metadata: Metadata = buildMetadata({
  title: 'مدیریت کالاها',
  description: 'افزودن، ویرایش و حذف کالاهای فروشگاه نودهی.',
  path: '/admin/products',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

/**
 * مدیریت کالاها.
 *
 * تا پیش از این صفحهٔ «محتوای سایت» فقط‌خواندنی بود و افزودن کالا یعنی ویرایش
 * فایل و انتشار دوباره. حالا کاتالوگ در جدول `Product` است و این صفحه همان را
 * می‌سازد، ویرایش و حذف می‌کند.
 *
 * کالاهای غیرفعال هم اینجا دیده می‌شوند (حذف نرم) تا مدیر بتواند برگرداندشان؛
 * فروشگاه فقط فعال‌ها را نشان می‌دهد.
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; category?: string; edit?: string }
}) {
  const staff = await getStaffUser()
  const canWrite = Boolean(staff && canMutate(staff.role))

  const [rows, categories, brands] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ createdAt: 'desc' }] }),
    prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.brand.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
  ])

  const products = rows.map((row) => ({ id: row.id, ...toProductSnapshot(row) }))
  const categoryNames = Object.fromEntries(categories.map((row) => [row.slug, row.name]))
  const brandNames = Object.fromEntries(brands.map((row) => [row.slug, row.name]))

  const search = (searchParams.q ?? '').trim().toLowerCase()
  const status = searchParams.status === 'active' || searchParams.status === 'inactive' ? searchParams.status : 'all'
  const category = searchParams.category && categoryNames[searchParams.category] ? searchParams.category : ''

  const visible = products.filter((product) => {
    if (status === 'active' && !product.isActive) return false
    if (status === 'inactive' && product.isActive) return false
    if (category && product.categorySlug !== category) return false
    if (!search) return true
    return [product.name, product.slug, product.brandSlug, product.categorySlug, ...product.tags]
      .join(' ')
      .toLowerCase()
      .includes(search)
  })

  // ویرایش فقط برای یک کالا و از طریق پارامتر آدرس باز می‌شود.
  // چرا نه فرم تاشو برای هر ردیف؟ با ۶۰ کالا در فهرست، رندر ۶۰ فرم کامل
  // یعنی هزاران ورودی در HTML و کندی محسوس صفحه؛ ویرایش تکی سبک‌تر و
  // قابل اشتراک‌گذاری با لینک است.
  const editing = searchParams.edit ? products.find((product) => product.slug === searchParams.edit) : undefined

  const inactiveCount = products.filter((product) => !product.isActive).length
  const outOfStock = products.filter((product) => product.stock <= 0).length
  const discounted = products.filter(
    (product) => product.compareAtPrice !== null && product.compareAtPrice > product.price,
  ).length

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink">مدیریت کالاها</h1>
        <p className="mt-2 text-sm leading-7 text-ink-muted">
          کالاها در دیتابیس ذخیره می‌شوند؛ هر تغییری بلافاصله در فروشگاه دیده می‌شود. «غیرفعال کردن» کالا را از
          فروشگاه بیرون می‌برد ولی سابقهٔ سفارش‌ها را دست‌نخورده نگه می‌دارد.
          {canWrite ? '' : ' نقش شما اجازهٔ تغییر کالاها را ندارد و این صفحه فقط‌خواندنی است.'}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="همهٔ کالاها" value={products.length} hint={`${toPersianDigits(categories.length)} دسته‌بندی`} />
        <Stat
          label="غیرفعال (حذف نرم)"
          value={inactiveCount}
          hint="از فروشگاه بیرون، در سابقه باقی"
          tone={inactiveCount > 0 ? 'muted' : 'default'}
        />
        <Stat label="ناموجود" value={outOfStock} hint="موجودی صفر" tone={outOfStock > 0 ? 'danger' : 'default'} />
        <Stat label="دارای تخفیف" value={discounted} hint="قیمت پیش از تخفیف دارد" />
      </div>

      {canWrite && editing ? (
        <section
          id="edit"
          className="rounded-2xl border border-primary/25 bg-primary/[0.03] p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-ink">ویرایش کالا</h2>
              <p className="mt-1 text-xs text-ink-muted">{editing.name}</p>
            </div>
            <Link
              href="/admin/products"
              className="rounded-lg border border-surface-border bg-white px-3 py-1.5 text-[11px] text-ink-muted hover:bg-surface-muted"
            >
              بستن ویرایش
            </Link>
          </div>

          <ProductForm
            mode="update"
            categories={categories.map((row) => ({ slug: row.slug, name: row.name }))}
            brands={brands.map((row) => ({ slug: row.slug, name: row.name }))}
            product={{ ...editing, publishedAt: editing.publishedAt.toISOString() }}
          />
        </section>
      ) : null}

      {canWrite ? (
        <ProductForm
          mode="create"
          categories={categories.map((row) => ({ slug: row.slug, name: row.name }))}
          brands={brands.map((row) => ({ slug: row.slug, name: row.name }))}
        />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-surface-border bg-white">
        <form method="get" className="flex flex-wrap items-center gap-2 border-b border-surface-border px-5 py-3.5">
          <h2 className="mr-auto text-sm font-bold text-ink">
            فهرست کالاها ({toPersianDigits(visible.length)})
          </h2>
          <input type="hidden" name="status" value={status} />
          <input
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="نام، نامک، برند یا برچسب"
            className="h-9 w-52 rounded-lg border border-surface-border bg-white px-3 text-xs outline-none focus:border-primary"
          />
          <select
            name="category"
            defaultValue={category}
            className="h-9 cursor-pointer rounded-lg border border-surface-border bg-white px-3 text-xs outline-none focus:border-primary"
          >
            <option value="">همهٔ دسته‌ها</option>
            {categories.map((row) => (
              <option key={row.slug} value={row.slug}>
                {row.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-lg bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary-dark"
          >
            جست‌وجو
          </button>
          <Link
            href="/admin/products"
            className="flex h-9 items-center rounded-lg border border-surface-border px-3 text-xs text-ink-muted hover:bg-surface-muted"
          >
            پاک کردن
          </Link>
        </form>

        <div className="flex flex-wrap gap-2 border-b border-surface-border px-5 py-3">
          <FilterTab href="/admin/products" label="همه" active={status === 'all'} />
          <FilterTab href="/admin/products?status=active" label="فعال" active={status === 'active'} />
          <FilterTab href="/admin/products?status=inactive" label="غیرفعال" active={status === 'inactive'} />
        </div>

        {visible.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-ink-muted">
            کالایی با این فیلترها پیدا نشد. برای شروع، از فرم بالا کالای تازه بسازید.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-xs">
              <thead>
                <tr className="bg-surface-muted text-ink-muted">
                  <th className="px-5 py-3 font-medium">کالا</th>
                  <th className="px-5 py-3 font-medium">دسته / برند</th>
                  <th className="px-5 py-3 font-medium">قیمت</th>
                  <th className="px-5 py-3 font-medium">موجودی</th>
                  <th className="px-5 py-3 font-medium">وضعیت</th>
                  <th className="px-5 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {visible.slice(0, 60).map((product) => (
                  <tr key={product.id} className={cn(!product.isActive && 'bg-surface-muted/50')}>
                    <td className="px-5 py-3">
                      <Link
                        href={`/product/${product.slug}`}
                        className="font-medium text-ink hover:text-primary"
                      >
                        {product.name}
                      </Link>
                      <span className="mt-0.5 block text-[10px] text-ink-subtle ltr-inline">
                        {product.slug}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">
                      {categoryNames[product.categorySlug] ?? product.categorySlug}
                      <span className="mt-0.5 block text-[10px] text-ink-subtle">
                        {brandNames[product.brandSlug] ?? product.brandSlug}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="tabular-nums text-ink">{formatPrice(product.price)}</span>
                      {product.compareAtPrice && product.compareAtPrice > product.price ? (
                        <span className="mt-0.5 block text-[10px] text-success">دارای تخفیف</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-medium tabular-nums',
                          product.stock <= 0
                            ? 'bg-danger/[0.08] text-danger'
                            : product.stock <= 3
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-success/[0.12] text-success',
                        )}
                      >
                        {product.stock <= 0 ? 'ناموجود' : `${toPersianDigits(product.stock)} عدد`}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                          product.isActive ? 'bg-secondary/[0.12] text-secondary-dark' : 'bg-surface-muted text-ink-muted',
                        )}
                      >
                        {product.isActive ? 'در فروشگاه' : 'غیرفعال'}
                      </span>
                      <span className="mt-1 block text-[10px] text-ink-subtle">
                        {formatJalaliDate(product.publishedAt)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {canWrite ? (
                        <div className="flex flex-wrap items-start gap-2">
                          <Link
                            href={`/admin/products?edit=${encodeURIComponent(product.slug)}#edit`}
                            className="rounded-lg border border-primary/30 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/[0.06]"
                          >
                            ویرایش
                          </Link>
                          {product.isActive ? (
                            <ActionButton
                              url={`/api/admin/products/${product.id}`}
                              body={{ isActive: false }}
                              label="غیرفعال"
                              pendingLabel="…"
                              tone="muted"
                              confirmMessage={`«${product.name}» از فروشگاه بیرون برود؟ سابقهٔ سفارش‌ها باقی می‌ماند.`}
                            />
                          ) : (
                            <ActionButton
                              url={`/api/admin/products/${product.id}`}
                              body={{ isActive: true }}
                              label="فعال کردن"
                              pendingLabel="…"
                              tone="success"
                            />
                          )}
                          <ActionButton
                            url={`/api/admin/products/${product.id}`}
                            method="DELETE"
                            body={{}}
                            label="حذف قطعی"
                            pendingLabel="…"
                            tone="danger"
                            confirmMessage={`«${product.name}» برای همیشه حذف شود؟ این کار برگشت‌پذیر نیست.`}
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-ink-subtle">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {visible.length > 60 ? (
          <p className="border-t border-surface-border px-5 py-3 text-[11px] text-ink-subtle">
            {toPersianDigits(60)} کالای اول نمایش داده شد؛ برای دیدن بقیه جست‌وجو را دقیق‌تر کنید.
          </p>
        ) : null}
      </section>

    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: number
  hint: string
  tone?: 'default' | 'danger' | 'muted'
}) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={cn(
          'mt-2 text-lg font-extrabold tabular-nums',
          tone === 'danger' ? 'text-danger' : tone === 'muted' ? 'text-ink-muted' : 'text-ink',
        )}
      >
        {toPersianDigits(value)}
      </p>
      <p className="mt-1 text-[11px] leading-5 text-ink-subtle">{hint}</p>
    </div>
  )
}

function FilterTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-[11px] transition-colors',
        active
          ? 'border-primary/30 bg-primary/[0.06] font-bold text-primary'
          : 'border-surface-border text-ink-muted hover:bg-surface-muted',
      )}
    >
      {label}
    </Link>
  )
}
