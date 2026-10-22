# استقرار روی هاست اشتراکی (بدون تغییر Document Root)

این سند برای هاست‌های اشتراکی لینوکس با **LiteSpeed یا Apache** است؛ همان چیزی که
پنل‌های cPanel و DirectAdmin می‌دهند و در آن:

- Document Root دامنه همان `public_html` است و قابل تغییر نیست،
- SSH و Composer معمولاً نیست،
- Node.js هم نیست.

## ۱. چرا دامنه ۴۰۴ می‌دهد؟

نشانهٔ کلاسیک این است که `https://noudalife.ir` پاسخ می‌دهد:

```
HTTP/2 404
server: LiteSpeed
... Proudly powered by LiteSpeed Web Server
```

این صفحه، ۴۰۴ خودِ وب‌سرور است، نه ۴۰۴ لاراول یا React. یعنی وب‌سرور در
`public_html` هیچ `index.php`/`index.html` قابل سروی پیدا نکرده است. علت‌های رایج:

| وضعیت | نتیجه |
| --- | --- |
| فایل‌ها در زیرپوشه‌ای مثل `public_html/nodehi` یا `public_html/site` آپلود شده‌اند | ریشهٔ دامنه خالی است → ۴۰۴ |
| فقط کد لاراول آپلود شده و خروجی build فرانت‌اند (`index.html` + `assets/`) نرفته | ریشه index ندارد → ۴۰۴ |
| فایل‌ها آپلود شده‌اند ولی نامشان با نقطه شروع می‌شود و File Manager آن‌ها را ندیده (`.htaccess`) | مسیردهی و SPA کار نمی‌کند |
| پروژه با `git clone` روی هاست گذاشته شده (کل ریپو) | `index.html` در ریشه نیست و `backend/.env` هم در معرض دانلود است |

نکتهٔ مهم: در این هاست‌ها **نمی‌توان Document Root را روی `backend/public` گذاشت**
(یا پنل اجازه نمی‌دهد، یا دامنه به `public_html` قفل است). راه‌حل این پروژه:

```
/ (هوم‌دایرکتوری هاست)
├── public_html/          ← داکیومنتروت دامنه
│   ├── index.html        ← پوستهٔ SPA + صفحات پررندر‌شده
│   ├── assets/ …         ← خروجی Vite (product/، blog/، category/، hero/ …)
│   ├── .htaccess         ← /api → laravel.php، بقیه → فایل یا index.html
│   ├── laravel.php       ← تنها نقطهٔ ورود PHP (به nodehi/ وصل می‌شود)
│   ├── install.php       ← نصب‌کنندهٔ مرورگری (بعد از نصب خودش را حذف می‌کند)
│   └── uploads/          ← تصاویر آپلودی پنل (باید قابل نوشتن باشد)
└── nodehi/               ← کد لاراول؛ بیرون از داکیومنتروت و غیرقابل دانلود
    ├── app/ bootstrap/ config/ database/ routes/ storage/ vendor/ …
    └── .env              ← با نصب‌کننده ساخته می‌شود
```

`laravel.php` همان کاری را می‌کند که `backend/public/index.php` می‌کرد، به‌علاوهٔ
`$app->usePublicPath(__DIR__)` تا `public_path()` (و در نتیجه `public/uploads`) به
`public_html` اشاره کند.

## ۲. ساخت بستهٔ آماده

بسته یک فایل zip است که همهٔ چیزهای لازم را دارد: خروجی Vite (با پررندر و
`sitemap.xml`)، لاراول کامل با `vendor/` نسخهٔ تولید و نصب‌کننده. روی سیستم خودتان:

```bash
npm ci --prefix frontend
PHP_BIN=$(command -v php) node tools/build-host-release.mjs --site-url=https://noudalife.ir
```

اگر PHP در PATH نیست، مسیر باینری را بدهید (`PHP_BIN=/usr/local/bin/php8.3 …`).
خروجی در `artifacts/nodehi-host-YYYYMMDD.zip` ساخته می‌شود و شامل
`public_html/`، `nodehi/` و `INSTALL.txt` است.

گزینه‌ها: `--skip-build` (استفاده از `frontend/dist` موجود)، `--skip-zip` (فقط پوشهٔ
`.build/host-release`)، `--site-url=` (دامنه‌ای که در canonical/og/sitemap می‌نشیند).

> `VITE_API_URL` در بیلد روی `/api` تنظیم می‌شود؛ یعنی سایت و API روی همان دامنه‌اند
> و CORS لازم نیست. دامنه عوض شد؟ بسته را با `--site-url` تازه بسازید تا
> canonical و sitemap درست بمانند.

