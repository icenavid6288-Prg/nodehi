'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * تنظیمات اعلان.
 *
 * توجه: این تنظیمات فعلاً در مرورگر نگه داشته می‌شوند و فقط نمایشی‌اند.
 * ارسال واقعی پیامک و ایمیل توسط لایه اتوماسیون انجام می‌شود
 * (به docs/AUTOMATION.md مراجعه کنید). برای پایدارسازی، این مقادیر باید
 * به جدول تنظیمات کاربر در دیتابیس منتقل شوند.
 */

const CHANNEL_OPTIONS = ['پیامک', 'ایمیل'] as const
type Channel = (typeof CHANNEL_OPTIONS)[number]

interface PreferenceItem {
  id: string
  title: string
  description: string
  channels: Channel[]
}

const PREFERENCES: PreferenceItem[] = [
  {
    id: 'order-status',
    title: 'وضعیت سفارش',
    description: 'تأیید سفارش، ارسال، تحویل و لغو — پیشنهاد می‌شود همیشه فعال بماند.',
    channels: ['پیامک', 'ایمیل'],
  },
  {
    id: 'stock',
    title: 'موجود شدن کالا',
    description: 'وقتی کالایی که پیگیری می‌کنید دوباره موجود شد.',
    channels: ['پیامک', 'ایمیل'],
  },
  {
    id: 'discount',
    title: 'تخفیف‌ها و کمپین‌ها',
    description: 'جشنواره‌ها و کدهای تخفیف مناسب علاقه‌مندی‌های شما.',
    channels: ['ایمیل'],
  },
  {
    id: 'loyalty',
    title: 'امتیاز باشگاه مشتریان',
    description: 'افزایش امتیاز، رسیدن به سطح جدید و کدهای وفاداری.',
    channels: ['پیامک', 'ایمیل'],
  },
  {
    id: 'reviews',
    title: 'یادآور ثبت نظر',
    description: 'چند روز پس از تحویل، برای ثبت نظر درباره کالای خریداری‌شده.',
    channels: ['ایمیل'],
  },
]

export default function NotificationsPage() {
  // وضعیت اولیه: همه کانال‌های پیشنهادی فعال
  const [enabled, setEnabled] = useState<Record<string, Channel[]>>(() =>
    Object.fromEntries(PREFERENCES.map((item) => [item.id, item.channels])),
  )
  const [saved, setSaved] = useState(false)

  function toggle(itemId: string, channel: Channel) {
    setEnabled((current) => {
      const active = current[itemId] ?? []
      const next = active.includes(channel)
        ? active.filter((entry) => entry !== channel)
        : [...active, channel]
      return { ...current, [itemId]: next }
    })
    setSaved(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-extrabold text-ink">اعلان‌ها</h1>
        <p className="mt-1.5 text-xs leading-6 text-ink-muted">
          انتخاب کنید نودهی از چه راهی با شما در تماس باشد. اعلان وضعیت سفارش را خاموش نکنید تا از
          زمان ارسال باخبر شوید.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-surface-border overflow-hidden rounded-2xl border border-surface-border bg-white">
        {PREFERENCES.map((item) => {
          const active = enabled[item.id] ?? []
          return (
            <li key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-xs leading-6 text-ink-muted">{item.description}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2" role="group" aria-label={`کانال‌های ${item.title}`}>
                {CHANNEL_OPTIONS.map((channel) => {
                  // کانالی که برای این آیتم پیشنهاد نشده، غیرفعال نمایش داده می‌شود
                  const supported = item.channels.includes(channel)
                  const isOn = active.includes(channel)
                  return (
                    <button
                      key={channel}
                      type="button"
                      disabled={!supported}
                      aria-pressed={isOn}
                      onClick={() => toggle(item.id, channel)}
                      className={cn(
                        'rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors',
                        !supported && 'cursor-not-allowed border-surface-border text-ink-subtle/50',
                        supported && isOn && 'border-secondary bg-secondary/[0.12] text-secondary-dark',
                        supported && !isOn && 'border-surface-border text-ink-muted hover:bg-surface-muted',
                      )}
                    >
                      {channel}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSaved(true)}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-light"
        >
          ذخیره تنظیمات
        </button>
        {saved ? (
          <p role="status" className="text-xs text-secondary-dark">
            تنظیمات اعلان شما ذخیره شد.
          </p>
        ) : null}
      </div>

      <p className="rounded-xl border border-dashed border-surface-border bg-surface-muted/50 px-4 py-3 text-[11px] leading-5 text-ink-subtle">
        نکته: ارسال واقعی پیامک و ایمیل از طریق لایه اتوماسیون انجام می‌شود و نیازمند اتصال سرویس
        پیامک و ایمیل است. برای پایدارسازی این تنظیمات در حساب شما، باید در دیتابیس ذخیره شوند.
      </p>
    </div>
  )
}
