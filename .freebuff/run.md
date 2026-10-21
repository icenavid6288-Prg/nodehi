# Nodehi — راه‌اندازی پیش‌نمایش (این worktree)

## ۱. بازتولید artifactهای committed-نشده

از یک checkout تازه، به ترتیب:

1. **وابستگی‌های فرانت‌اند** (با npm و با توجه به `frontend/package-lock.json`):

   ```bash
   npm --prefix frontend ci
   ```

2. **فایل‌های env**: `frontend/.env.local` در صورت وجود از checkout اصلی «کپی»
   شود (نه symlink)؛ فقط کلیدهای عمومی `VITE_API_URL`/`VITE_SITE_URL` و در صورت
   نیاز پورت. مقدارهای secret هرگز در این فایل یا ریپو نوشته نمی‌شوند.

3. **دیتابیس توسعهٔ بک‌اند** (SQLite):

   ```bash
   cd backend
   touch database/database.sqlite
   php artisan migrate --seed
   ```

   در این VM نصب PHP در PATH نیست و باینری موجود روی `/tmp/php84/php` است؛
   اگر از بین رفته باشد دوباره نصب شود (PHP 8.4 CLI + افزونه‌های sqlite/pdo).

4. **متادیتای ایستا (اختیاری، برای `dist/`)** — نیاز به API بالا:

   ```bash
   npm run seo:refresh      # تازه‌سازی فهرست کاتالوگ در prerender-targets.json
   npm run seo:prerender    # build کامل + پررندر صفحات + sitemap/robots
   ```

## ۲. اجرای سرورها

دو پروسهٔ جدا لازم است (هر دو باید تا انتهای جلسه زنده بمانند؛ لاگ در
`logs/` نوشته می‌شود):

```bash
# ۱) API لاراول روی 127.0.0.1:8000
cd backend && setsid nohup /tmp/php84/php artisan serve --host=127.0.0.1 --port=8000 \
  > ../logs/api-dev.log 2>&1 < /dev/null &

# ۲) vite روی 0.0.0.0:3000 — دامنهٔ پیش‌نمایش باید صریح allow شود (نه allowedHosts:true)
VITE_ALLOWED_HOSTS=pv-dfdfac0b1d6d-9b89a97f-7f3f-4d44-8989-75d940f4cbd0.style.dev \
  setsid nohup npm run dev --prefix frontend -- --host 0.0.0.0 --port 3000 \
  > logs/vite-dev.log 2>&1 < /dev/null &
```

راستی‌آزمایی:

```bash
curl http://127.0.0.1:8000/api/health                       # ok:true
curl -H "Host: pv-dfdfac0b1d6d-9b89a97f-7f3f-4d44-8989-75d940f4cbd0.style.dev" \
     -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/   # 200 (نه 403)
curl http://127.0.0.1:3000/api/health                        # پروکسی vite
```

نکته: پیکربندی vite پورت پیش‌فرض 5173 و `strictPort` دارد؛ پیش‌نمایش با
`-- --port 3000` روی همان کانفیگ سوار می‌شود. پوشهٔ `frontend/dist` نباید روی
پورت 3000 سرو شود؛ پیش‌نمایشِ dev سرور است.