## ۳. آپلود (بدون SSH)

1. در File Manager وارد هوم‌دایرکتوری شوید (بالاتر از `public_html`).
2. zip را آپلود و Extract کنید تا دو پوشهٔ `public_html` و `nodehi` کنار هم ساخته شوند.
   - اگر پوشهٔ `public_html/nodehi` ساخته شد (یعنی zip داخل `public_html` باز شده)،
     `nodehi` را یک سطح بالا ببرید؛ وگرنه کد برنامه در معرض دانلود است.
3. مطمئن شوید محتوای `public_html` (نه خودِ پوشه) در ریشهٔ دامنه است:
   `public_html/index.html`، `public_html/.htaccess`، `public_html/laravel.php`.
4. دسترسی‌ها: پوشه‌ها `755`؛ اگر نصب‌کننده از نوشتن شکایت کرد `775` بدهید:
   `nodehi/storage`، `nodehi/bootstrap/cache`، `nodehi/database`، `public_html/uploads`.
5. در مرورگر `https://noudalife.ir/install.php` را باز کنید.

## ۴. نصب‌کننده چه می‌کند؟

صفحهٔ نصب چهار کار انجام می‌دهد:

1. **بررسی پیش‌نیاز**: PHP 8.2+، افزونه‌های `pdo`، `pdo_sqlite` یا `pdo_mysql`،
   `mbstring`، `openssl`، `tokenizer`، `fileinfo`، `curl`، `dom`، `xml` و دسترسی نوشتن.
   هر مورد ✗ بود، همان‌جا دلیلش نوشته می‌شود.
2. **ساخت `.env`** بیرون از داکیومنتروت: `APP_KEY` تازه، `APP_ENV=production`،
   `APP_DEBUG=false`، `APP_URL`، دیتابیس، `FRONTEND_URL` و کلیدهای اختیاری پیامک/زرین‌پال.
3. **اجرای مهاجرت‌ها** (و در صورت تیک‌خوردن، دادهٔ نمونه: کاتالوگ، مقاله، سوالات
   متداول، اسلایدها) و تعیین شمارهٔ همراه مدیر.
4. **ساخت قفل نصب** (`nodehi/storage/app/installed.lock`) و حذف `install.php`.

اجرای مجدد نصب: `installed.lock` و `.env` را پاک کنید و `install.php` را دوباره آپلود کنید.

### دیتابیس

- **SQLite** (پیش‌فرض): فایل `nodehi/database/database.sqlite`. برای یک فروشگاه کوچک
  کافی است و هیچ تنظیمی در پنل لازم ندارد. شرطش فعال‌بودن `pdo_sqlite` و نوشتن در
  پوشهٔ `database/` است.
- **MySQL/MariaDB**: دیتابیس و کاربر را در بخش MySQL Databases بسازید و در فرم وارد کنید.
  نصب‌کننده قبل از هر تغییری اتصال را امتحان می‌کند.

### ورود مدیر

ورود فقط با شمارهٔ همراه و کد یک‌بارمصرف است (رمز عبور وجود ندارد). اگر کلید
کاوه‌نگار را وارد نکرده‌اید، گزینهٔ «ورود بدون پیامک» را در فرم روشن بگذارید؛ در این
حالت کد در پاسخ API و روی همان صفحهٔ ورود نمایش داده می‌شود تا بتوانید وارد
`/admin` شوید.

> ⚠️ با روشن‌بودن `AUTH_OTP_DEV_MODE` هر کسی می‌تواند با هر شماره‌ای وارد شود.
> به‌محض ثبت کلید کاوه‌نگار، در `nodehi/.env` مقدار زیر را صفر کنید:
>
> ```env
> AUTH_OTP_DEV_MODE=0
> KAVENEGAR_API_KEY=...
> KAVENEGAR_OTP_TEMPLATE=...
> ```

## ۵. گزینهٔ دوم: هاست با SSH/Composer

اگر SSH دارید، همان ساختار بالا را نگه دارید و فقط مراحل ساخت را روی هاست انجام دهید:

```bash
cd ~/nodehi
php ~/tools/composer.phar install --no-dev --optimize-autoloader
cp .env.example .env       # سپس مقادیر را پر کنید
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force   # فقط بار اول
```

سپس `install.php` را حذف کنید (یا از فرم نصب‌کننده استفاده کنید) و خروجی
`npm run prerender` را در `public_html` بگذارید. کدهای `laravel.php` و `.htaccess`
همان‌هایی هستند که در `deploy/public_html/` مخزن قرار دارند.

