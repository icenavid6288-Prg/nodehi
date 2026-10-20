'use client'

import { useEffect } from 'react'

/**
 * ثبت Service Worker برای قابلیت PWA.
 * فقط در محیط تولید ثبت می‌شود تا در زمان توسعه، کش مرورگر باعث نمایش
 * نسخه قدیمی کد نشود.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // شکست ثبت Service Worker نباید تجربه کاربر را مختل کند
      })
    }

    // ثبت پس از بارگذاری کامل صفحه تا رقابت با منابع حیاتی نداشته باشد
    if (document.readyState === 'complete') register()
    else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
