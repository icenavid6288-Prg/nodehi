import { useEffect, useState, type FormEvent } from 'react'
import { get, patch, type AdminSettingGroup } from '../../lib/api'
import { AdminCard, AdminPageHeader, ErrorNote, Field, Notice, inputClass, textareaClass } from './adminUi'

/** تنظیمات عمومی سایت: نام فروشگاه، تماس و هزینهٔ ارسال. */
export default function AdminSettings() {
  const [groups, setGroups] = useState<AdminSettingGroup[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    get<{ groups: AdminSettingGroup[] }>('/admin/settings')
      .then((data) => {
        if (!active) return
        setGroups(data.groups)
        setValues(
          Object.fromEntries(data.groups.flatMap((group) => group.items.map((item) => [item.key, item.value]))),
        )
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت تنظیمات ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      await patch('/admin/settings', { settings: values })
      setNotice('تنظیمات سایت ذخیره شد. تغییرات در صفحهٔ بعدی سایت دیده می‌شود.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیرهٔ تنظیمات ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="تنظیمات سایت"
        description="اطلاعات تماس، نام فروشگاه و قواعد ارسال. این مقادیر در فوتر، صفحهٔ تماس و محاسبهٔ سبد خرید استفاده می‌شوند."
      />

      <Notice message={notice} />
      <ErrorNote message={error} />

      {loading && <p className="py-10 text-center text-sm text-ink-muted">در حال بارگذاری...</p>}

      {!loading && groups.length === 0 && !error && (
        <p className="py-10 text-center text-sm text-ink-muted">تنظیمی برای نمایش نیست.</p>
      )}

      <form onSubmit={submit} className="mt-4 space-y-4">
        {groups.map((group) => (
          <AdminCard key={group.key} className="p-5">
            <h2 className="mb-4 text-sm font-extrabold">{group.label}</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {group.items.map((item) => (
                <div key={item.key} className={item.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <Field label={item.label} hint={item.hint ?? undefined}>
                    {item.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={values[item.key] ?? ''}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [item.key]: event.target.value }))
                        }
                        className={textareaClass}
                      />
                    ) : (
                      <input
                        type={item.type === 'number' ? 'number' : 'text'}
                        min={item.type === 'number' ? 0 : undefined}
                        value={values[item.key] ?? ''}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [item.key]: event.target.value }))
                        }
                        className={`${inputClass} ${item.type === 'number' ? 'ltr-inline' : ''}`}
                      />
                    )}
                  </Field>
                </div>
              ))}
            </div>
          </AdminCard>
        ))}

        {groups.length > 0 && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white hover:bg-primary-light disabled:opacity-60"
            >
              {saving ? 'در حال ذخیره...' : 'ذخیرهٔ تنظیمات'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
