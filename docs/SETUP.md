# راه‌اندازی و استقرار

---

## ۱. پیش‌نیازها

| ابزار | نسخه | کاربرد |
| --- | --- | --- |
| PHP | ۸.۲ یا بالاتر | API لاراول |
| Composer | ۲.x | نصب وابستگی‌های بک‌اند |
| Node.js | ۱۸ یا بالاتر | ساخت فرانت‌اند |
| SQLite | همراه PHP (`pdo_sqlite`) | دیتابیس توسعه |
| MySQL/PostgreSQL | اختیاری | دیتابیس تولید |

افزونه‌های لازم PHP: `pdo_sqlite` (یا `pdo_mysql`)، `mbstring`، `openssl`، `curl`،
`fileinfo`، `tokenizer`.

---

## ۲. نصب محلی

### بک‌اند

```bash
cd backend
cp .env.example .env
php ../tools/composer.phar install
php artisan key:generate
touch database/database.sqlite      # ویندوز: فایل را دستی بسازید
php artisan migrate --seed
```

اگر Composer نصب است، `composer install` کافی است. اسکریپت آماده‌سازی:

```bash
composer run setup
```

### فرانت‌اند

```bash
npm --prefix frontend install
```

### اجرا

```bash
npm run dev
```

| سرویس | آدرس |
| --- | --- |
| API | <http://127.0.0.1:8000> |
| فروشگاه | <http://127.0.0.1:5173> |

اجرای جداگانه:

```bash
php backend/artisan serve --host=127.0.0.1 --port=8000
npm --prefix frontend run dev
```

---

## ۳. متغیرهای محیطی

### `backend/.env`

| متغیر | پیش‌فرض | توضیح |
| --- | --- | --- |
| `APP_ENV` | `local` | در تولید `production` |
| `APP_DEBUG` | `true` | در تولید حتماً `false` |
| `APP_URL` | `http://localhost:8000` | آدرس API |
| `APP_KEY` | — | با `php artisan key:generate` ساخته می‌شود |
| `DB_CONNECTION` | `sqlite` | `mysql` یا `pgsql` در تولید |
| `FRONTEND_URL` | `http://localhost:5173` | تنها مبدأ مجاز CORS و مقصد ریدایرکت بازگشت از درگاه |
| `ZARINPAL_MERCHANT_ID` | خالی | شناسهٔ پذیرندهٔ زرین‌پال؛ اولویت با مقدار پنل مدیریت است |
| `ZARINPAL_SANDBOX` | `true` | `false` در تولید |
| `ZARINPAL_CALLBACK_URL` | `${APP_URL}/api/payments/zarinpal/callback` | باید با دامنهٔ ثبت‌شده در زرین‌پال یکی باشد (خطای ‎-14) |
| `AUTH_SESSION_DAYS` | `30` | طول عمر نشست |
| `AUTH_OTP_DEV_MODE` | `1` | فقط توسعه؛ در تولید `0` |
| `KAVENEGAR_API_KEY` | خالی | کلید ارسال پیامک |
| `KAVENEGAR_OTP_TEMPLATE` | خالی | نام قالب کد ورود |
| `QUEUE_CONNECTION` | `database` | صف (فعلاً استفاده‌ای ندارد) |
| `CACHE_STORE` | `database` | پشتوانهٔ محدودیت نرخ |

### `frontend/.env`

| متغیر | توضیح |
| --- | --- |
| `VITE_API_URL` | آدرس کامل API در تولید. خالی یعنی `/api` (پروکسی توسعه) |
| `VITE_SITE_URL` | دامنهٔ عمومی سایت برای canonical/OG؛ در تولید الزامی |
| `SITE_URL` | همان مقدار هنگام اجرای پررندر (سایت‌مپ و canonical) |
| `PRERENDER_API_BASE` | فقط برای `npm run seo:refresh` — تازه‌سازی فهرست کاتالوگ از API (پیش‌فرض `http://localhost:8000`) |

---

## ۴. استقرار روی هاست PHP

### ۴.۱ بک‌اند

1. فایل‌ها را خارج از `public_html` قرار دهید (مثلاً `~/nodehi/backend`).
2. Document Root دامنه یا زیردامنه را روی `backend/public` تنظیم کنید.
3. `backend/.env` تولید را بسازید و `APP_DEBUG=false` بگذارید.
4. مجوز نوشتن برای `storage/` و `bootstrap/cache/` بدهید:

