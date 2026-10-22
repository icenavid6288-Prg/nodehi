import { useEffect, useState, type FormEvent } from 'react'
import {
  get,
  patch,
  type AdminPermissionKey,
  type AdminPermissionOption,
  type AdminUserDetail,
  type AdminUserRow,
  type Paginated,
} from '../../lib/api'
import { formatDate, price, toFa } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  ErrorNote,
  Field,
  Modal,
  Notice,
  Pagination,
  StatusPill,
  inputClass,
} from './adminUi'

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدیر اصلی',
  operator: 'اپراتور',
  customer: 'مشتری',
}

const ROLE_TONES: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  operator: 'bg-sky-50 text-sky-700',
  customer: 'bg-surface-muted text-ink-muted',
}

export default function AdminUsers() {
  const { user: actor } = useAuth()
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paginated<AdminUserRow> | null>(null)
  const [permissions, setPermissions] = useState<AdminPermissionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ page: String(page), perPage: '25' })
    if (search) params.set('q', search)
    if (role) params.set('role', role)
    if (status) params.set('status', status)

    get<Paginated<AdminUserRow> & { permissions: AdminPermissionOption[] }>(`/admin/users?${params}`)
      .then((result) => {
        if (!active) return
        setData(result)
        setPermissions(result.permissions)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت کاربران ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [search, role, status, page, reloadKey])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(query.trim())
  }

  return (
    <div>
      <AdminPageHeader
        title="کاربران"
        description="جست‌وجوی کاربران، مشاهدهٔ سفارش‌ها و آدرس‌ها، تعیین نقش و مجوز دسترسی به بخش‌های پنل. تغییر نقش و دسترسی فقط از مدیر اصلی پذیرفته می‌شود."
      />

      <Notice message={notice} />
      <ErrorNote message={error} />

      <AdminCard className="mt-3 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border p-3">
          <form onSubmit={submitSearch} className="flex flex-1 flex-wrap gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجوی شماره، نام یا ایمیل..."
              className={`${inputClass} sm:max-w-xs`}
              aria-label="جستجوی کاربر"
            />
            <button type="submit" className="rounded-xl bg-surface-muted px-4 text-xs font-bold hover:bg-surface-border">
              جستجو
            </button>
          </form>

          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value)
              setPage(1)
            }}
            className={`${inputClass} w-auto`}
            aria-label="نقش کاربر"
          >
            <option value="">همه نقش‌ها</option>
            <option value="admin">مدیر اصلی</option>
            <option value="operator">اپراتور</option>
            <option value="customer">مشتری</option>
          </select>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className={`${inputClass} w-auto`}
            aria-label="وضعیت کاربر"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
            <option value="admins">مدیران و اپراتورها</option>
          </select>
        </div>

        {loading && <EmptyState message="در حال بارگذاری..." />}
        {!loading && data && data.items.length === 0 && <EmptyState message="کاربری با این فیلترها پیدا نشد." />}

        {!loading && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-xs">
              <thead className="bg-surface-muted text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-bold">کاربر</th>
                  <th className="px-4 py-3 font-bold">نقش</th>
                  <th className="px-4 py-3 font-bold">سفارش‌ها</th>
                  <th className="px-4 py-3 font-bold">مجموع خرید</th>
                  <th className="px-4 py-3 font-bold">باشگاه</th>
                  <th className="px-4 py-3 font-bold">وضعیت</th>
                  <th className="px-4 py-3 font-bold">عضویت</th>
                  <th className="px-4 py-3 font-bold">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <span className="block font-bold">{row.fullName}</span>
                      <span className="ltr-inline block text-[11px] text-ink-muted">{row.phone}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${ROLE_TONES[row.role] ?? ''}`}>
                        {ROLE_LABELS[row.role] ?? row.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">{toFa(row.ordersCount)}</td>
                    <td className="px-4 py-3">{row.ordersTotal > 0 ? `${price(row.ordersTotal)} تومان` : '—'}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {row.loyaltyTier} · {toFa(row.loyaltyPoints)} امتیاز
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                          row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {row.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {row.createdAt ? formatDate(row.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setNotice(null)
                          setSelected(row.id)
                        }}
                        className="rounded-lg border border-surface-border px-3 py-1.5 font-bold hover:bg-surface-muted"
                      >
                        مشاهده
                      </button>
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

      {selected !== null && (
        <UserEditor
          id={selected}
          permissions={permissions}
          canEdit={actor?.role === 'admin'}
          onClose={() => setSelected(null)}
          onSaved={(message) => {
            setSelected(null)
            setNotice(message)
            setReloadKey((key) => key + 1)
          }}
        />
      )}
    </div>
  )
}

function UserEditor({
  id,
  permissions,
  canEdit,
  onClose,
  onSaved,
}: {
  id: number
  permissions: AdminPermissionOption[]
  canEdit: boolean
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    role: 'customer',
    isActive: true,
    loyaltyPoints: '0',
    loyaltyTier: '',
    permissions: [] as AdminPermissionKey[],
  })

  useEffect(() => {
    let active = true

    get<{ user: AdminUserDetail; permissions: AdminPermissionOption[] }>(`/admin/users/${id}`)
      .then((data) => {
        if (!active) return
        setUser(data.user)
        setForm({
          role: data.user.role,
          isActive: data.user.isActive,
          loyaltyPoints: String(data.user.loyaltyPoints),
          loyaltyTier: data.user.loyaltyTier,
          permissions: data.user.permissions,
        })
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت کاربر ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  function togglePermission(key: AdminPermissionKey) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(key)
        ? current.permissions.filter((item) => item !== key)
        : [...current.permissions, key],
    }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await patch(`/admin/users/${id}`, {
        role: form.role,
        isActive: form.isActive,
        loyaltyPoints: Number(form.loyaltyPoints || 0),
        loyaltyTier: form.loyaltyTier,
        permissions: form.role === 'operator' ? form.permissions : [],
      })
      onSaved('کاربر به‌روزرسانی شد.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیرهٔ کاربر ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={user ? user.fullName : 'جزئیات کاربر'} onClose={onClose} wide>
      {loading && <p className="py-6 text-center text-sm text-ink-muted">در حال بارگذاری...</p>}
      <ErrorNote message={error} />

      {user && (
        <div className="grid gap-5">
          <div className="grid gap-2 rounded-xl bg-surface-muted p-3 text-xs sm:grid-cols-3">
            <span className="ltr-inline font-bold">{user.phone}</span>
            <span className="text-ink-muted">{user.email || 'بدون ایمیل'}</span>
            <span className="text-ink-muted">
              {toFa(user.ordersCount)} سفارش · {user.ordersTotal > 0 ? `${price(user.ordersTotal)} تومان` : 'بدون خرید'}
            </span>
          </div>

          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="نقش">
                <select
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  className={inputClass}
                  disabled={!canEdit}
                >
                  <option value="customer">مشتری</option>
                  <option value="operator">اپراتور</option>
                  <option value="admin">مدیر اصلی</option>
                </select>
              </Field>
              <Field label="سطح باشگاه مشتریان">
                <input
                  value={form.loyaltyTier}
                  onChange={(event) => setForm((current) => ({ ...current, loyaltyTier: event.target.value }))}
                  className={inputClass}
                  maxLength={30}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="امتیاز باشگاه">
                <input
                  type="number"
                  min={0}
                  value={form.loyaltyPoints}
                  onChange={(event) => setForm((current) => ({ ...current, loyaltyPoints: event.target.value }))}
                  className={`${inputClass} ltr-inline`}
                  disabled={!canEdit}
                />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="h-4 w-4 accent-secondary"
                  disabled={!canEdit}
                />
                حساب فعال باشد
              </label>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-ink-muted">
                مجوز بخش‌های پنل {form.role === 'admin' ? '(مدیر اصلی همهٔ بخش‌ها را دارد)' : ''}
              </p>
              <div className="grid gap-2 rounded-xl border border-surface-border p-3 sm:grid-cols-2">
                {permissions.map((permission) => (
                  <label key={permission.key} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={form.role === 'admin' || form.permissions.includes(permission.key)}
                      onChange={() => togglePermission(permission.key)}
                      className="h-4 w-4 accent-secondary"
                      disabled={!canEdit || form.role !== 'operator'}
                    />
                    {permission.label}
                  </label>
                ))}
              </div>
              {form.role === 'operator' && form.permissions.length === 0 && (
                <p className="mt-2 text-[11px] text-ink-subtle">
                  بدون تیک، دسترسی پیش‌فرض قدیمی (محصولات، سفارش‌ها، کد تخفیف، نظرات، اسلایدها) اعمال می‌شود.
                </p>
              )}
            </div>

            {!canEdit && (
              <p className="rounded-xl bg-amber-50 p-3 text-[11px] leading-6 text-amber-700">
                فقط مدیر اصلی می‌تواند نقش و مجوزها را تغییر دهد؛ این صفحه برای شما فقط خواندنی است.
              </p>
            )}

            {canEdit && (
              <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
                <button type="button" onClick={onClose} className="rounded-xl border border-surface-border px-4 py-2.5 text-xs font-bold">
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-light disabled:opacity-60"
                >
                  {saving ? 'در حال ذخیره...' : 'ذخیرهٔ کاربر'}
                </button>
              </div>
            )}
          </form>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-extrabold">آخرین سفارش‌ها</h3>
              <ul className="space-y-1.5 text-xs">
                {user.orders.length === 0 && <li className="text-ink-muted">سفارشی ثبت نشده است.</li>}
                {user.orders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2">
                    <span className="ltr-inline font-bold">{order.orderNumber}</span>
                    <StatusPill status={order.status} />
                    <span className="text-ink-muted">{price(order.total)} تومان</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-extrabold">آدرس‌ها</h3>
              <ul className="space-y-1.5 text-xs">
                {user.addresses.length === 0 && <li className="text-ink-muted">آدرسی ثبت نشده است.</li>}
                {user.addresses.map((address) => (
                  <li key={address.id} className="rounded-lg bg-surface-muted px-3 py-2 leading-6">
                    <span className="font-bold">{address.title}</span>
                    {address.isDefault && <span className="mr-1 text-[10px] text-secondary-dark">(پیش‌فرض)</span>}
                    <span className="block text-ink-muted">
                      {address.province}، {address.city}، {address.line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
