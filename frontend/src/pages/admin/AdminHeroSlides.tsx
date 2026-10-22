import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { del, get, patch, post, postForm, type AdminHeroSlide } from '../../lib/api'
import { toFa } from '../../lib/format'
import {
  AdminCard,
  AdminPageHeader,
  EmptyState,
  ErrorNote,
  Field,
  Modal,
  Notice,
  inputClass,
  textareaClass,
} from './adminUi'

const THEME_LABELS: Record<AdminHeroSlide['theme'], string> = {
  primary: 'سرمه‌ای',
  secondary: 'فیروزه‌ای',
  accent: 'نارنجی',
}

type EditorState = { slide: AdminHeroSlide | null }

type FormState = {
  badge: string
  title: string
  titleAccent: string
  text: string
  primaryLabel: string
  primaryUrl: string
  secondaryLabel: string
  secondaryUrl: string
  features: string[]
  image: string
  theme: AdminHeroSlide['theme']
  isActive: boolean
}

function emptyForm(): FormState {
  return {
    badge: '',
    title: '',
    titleAccent: '',
    text: '',
    primaryLabel: 'مشاهده فروشگاه',
    primaryUrl: '/shop',
    secondaryLabel: '',
    secondaryUrl: '',
    features: ['', '', ''],
    image: '',
    theme: 'primary',
    isActive: true,
  }
}

function toForm(slide: AdminHeroSlide): FormState {
  const features = [...slide.features, '', '', ''].slice(0, 3)

  return {
    badge: slide.badge ?? '',
    title: slide.title,
    titleAccent: slide.titleAccent ?? '',
    text: slide.text,
    primaryLabel: slide.primaryLabel,
    primaryUrl: slide.primaryUrl,
    secondaryLabel: slide.secondaryLabel ?? '',
    secondaryUrl: slide.secondaryUrl ?? '',
    features,
    image: slide.image ?? '',
    theme: slide.theme,
    isActive: slide.isActive,
  }
}