## ۶. به‌روزرسانی نسخه

1. از `nodehi/database/database.sqlite` (یا دامپ MySQL) و `nodehi/.env` و
   `public_html/uploads/` نسخهٔ پشتیبان بگیرید.
2. بستهٔ تازه بسازید، `nodehi/app`، `nodehi/config`، `nodehi/routes`،
   `nodehi/database/migrations`، `nodehi/vendor` و فایل‌های `public_html` (به‌جز
   `uploads/`) را جایگزین کنید. `.env` و دیتابیس را دست نزنید.
3. اگر مهاجرت تازه‌ای هست، یک بار نصب‌کننده را اجرا کنید (قفل و `.env` را پاک کنید،
   `install.php` را آپلود کنید) یا با SSH `php artisan migrate --force`.

## ۷. عیب‌یابی

| نشانه | علت | راه‌حل |
| --- | --- | --- |
| ۴۰۴ LiteSpeed روی `/` | `index.html` در ریشهٔ داکیومنتروت نیست | محتوای `public_html` بسته را مستقیم در `public_html` بگذارید |
| `/` بالا می‌آید ولی `/api/health` ۴۰۴ | `.htaccess` آپلود نشده یا mod_rewrite خاموش است | فایل `.htaccess` را بگذارید؛ در پنل LiteSpeed/Apache آن را فعال کنید |
| ۵۰۳ با پیام «سایت هنوز نصب نشده» | `.env` ساخته نشده | `/install.php` را باز کنید |
| ۵۰۰ روی همهٔ مسیرها | `vendor/` آپلود نشده یا `nodehi` جای اشتباهی است | مسیر `nodehi/vendor/autoload.php` را بررسی و بسته را دوباره آپلود کنید |
| ۵۰۰ و در لاگ `could not find driver` | `pdo_sqlite`/`pdo_mysql` خاموش است | از پنل، افزونهٔ PHP را فعال یا نسخهٔ PHP را عوض کنید |
| ۵۰۰ بعد از تغییر `.env` | کش کانفیگ | فایل‌های `nodehi/bootstrap/cache/*.php` را پاک کنید |
| تصاویر `uploads` ۴۰۴ | `laravel.php` قدیمی بدون `usePublicPath` | فایل `laravel.php` بسته را دوباره آپلود کنید |
| خطای CORS در کنسول | `VITE_API_URL` مطلق به دامنهٔ دیگر | بسته را با `VITE_API_URL=/api` بسازید (پیش‌فرض اسکریپت) |
| «سرویس پیامک در دسترس نیست» (۵۰۳) | کلید کاوه‌نگار ثبت نشده | کلید را در `.env` بگذارید یا موقتاً `AUTH_OTP_DEV_MODE=1` |
| خطای ‎-14 زرین‌پال | callback با دامنهٔ ثبت‌شده یکی نیست | `ZARINPAL_CALLBACK_URL` و دامنهٔ پذیرنده را هم‌سان کنید |
| ۴۰۳ هنگام آپلود تصویر | `public_html/uploads` قابل نوشتن نیست | دسترسی را `775` کنید |
| صفحهٔ سفید بدون خطا | خطای PHP با `APP_DEBUG=false` پنهان است | موقتاً `APP_DEBUG=true` و `LOG_LEVEL=debug`، سپس `nodehi/storage/logs/laravel.log` |

برای دیدن خطای واقعی، `APP_DEBUG=true` را فقط چند دقیقه روشن بگذارید و بعد خاموش کنید.

## ۸. چک‌لیست پس از نصب

- [ ] `https://دامنه/` بالا می‌آید و محصولات از API می‌آیند.
- [ ] `https://دامنه/api/health` مقدار `ok: true` و تعداد کاتالوگ را برمی‌گرداند.
- [ ] `https://دامنه/product/<یک-اسلاگ>/` با عنوان و متادیتای همان محصول باز می‌شود.
- [ ] `https://دامنه/sitemap.xml` و `robots.txt` در دسترس‌اند.
- [ ] ورود به `/admin` با شمارهٔ مدیر انجام شد.
- [ ] `install.php` حذف شده است (`https://دامنه/install.php` باید ۴۰۴ بدهد).
- [ ] SSL فعال است و `APP_URL` با `https` شروع می‌شود.
- [ ] `AUTH_OTP_DEV_MODE=0` بعد از ثبت کلید کاوه‌نگار.
- [ ] از دیتابیس و `uploads/` نسخهٔ پشتیبان گرفته شده است.
