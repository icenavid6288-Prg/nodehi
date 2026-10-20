'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface PublicSettings {
  'pages.announcement.enabled'?: string | null
  'pages.announcement.text'?: string | null
  'pages.maintenance.enabled'?: string | null
  'pages.maintenance.message'?: string | null
}

/**
 * نوار اعلان و حالت تعمیرات بالای سایت.
 *
 * ── چرا این کامپوننت سمت مرورگر است؟ ──
 * هدر در چیدمان ریشه (`app/layout.tsx`) قرار دارد. اگر مقدار اعلان را همان‌جا
 * از دیتابیس می‌خواندیم، **همه صفحه‌های سایت** ایستا بودن خود را از دست
 * می‌دادند و در هر بازدید رندر می‌شدند. این کامپوننت مقدار را از
 * `GET /api/settings/public` می‌گیرد، پس بقیه سایت ایستا می‌ماند و متن اعلان
 * بلافاصله پس از ذخیره در پنل عوض می‌شود.
 *
 * ترتیب اولویت: حالت تعمیرات بر اعلان مقدم است — پیام مهم‌تر باید بالاتر بنشیند.
 */
export function AnnouncementBar() {
  const [settings, setSettings] = useState<PublicSettings | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/settings/public')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.settings) setSettings(data.settings as PublicSettings)
      })
      // نبود تنظیمات نباید چیزی به کاربر نشان دهد؛ نوار فقط حذف می‌شود
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  if (!settings) return null

  const maintenance = settings['pages.maintenance.enabled'] === 'true'
  const maintenanceText = settings['pages.maintenance.message']?.trim()
  const announcement = settings['pages.announcement.text']?.trim()
  const announcementOn = settings['pages.announcement.enabled'] === 'true'

  if (maintenance) {
    return (
      <div role="status" className="bg-danger text-white">
        <p className="mx-auto max-w-container px-4 py-2 text-center text-xs leading-6">
          {maintenanceText || 'در حال به‌روزرسانی سایت هستیم؛ لطفاً کمی بعد دوباره سر بزنید.'}
        </p>
      </div>
    )
  }

  if (announcementOn && announcement) {
    return (
      <div role="status" className={cn('bg-secondary text-white')}>
        <p className="mx-auto max-w-container px-4 py-2 text-center text-xs leading-6">{announcement}</p>
      </div>
    )
  }

  return null
}
