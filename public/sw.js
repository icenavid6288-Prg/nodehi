/*
 * Service Worker فروشگاه نودهی.
 *
 * استراتژی کش:
 *  - اسناد ناوبری: network-first (محتوای تازه) با فالبک کش و صفحه آفلاین
 *  - دارایی‌های استاتیک Next.js: cache-first (نام فایل شامل هش نسخه است)
 *  - تصاویر: cache-first با سقف تعداد
 *
 * از کش کردن صفحات پنل کاربری و سبد خرید خودداری می‌شود تا اطلاعات حساس
 * روی دستگاه به‌صورت ماندگار باقی نماند.
 */

const VERSION = 'nodehi-v1'
const STATIC_CACHE = `${VERSION}-static`
const IMAGE_CACHE = `${VERSION}-images`
const MAX_IMAGE_ENTRIES = 60

const OFFLINE_URL = '/offline.html'

/**
 * مسیرهایی که هرگز نباید کش شوند.
 * `/admin` هم اضافه شده: صفحات پنل مدیریت نه در حالت آفلاین فایده‌ای دارند و نه
 * باید روی دستگاه مشترک بمانند؛ کش‌شدنشان در حالت بعدی فقط HTML کهنه را در
 * برابر باندل تازه JS می‌گذاشت و خطای hydration می‌ساخت.
 */
const NEVER_CACHE = ['/admin', '/account', '/cart', '/checkout', '/api/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/icon.svg'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

function isNeverCached(url) {
  return NEVER_CACHE.some((path) => url.pathname.startsWith(path))
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  await cache.delete(keys[0])
  return trimCache(cacheName, maxEntries)
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  // فقط درخواست‌های GET و هم‌مبدأ کش می‌شوند
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isNeverCached(url)) return

  // اسناد ناوبری
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match(OFFLINE_URL)
        }),
    )
    return
  }

  // تصاویر
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          const copy = response.clone()
          caches.open(IMAGE_CACHE).then((cache) => {
            cache.put(request, copy).then(() => trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES))
          })
          return response
        })
      }),
    )
    return
  }

  // دارایی‌های استاتیک
  if (url.pathname.startsWith('/_next/static/') || /\.(css|js|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          const copy = response.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
      }),
    )
  }
})
