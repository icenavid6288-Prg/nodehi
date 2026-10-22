import { useEffect } from 'react'
import { get } from '../lib/api'

/**
 * تزریق ابزارهای تحلیل و تأیید مالکیت از تنظیمات پنل.
 *
 * شناسه‌ها در `/api/settings/public` می‌آیند و فقط یک‌بار به head اضافه
 * می‌شوند تا با هر بار رندر دوباره تزریق نشوند. «کد سفارشی head» فقط از
 * پنل مدیر قابل ثبت است و همان‌جا هشدار HTML خام دارد.
 */
export default function AnalyticsTags() {
  useEffect(() => {
    let cancelled = false

    function mark(name: string): boolean {
      if (document.querySelector(`[data-nodehi-analytics="${name}"]`)) return false
      const marker = document.createElement('meta') as HTMLMetaElement
      marker.setAttribute('data-nodehi-analytics', name)
      marker.setAttribute('data-nodehi-analytics-marker', '1')
      document.head.appendChild(marker)
      return true
    }

    function addScript(name: string, attrs: Record<string, string>, inline?: string) {
      if (!mark(name)) return
      const script = document.createElement('script')
      Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value))
      if (inline) script.textContent = inline
      document.head.appendChild(script)
    }

    get<{ settings: Record<string, string> }>('/settings/public')
      .then((data) => {
        if (cancelled) return
        const settings = data.settings ?? {}

        const gsc = settings['seo.gsc']?.trim()
        if (gsc) {
          const meta = document.createElement('meta')
          meta.name = 'google-site-verification'
          meta.content = gsc
          meta.setAttribute('data-nodehi-analytics', 'gsc')
          document.head.appendChild(meta)
        }

        const ga4 = settings['seo.ga4']?.trim()
        if (ga4) {
          addScript('ga4-loader', { async: 'true', src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}` })
          addScript(
            'ga4-init',
            {},
            `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga4}');`,
          )
        }

        const gtm = settings['seo.gtm']?.trim()
        if (gtm) {
          addScript(
            'gtm',
            {},
            `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`,
          )
        }

        const customHead = settings['seo.customHead']?.trim()
        if (customHead && mark('custom-head')) {
          const fragment = document.createRange().createContextualFragment(customHead)
          document.head.appendChild(fragment)
        }
      })
      .catch(() => {
        // نبودِ تنظیمات نباید نمایش سایت را متوقف کند.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