export default function AdminHeroSlides() {
  const [items, setItems] = useState<AdminHeroSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    get<{ items: AdminHeroSlide[] }>('/admin/hero-slides')
      .then((data) => {
        if (active) setItems(data.items)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'دریافت اسلایدها ناموفق بود.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  async function toggleActive(slide: AdminHeroSlide) {
    setError(null)
    try {
      const result = await patch<{ slide: AdminHeroSlide }>(`/admin/hero-slides/${slide.id}`, {
        isActive: !slide.isActive,
      })
      setItems((current) => current.map((item) => (item.id === slide.id ? result.slide : item)))
      setNotice(result.slide.isActive ? 'اسلاید فعال شد.' : 'اسلاید از چرخش خارج شد.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت اسلاید ناموفق بود.')
    }
  }

  async function move(slide: AdminHeroSlide, direction: -1 | 1) {
    const from = items.findIndex((item) => item.id === slide.id)
    const to = from + direction
    if (from < 0 || to < 0 || to >= items.length) return

    const ordered = [...items]
    const [moved] = ordered.splice(from, 1)
    ordered.splice(to, 0, moved)

    setError(null)
    try {
      const result = await post<{ items: AdminHeroSlide[] }>('/admin/hero-slides/reorder', {
        ids: ordered.map((item) => item.id),
      })
      setItems(result.items)
      setNotice('ترتیب اسلایدها ذخیره شد.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'جابه‌جایی اسلایدها ناموفق بود.')
    }
  }

  async function remove(slide: AdminHeroSlide) {
    if (!window.confirm(`اسلاید «${slide.title}» حذف شود؟ این کار برگشت‌پذیر نیست.`)) return

    setError(null)
    try {
      await del(`/admin/hero-slides/${slide.id}`)
      setNotice('اسلاید حذف شد.')
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف اسلاید ناموفق بود.')
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="اسلایدهای هیرو"
        description="متن، دکمه‌ها و تصویر اسلایدهای صفحهٔ اصلی را همین‌جا عوض کنید؛ تغییرها بلافاصله روی سایت اعمال می‌شود. اگر هیچ اسلاید فعالی نماند، سایت به محتوای پیش‌فرض خودش برمی‌گردد."
        actions={
          <button
            type="button"
            onClick={() => {
              setNotice(null)
              setEditor({ slide: null })
            }}
            className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-light"
          >
            اسلاید جدید
          </button>
        }
      />

      <Notice message={notice} />
      <ErrorNote message={error} />

      {loading && <AdminCard className="mt-3"><EmptyState message="در حال بارگذاری..." /></AdminCard>}
      {!loading && items.length === 0 && (
        <AdminCard className="mt-3">
          <EmptyState message="اسلایدی ثبت نشده؛ صفحهٔ اصلی از محتوای پیش‌فرض استفاده می‌کند." />
        </AdminCard>
      )}

      <div className="mt-3 space-y-3">
        {items.map((slide, position) => (
          <AdminCard key={slide.id} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-4 p-3">
              <div
                className={`h-16 w-28 shrink-0 overflow-hidden rounded-xl ${
                  slide.theme === 'secondary'
                    ? 'bg-secondary'
                    : slide.theme === 'accent'
                      ? 'bg-accent'
                      : 'bg-primary'
                }`}
              >
                {slide.image ? (
                  <img src={slide.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-[10px] text-white/80">بدون تصویر</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-ink-subtle">#{toFa(position + 1)}</span>
                  {slide.isActive ? (
                    <span className="rounded-lg bg-secondary/10 px-2 py-0.5 text-[11px] font-bold text-secondary-dark">فعال</span>
                  ) : (
                    <span className="rounded-lg bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-muted">غیرفعال</span>
                  )}
                  <span className="rounded-lg bg-surface-muted px-2 py-0.5 text-[11px] text-ink-muted">
                    تم {THEME_LABELS[slide.theme] ?? slide.theme}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-extrabold">
                  {slide.title} {slide.titleAccent}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-muted">{slide.text}</p>
                <p className="ltr-inline mt-1 text-[11px] text-ink-subtle">{slide.primaryUrl}</p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => move(slide, -1)}
                  disabled={position === 0}
                  className="rounded-lg border border-surface-border px-2 py-1.5 text-[11px] disabled:opacity-40"
                  aria-label="انتقال به بالا"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(slide, 1)}
                  disabled={position === items.length - 1}
                  className="rounded-lg border border-surface-border px-2 py-1.5 text-[11px] disabled:opacity-40"
                  aria-label="انتقال به پایین"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(slide)}
                  className="rounded-lg border border-surface-border px-2.5 py-1.5 text-[11px] font-bold hover:bg-surface-muted"
                >
                  {slide.isActive ? 'غیرفعال' : 'فعال'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNotice(null)
                    setEditor({ slide })
                  }}
                  className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-primary-light"
                >
                  ویرایش
                </button>
                <button
                  type="button"
                  onClick={() => remove(slide)}
                  className="rounded-lg bg-danger/10 px-2.5 py-1.5 text-[11px] font-bold text-danger hover:bg-danger/20"
                >
                  حذف
                </button>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>

      <p className="mt-4 text-[11px] leading-6 text-ink-subtle">
        پیش‌نمایش نهایی در{' '}
        <Link to="/" className="font-bold text-secondary hover:text-secondary-dark">
          صفحهٔ اصلی
        </Link>{' '}
        است. اسلایدها به همین ترتیب نمایش داده می‌شوند و اولین اسلاید، تیتر اصلی صفحه است.
      </p>

      {editor && (
        <SlideEditor
          slide={editor.slide}
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

function SlideEditor({
  slide,
  onClose,
  onSaved,
}: {
  slide: AdminHeroSlide | null
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [form, setForm] = useState<FormState>(() => (slide ? toForm(slide) : emptyForm()))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function setFeature(position: number, value: string) {
    setForm((current) => {
      const features = [...current.features]
      features[position] = value
      return { ...current, features }
    })
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)

    try {
      const body = new FormData()
      body.append('image', file)
      const result = await postForm<{ url: string }>('/admin/hero-slides/image', body)
      set('image', result.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'آپلود تصویر ناموفق بود.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function save() {
    setError(null)
    setSaving(true)

    const payload = {
      badge: form.badge.trim() || null,
      title: form.title.trim(),
      titleAccent: form.titleAccent.trim() || null,
      text: form.text.trim(),
      primaryLabel: form.primaryLabel.trim(),
      primaryUrl: form.primaryUrl.trim(),
      secondaryLabel: form.secondaryLabel.trim() || null,
      secondaryUrl: form.secondaryUrl.trim() || null,
      features: form.features.map((item) => item.trim()).filter(Boolean),
      image: form.image.trim() || null,
      theme: form.theme,
      isActive: form.isActive,
    }

    try {
      if (slide) {
        await patch(`/admin/hero-slides/${slide.id}`, payload)
        onSaved('اسلاید به‌روزرسانی شد.')
      } else {
        await post('/admin/hero-slides', payload)
        onSaved('اسلاید جدید ساخته شد.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیرهٔ اسلاید ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={slide ? 'ویرایش اسلاید' : 'اسلاید جدید'} onClose={onClose} wide>
      <div className="space-y-3">
        <ErrorNote message={error} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="تیتر (خط اول)" hint="حداکثر ۱۲۰ نویسه">
            <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
          </Field>
          <Field label="تیتر (خط دوم)" hint="اختیاری؛ زیر خط اول می‌آید">
            <input value={form.titleAccent} onChange={(e) => set('titleAccent', e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label="برچسب بالای تیتر" hint="مثلاً «جشنواره تا ۳۵٪ تخفیف»">
          <input value={form.badge} onChange={(e) => set('badge', e.target.value)} className={inputClass} />
        </Field>

        <Field label="متن توضیح">
          <textarea
            value={form.text}
            onChange={(e) => set('text', e.target.value)}
            rows={3}
            className={textareaClass}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="برچسب دکمهٔ اصلی">
            <input value={form.primaryLabel} onChange={(e) => set('primaryLabel', e.target.value)} className={inputClass} />
          </Field>
          <Field label="لینک دکمهٔ اصلی" hint="مثل /shop یا https://…">
            <input
              value={form.primaryUrl}
              onChange={(e) => set('primaryUrl', e.target.value)}
              className={`${inputClass} ltr-inline`}
            />
          </Field>
          <Field label="برچسب دکمهٔ دوم (اختیاری)">
            <input
              value={form.secondaryLabel}
              onChange={(e) => set('secondaryLabel', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="لینک دکمهٔ دوم" hint="اگر برچسب دکمهٔ دوم را پر کنید، این هم لازم است">
            <input
              value={form.secondaryUrl}
              onChange={(e) => set('secondaryUrl', e.target.value)}
              className={`${inputClass} ltr-inline`}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {form.features.map((feature, position) => (
            <Field key={position} label={`مزیت ${toFa(position + 1)}`} hint="اختیاری، حداکثر ۶۰ نویسه">
              <input value={feature} onChange={(e) => setFeature(position, e.target.value)} className={inputClass} />
            </Field>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="تم رنگ" hint="رنگ گرادیان پشتیبان و تیره‌سازی روی تصویر">
            <select
              value={form.theme}
              onChange={(e) => set('theme', e.target.value as FormState['theme'])}
              className={inputClass}
            >
              <option value="primary">سرمه‌ای</option>
              <option value="secondary">فیروزه‌ای</option>
              <option value="accent">نارنجی</option>
            </select>
          </Field>
          <Field label="تصویر پس‌زمینه" hint="می‌توانید آدرس بدهید یا فایل آپلود کنید (JPG/PNG/WebP تا ۳ مگابایت)">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={form.image}
                onChange={(e) => set('image', e.target.value)}
                placeholder="/uploads/hero/… یا https://…"
                className={`${inputClass} ltr-inline flex-1`}
              />
              <label className="cursor-pointer rounded-xl border border-surface-border px-3 py-2 text-[11px] font-bold hover:bg-surface-muted">
                {uploading ? 'در حال آپلود…' : 'آپلود'}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} className="hidden" />
              </label>
              {form.image && (
                <button
                  type="button"
                  onClick={() => set('image', '')}
                  className="rounded-xl bg-surface-muted px-3 py-2 text-[11px] font-bold hover:bg-surface-border"
                >
                  حذف تصویر
                </button>
              )}
            </div>
          </Field>
        </div>

        {form.image && (
          <div className="overflow-hidden rounded-xl border border-surface-border">
            <img src={form.image} alt="" className="h-40 w-full object-cover" />
          </div>
        )}

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set('isActive', e.target.checked)}
            className="h-4 w-4"
          />
          این اسلاید در چرخش صفحهٔ اصلی نمایش داده شود
        </label>

        <div className="flex justify-end gap-2 border-t border-surface-border pt-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-surface-border px-4 py-2 text-xs font-bold">
            انصراف
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || uploading}
            className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-light disabled:opacity-50"
          >
            {saving ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
