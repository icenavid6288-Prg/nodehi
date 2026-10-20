'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/input'
import { SPEC_GROUP_LABELS, SPEC_GROUPS } from '@/lib/product-options'
import { formatNumber, toLatinDigits } from '@/lib/utils/format'
import type { ProductAttributes, SpecItem } from '@/types'

/** کالای موجود به شکلی که فرم ویرایش لازم دارد (تاریخ به‌صورت رشته) */
export interface ProductFormInitial {
  id: string
  slug: string
  name: string
  categorySlug: string
  brandSlug: string
  price: number
  compareAtPrice: number | null
  stock: number
  rating: number
  reviewCount: number
  shortDescription: string
  description: string
  highlights: string[]
  specs: SpecItem[]
  attributes: ProductAttributes
  images: string[]
  tags: string[]
  relatedSlugs: string[]
  videoUrl: string | null
  publishedAt: string
  isActive: boolean
}

interface FormState {
  name: string
  slug: string
  categorySlug: string
  brandSlug: string
  price: string
  compareAtPrice: string
  stock: string
  rating: string
  reviewCount: string
  publishedAt: string
  shortDescription: string
  description: string
  highlights: string
  tags: string
  images: string
  relatedSlugs: string
  videoUrl: string
  specs: SpecItem[]
  color: string
  capacity: string
  capacityUnit: string
  energyRating: string
  madeIn: string
  warrantyMonths: string
  inverter: boolean
  installmentAvailable: boolean
  readyToShip: boolean
}

/** فهرست چندخطی → آرایه (هر خط یک آیتم) */
function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/** فقط ارقام لاتین — جداکنندهٔ هزارگان و ارقام فارسی حذف می‌شوند */
function digits(value: string): string {
  return toLatinDigits(value).replace(/\D/g, '')
}

/** تاریخ ISO → مقدار ورودی تاریخ مرورگر (YYYY-MM-DD) */
function toDateInput(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function emptyForm(categorySlug: string, brandSlug: string): FormState {
  return {
    name: '',
    slug: '',
    categorySlug,
    brandSlug,
    price: '',
    compareAtPrice: '',
    stock: '0',
    rating: '0',
    reviewCount: '0',
    publishedAt: toDateInput(new Date().toISOString()),
    shortDescription: '',
    description: '',
    highlights: '',
    tags: '',
    images: '',
    relatedSlugs: '',
    videoUrl: '',
    specs: [],
    color: '',
    capacity: '',
    capacityUnit: '',
    energyRating: '',
    madeIn: '',
    warrantyMonths: '',
    inverter: false,
    installmentAvailable: false,
    readyToShip: false,
  }
}

function initialForm(product: ProductFormInitial): FormState {
  const attributes = product.attributes
  return {
    name: product.name,
    slug: product.slug,
    categorySlug: product.categorySlug,
    brandSlug: product.brandSlug,
    price: String(product.price),
    compareAtPrice: product.compareAtPrice === null ? '' : String(product.compareAtPrice),
    stock: String(product.stock),
    rating: String(product.rating),
    reviewCount: String(product.reviewCount),
    publishedAt: toDateInput(product.publishedAt),
    shortDescription: product.shortDescription,
    description: product.description,
    highlights: product.highlights.join('\n'),
    tags: product.tags.join('\n'),
    images: product.images.join('\n'),
    relatedSlugs: product.relatedSlugs.join('\n'),
    videoUrl: product.videoUrl ?? '',
    specs: product.specs.map((spec) => ({ ...spec })),
    color: attributes.color,
    capacity: attributes.capacity === null ? '' : String(attributes.capacity),
    capacityUnit: attributes.capacityUnit ?? '',
    energyRating: attributes.energyRating ?? '',
    madeIn: attributes.madeIn,
    warrantyMonths: attributes.warrantyMonths ? String(attributes.warrantyMonths) : '',
    inverter: attributes.inverter,
    installmentAvailable: attributes.installmentAvailable,
    readyToShip: attributes.readyToShip,
  }
}

/**
 * فرم حالت فرم → شکل ورودی API.
 *
 * یک شکل واحد برای «ساخت» و «ویرایش» ساخته می‌شود تا دو مسیر از هم جدا نشوند.
 * برای ویرایش، همین شیء با حالت اولیه مقایسه و فقط تفاوت‌ها فرستاده می‌شود؛
 * دلیلش همان درس کد تخفیف است: فیلدی که کاربر دست نزده نباید بازنویسی شود.
 */
function toPayload(form: FormState): Record<string, unknown> {
  return {
    name: form.name.trim(),
    slug: form.slug.trim().toLowerCase(),
    categorySlug: form.categorySlug,
    brandSlug: form.brandSlug,
    price: digits(form.price),
    compareAtPrice: digits(form.compareAtPrice),
    stock: digits(form.stock),
    rating: form.rating.trim(),
    reviewCount: digits(form.reviewCount),
    publishedAt: form.publishedAt,
    shortDescription: form.shortDescription.trim(),
    description: form.description,
    highlights: lines(form.highlights),
    tags: lines(form.tags),
    images: lines(form.images),
    relatedSlugs: lines(form.relatedSlugs),
    videoUrl: form.videoUrl.trim(),
    specs: form.specs
      .map((spec) => ({ label: spec.label.trim(), value: spec.value.trim(), group: spec.group }))
      .filter((spec) => spec.label && spec.value),
    attributes: {
      color: form.color.trim(),
      capacity: digits(form.capacity),
      capacityUnit: form.capacityUnit || null,
      energyRating: form.energyRating || null,
      madeIn: form.madeIn.trim(),
      warrantyMonths: digits(form.warrantyMonths),
      inverter: form.inverter,
      installmentAvailable: form.installmentAvailable,
      readyToShip: form.readyToShip,
    },
  }
}

/** تفاوت دو شکل ورودی — فقط کلیدهای تغییرکرده (مقایسه با سریال‌سازی پایدار) */
function diffPayload(
  next: Record<string, unknown>,
  previous: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const key of Object.keys(next)) {
    if (JSON.stringify(next[key]) !== JSON.stringify(previous[key])) payload[key] = next[key]
  }
  return payload
}