```bash
chmod -R 775 storage bootstrap/cache
```

5. نصب و بهینه‌سازی:

```bash
php ../tools/composer.phar install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

اگر Document Root را نمی‌توانید تغییر دهید، پروژه را در `public_html` نگذارید؛
فقط محتوای `backend/public` را در دسترس وب قرار دهید و مسیرهای داخلی را با
`index.php` هدایت کنید.

### ۴.۲ فرانت‌اند

روی سیستم خودتان بسازید و فقط خروجی را آپلود کنید. برای سئو از `seo:prerender`
استفاده کنید تا صفحات عمومی، `sitemap.xml` و `robots.txt` هم ساخته شوند:

```bash
# ۱) (اختیاری) فهرست اسلاگ‌های کاتالوگ را از API تازه کنید — نیازمند API بالا
PRERENDER_API_BASE="https://api.example.com/api" npm run seo:refresh

# ۲) build کامل + پررندر — متادیتا از هستهٔ مشترک frontend/src/lib/seo-source.ts
VITE_API_URL="https://api.example.com/api" \
VITE_SITE_URL="https://example.com" \
SITE_URL="https://example.com" \
npm run seo:prerender
```

اگر فقط `npm run build` اجرا شود، SPA سالم است ولی صفحه‌های پررندرشده و
`sitemap.xml`/`robots.txt` ساخته نمی‌شوند.

محتوای `frontend/dist` را در وب‌سرور استاتیک قرار دهید. مسیرهای محصول و مقاله
پوشه‌ای‌اند (`product/{slug}/index.html`)؛ برای Apache باید `DirectoryIndex`
فعال و `FallbackResource /index.html` تنظیم شود. برای Nginx:

```nginx
location / {
  try_files $uri $uri/ $uri/index.html /index.html;
}
```

بدون `$uri/index.html`، آدرس بدون اسلش پایانی به صفحهٔ اصلی fallback می‌کند و
متادیتای محصول از دست می‌رود.

### ۴.۳ CORS

در `backend/.env` مقدار `FRONTEND_URL` را دقیقاً روی دامنهٔ فرانت‌اند بگذارید
(با `https://`). مبدأهای `localhost` فقط برای توسعه در `config/cors.php` مانده‌اند.

---

## ۵. دیتابیس تولید

SQLite برای ترافیک کم و یک سرور مناسب است. برای چند نمونه یا ترافیک بیشتر:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nodehi
DB_USERNAME=...
DB_PASSWORD=...
```

سپس:

```bash
php artisan migrate --force
php artisan db:seed --force   # فقط بار اول
```

پیش از مهاجرت، از دیتابیس فعلی نسخهٔ پشتیبان بگیرید. ستون‌های JSON متنی روی
MySQL/PostgreSQL هم کار می‌کنند.

---

## ۶. عیب‌یابی

| نشانه | علت محتمل | راه‌حل |
| --- | --- | --- |
| `could not find driver` | افزونهٔ `pdo_sqlite` نصب نیست | افزونه را در PHP فعال کنید |
| ۴۰۴ روی همهٔ مسیرهای API | Document Root روی `public_html` است | آن را به `backend/public` تغییر دهید |
| خطای CORS | `FRONTEND_URL` نادرست است | دامنهٔ دقیق فرانت‌اند را بگذارید |
| «سرویس پیامک در دسترس نیست» | کلید کاوه‌نگار تنظیم نشده | `KAVENEGAR_API_KEY` و قالب را بگذارید یا در توسعه `AUTH_OTP_DEV_MODE=1` بماند |
| «شناسه پذیرندهٔ زرین‌پال … ثبت نشده» | درگاه پیکربندی نشده | `ZARINPAL_MERCHANT_ID` یا فیلد merchant id در جدول `payment_gateways` را پر کنید |
| خطای ‎-14 زرین‌پال | callback با دامنهٔ ثبت‌شده یکی نیست | `ZARINPAL_CALLBACK_URL` را روی همان دامنهٔ پذیرنده بگذارید |
| صفحه‌های بلاگ/سوالات خالی‌اند | seed اجرا نشده است | `php artisan db:seed --force` |
| ۵۰۰ پس از تغییر `.env` | کش کانفیگ قدیمی | `php artisan config:clear` |