/**
 * فرم کالا — هم برای افزودن و هم برای ویرایش.
 *
 * فرم ویرایش داخل یک بخش تاشو در فهرست کالاها می‌نشیند (مثل کد تخفیف) تا
 * صفحه با ۲۰ کالا به دیوار ورودی تبدیل نشود.
 */
export function ProductForm({
  mode,
  categories,
  brands,
  product,
}: {
  mode: 'create' | 'update'
  categories: { slug: string; name: string }[]
  brands: { slug: string; name: string }[]
  product?: ProductFormInitial
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() =>
    product ? initialForm(product) : emptyForm(categories[0]?.slug ?? '', brands[0]?.slug ?? ''),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [problem, setProblem] = useState('')
  const [pending, setPending] = useState(false)
  const [createdSlug, setCreatedSlug] = useState('')

  const isCreate = mode === 'create'

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  function reset() {
    setForm(emptyForm(categories[0]?.slug ?? '', brands[0]?.slug ?? ''))
    setErrors({})
    setMessage('')
    setProblem('')
    setCreatedSlug('')
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setErrors({})
    setMessage('')
    setProblem('')
    setCreatedSlug('')

    const payload = isCreate
      ? toPayload(form)
      : diffPayload(toPayload(form), toPayload(initialForm(product as ProductFormInitial)))

    if (!isCreate && Object.keys(payload).length === 0) {
      setMessage('چیزی برای ذخیره تغییر نکرده است.')
      setPending(false)
      return
    }

    try {
      const response = await fetch(
        isCreate ? '/api/admin/products' : `/api/admin/products/${(product as ProductFormInitial).id}`,
        {
          method: isCreate ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setErrors(data?.error?.fields ?? {})
        setProblem(data?.error?.message ?? 'ذخیره کالا ناموفق بود.')
        return
      }

      if (isCreate) {
        setMessage(`کالا با نامک «${data.product.slug}» ساخته شد.`)
        setCreatedSlug(data.product.slug)
      } else {
        setMessage('تغییرهای کالا ذخیره شد.')
      }
      router.refresh()
    } catch {
      setProblem('ارتباط با سرور برقرار نشد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className={isCreate ? 'rounded-2xl border border-surface-border bg-white p-5' : 'border-t border-surface-border p-4'}
      noValidate
    >
      {isCreate ? (
        <>
          <h2 className="text-sm font-bold text-ink">افزودن کالای تازه</h2>
          <p className="mt-1.5 text-xs leading-6 text-ink-muted">
            کالا بلافاصله در فروشگاه دیده می‌شود. تنها نام، دسته، برند و توضیح کوتاه الزامی‌اند؛ نامک را خالی
            بگذارید تا خودکار از نام ساخته شود.
          </p>
        </>
      ) : null}

      {message ? (
        <p role="status" className="mt-4 rounded-xl bg-secondary/10 px-4 py-3 text-xs text-secondary-dark">
          {message}
          {createdSlug ? (
            <>
              {' '}
              <Link href={`/product/${createdSlug}`} className="font-bold underline">
                دیدن صفحه کالا
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {problem ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger/[0.08] px-4 py-3 text-xs text-danger">
          {problem}
        </p>
      ) : null}

      <fieldset className="mt-4 grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-bold text-ink-subtle">اطلاعات پایه</legend>

        <Field label="نام کالا" htmlFor={`p-name-${mode}`} error={errors.name}>
          <Input
            id={`p-name-${mode}`}
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="مثلاً یخچال ساید بای ساید سامسونگ ۲۸ فوت"
          />
        </Field>

        <Field
          label="نامک (آدرس)"
          htmlFor={`p-slug-${mode}`}
          error={errors.slug}
          hint="فقط حروف لاتین، رقم و خط تیره؛ خالی بگذارید تا خودکار ساخته شود"
        >
          <Input
            id={`p-slug-${mode}`}
            dir="ltr"
            className="text-left"
            value={form.slug}
            onChange={(event) => update('slug', event.target.value)}
            placeholder="samsung-side-by-side-rs68"
          />
        </Field>

        <Field label="دسته‌بندی" htmlFor={`p-cat-${mode}`} error={errors.categorySlug}>
          <Select
            id={`p-cat-${mode}`}
            value={form.categorySlug}
            onChange={(event) => update('categorySlug', event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="برند" htmlFor={`p-brand-${mode}`} error={errors.brandSlug}>
          <Select
            id={`p-brand-${mode}`}
            value={form.brandSlug}
            onChange={(event) => update('brandSlug', event.target.value)}
          >
            {brands.map((brand) => (
              <option key={brand.slug} value={brand.slug}>
                {brand.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="قیمت (تومان)"
          htmlFor={`p-price-${mode}`}
          error={errors.price}
          hint="۰ یعنی «تماس بگیرید»"
        >
          <Input
            id={`p-price-${mode}`}
            inputMode="numeric"
            value={form.price}
            onChange={(event) => update('price', event.target.value)}
            placeholder="89000000"
          />
        </Field>

        <Field
          label="قیمت پیش از تخفیف"
          htmlFor={`p-compare-${mode}`}
          error={errors.compareAtPrice}
          hint="خالی بگذارید تا تخفیفی نشان داده نشود"
        >
          <Input
            id={`p-compare-${mode}`}
            inputMode="numeric"
            value={form.compareAtPrice}
            onChange={(event) => update('compareAtPrice', event.target.value)}
            placeholder="96500000"
          />
        </Field>

        <Field label="موجودی" htmlFor={`p-stock-${mode}`} error={errors.stock}>
          <Input
            id={`p-stock-${mode}`}
            inputMode="numeric"
            value={form.stock}
            onChange={(event) => update('stock', event.target.value)}
          />
        </Field>

        <Field
          label="تاریخ انتشار"
          htmlFor={`p-date-${mode}`}
          error={errors.publishedAt}
          hint="ترتیب نمایش «تازه‌ترین» بر همین پایه است"
        >
          <Input
            id={`p-date-${mode}`}
            type="date"
            dir="ltr"
            className="text-left"
            value={form.publishedAt}
            onChange={(event) => update('publishedAt', event.target.value)}
          />
        </Field>

        <Field label="امتیاز نمایشی" htmlFor={`p-rating-${mode}`} error={errors.rating} hint="۰ تا ۵">
          <Input
            id={`p-rating-${mode}`}
            inputMode="decimal"
            value={form.rating}
            onChange={(event) => update('rating', event.target.value)}
            placeholder="4.7"
          />
        </Field>

        <Field label="تعداد نظر نمایشی" htmlFor={`p-reviews-${mode}`} error={errors.reviewCount}>
          <Input
            id={`p-reviews-${mode}`}
            inputMode="numeric"
            value={form.reviewCount}
            onChange={(event) => update('reviewCount', event.target.value)}
          />
        </Field>
      </fieldset>

      <fieldset className="mt-6 grid gap-4">
        <legend className="mb-2 text-xs font-bold text-ink-subtle">توضیحات</legend>

        <Field label="توضیح کوتاه" htmlFor={`p-short-${mode}`} error={errors.shortDescription} hint="در کارت کالا و فهرست‌ها دیده می‌شود">
          <Textarea
            id={`p-short-${mode}`}
            className="min-h-20"
            value={form.shortDescription}
            onChange={(event) => update('shortDescription', event.target.value)}
          />
        </Field>

        <Field label="توضیح کامل" htmlFor={`p-desc-${mode}`} error={errors.description}>
          <Textarea
            id={`p-desc-${mode}`}
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="هر خط یک پاراگراف است."
          />
        </Field>
      </fieldset>

      <fieldset className="mt-6 grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-bold text-ink-subtle">نکته‌ها و برچسب‌ها</legend>

        <Field
          label="نکته‌های کلیدی"
          htmlFor={`p-highlights-${mode}`}
          error={errors.highlights}
          hint="هر خط یک نکته"
        >
          <Textarea
            id={`p-highlights-${mode}`}
            className="min-h-24"
            value={form.highlights}
            onChange={(event) => update('highlights', event.target.value)}
          />
        </Field>

        <Field label="برچسب‌ها" htmlFor={`p-tags-${mode}`} error={errors.tags} hint="هر خط یک برچسب؛ در جست‌وجو مؤثر است">
          <Textarea
            id={`p-tags-${mode}`}
            className="min-h-24"
            value={form.tags}
            onChange={(event) => update('tags', event.target.value)}
          />
        </Field>

        <Field
          label="تصاویر"
          htmlFor={`p-images-${mode}`}
          error={errors.images}
          hint="هر خط یک آدرس (نسبی مثل /images/... یا کامل). خالی بماند، تصویر پیش‌فرض دسته نمایش می‌یابد."
        >
          <Textarea
            id={`p-images-${mode}`}
            dir="ltr"
            className="ltr-inline min-h-24 text-left"
            value={form.images}
            onChange={(event) => update('images', event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-4">
          <Field label="آدرس ویدئو" htmlFor={`p-video-${mode}`} error={errors.videoUrl} hint="اختیاری">
            <Input
              id={`p-video-${mode}`}
              dir="ltr"
              className="text-left"
              value={form.videoUrl}
              onChange={(event) => update('videoUrl', event.target.value)}
              placeholder="https://…"
            />
          </Field>

          <Field
            label="کالاهای مرتبط"
            htmlFor={`p-related-${mode}`}
            error={errors.relatedSlugs}
            hint="هر خط نامک یک کالا؛ خالی بماند خودکار پیشنهاد می‌شود"
          >
            <Textarea
              id={`p-related-${mode}`}
              dir="ltr"
              className="ltr-inline min-h-20 text-left"
              value={form.relatedSlugs}
              onChange={(event) => update('relatedSlugs', event.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="mb-2 text-xs font-bold text-ink-subtle">مشخصات فنی</legend>
        <p className="mb-3 text-[11px] leading-6 text-ink-subtle">
          هر ردیف یک مشخصه در جدول صفحهٔ کالا است. ردیف‌های ناقص ذخیره نمی‌شوند.
        </p>

        <div className="flex flex-col gap-2">
          {form.specs.map((spec, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <Input
                aria-label="برچسب مشخصه"
                className="min-w-32 flex-1"
                value={spec.label}
                onChange={(event) => {
                  const specs = [...form.specs]
                  specs[index] = { ...spec, label: event.target.value }
                  update('specs', specs)
                }}
                placeholder="مثلاً ظرفیت"
              />
              <Input
                aria-label="مقدار مشخصه"
                className="min-w-32 flex-1"
                value={spec.value}
                onChange={(event) => {
                  const specs = [...form.specs]
                  specs[index] = { ...spec, value: event.target.value }
                  update('specs', specs)
                }}
                placeholder="مثلاً ۶۹۰ لیتر"
              />
              <Select
                aria-label="گروه مشخصه"
                className="w-28"
                value={spec.group}
                onChange={(event) => {
                  const specs = [...form.specs]
                  specs[index] = { ...spec, group: event.target.value as SpecItem['group'] }
                  update('specs', specs)
                }}
              >
                {SPEC_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {SPEC_GROUP_LABELS[group]}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => update('specs', form.specs.filter((_, row) => row !== index))}
                className="rounded-lg border border-surface-border px-3 py-2 text-[11px] text-danger transition-colors hover:bg-danger/[0.06]"
              >
                حذف
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => update('specs', [...form.specs, { label: '', value: '', group: 'general' }])}
          className="mt-3 rounded-xl border border-surface-border px-4 py-2 text-xs text-ink-muted transition-colors hover:border-primary/30 hover:text-primary"
        >
          + افزودن مشخصه
        </button>
      </fieldset>

      <fieldset className="mt-6 grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-xs font-bold text-ink-subtle">ویژگی‌های فیلتر</legend>

        <Field label="رنگ" htmlFor={`p-color-${mode}`}>
          <Input
            id={`p-color-${mode}`}
            value={form.color}
            onChange={(event) => update('color', event.target.value)}
            placeholder="سفید"
          />
        </Field>

        <Field label="ظرفیت" htmlFor={`p-cap-${mode}`} hint="مثلاً ۶۹۰ یا ۳۲">
          <Input
            id={`p-cap-${mode}`}
            inputMode="decimal"
            value={form.capacity}
            onChange={(event) => update('capacity', event.target.value)}
          />
        </Field>

        <Field label="واحد ظرفیت" htmlFor={`p-unit-${mode}`}>
          <Select
            id={`p-unit-${mode}`}
            value={form.capacityUnit}
            onChange={(event) => update('capacityUnit', event.target.value)}
          >
            <option value="">—</option>
            <option value="لیتر">لیتر</option>
            <option value="کیلوگرم">کیلوگرم</option>
            <option value="اینچ">اینچ</option>
          </Select>
        </Field>

        <Field label="رده انرژی" htmlFor={`p-energy-${mode}`}>
          <Select
            id={`p-energy-${mode}`}
            value={form.energyRating}
            onChange={(event) => update('energyRating', event.target.value)}
          >
            <option value="">—</option>
            {['A+++', 'A++', 'A+', 'A', 'B'].map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="کشور سازنده" htmlFor={`p-origin-${mode}`}>
          <Input
            id={`p-origin-${mode}`}
            value={form.madeIn}
            onChange={(event) => update('madeIn', event.target.value)}
            placeholder="کره جنوبی"
          />
        </Field>

        <Field label="گارانتی (ماه)" htmlFor={`p-warranty-${mode}`}>
          <Input
            id={`p-warranty-${mode}`}
            inputMode="numeric"
            value={form.warrantyMonths}
            onChange={(event) => update('warrantyMonths', event.target.value)}
            placeholder="18"
          />
        </Field>

        <div className="flex flex-col gap-1 sm:col-span-3">
          <span className="text-sm font-medium text-ink">برچسب‌های فروش</span>
          <div className="flex flex-wrap gap-2">
            <Checkbox
              label="اینورتر"
              checked={form.inverter}
              onChange={(event) => update('inverter', event.target.checked)}
            />
            <Checkbox
              label="امکان اقساط"
              checked={form.installmentAvailable}
              onChange={(event) => update('installmentAvailable', event.target.checked)}
            />
            <Checkbox
              label="آماده ارسال"
              checked={form.readyToShip}
              onChange={(event) => update('readyToShip', event.target.checked)}
            />
          </div>
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary" size={isCreate ? 'md' : 'sm'} disabled={pending}>
          {pending ? 'در حال ذخیره…' : isCreate ? 'افزودن کالا' : 'ذخیره تغییرها'}
        </Button>

        {isCreate ? (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-ink-muted underline decoration-dotted underline-offset-4 hover:text-primary"
          >
            فرم تازه
          </button>
        ) : null}
      </div>

      {isCreate && form.price ? (
        <p className="mt-3 text-[11px] text-ink-subtle">
          قیمت ثبت‌شده: {formatNumber(Number(digits(form.price)))} تومان
        </p>
      ) : null}
    </form>
  )
}
