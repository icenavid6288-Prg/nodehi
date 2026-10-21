# مهاجرت به Laravel + React

این سند وضعیت مهاجرت فروشگاه نودهی از Next.js به **بک‌اند Laravel** و
**فرانت‌اند React (Vite)** را ثبت می‌کند.

## ساختار

```
backend/          Laravel 12 — API، Eloquent، migration و seeder
frontend/         React 18 + Vite + Tailwind — SPA فروشگاه
scripts/          اسکریپت‌های اجرا (dev-full.mjs)
docs/             مستندات
```

نسخهٔ Next.js تا تکمیل توازن امکانات در ریشه باقی می‌ماند و پس از آن حذف
می‌شود (`src/`, `next.config.mjs`, `server.js`, وابستگی‌های Next).

## اجرا

```bash
# ۱) پیش‌نیاز: PHP 8.2+ (XAMPP) و Node 18+
# ۲) نصب وابستگی‌ها (یک‌بار)
npm install
npm --prefix frontend install

# ۳) دیتابیس + داده اولیه
php backend/artisan migrate --seed        # یا: C:\xampp\php\php.exe backend\artisan migrate --seed

# ۴) اجرای هم‌زمان API و فرانت‌اند
npm run dev:full
#   بک‌اند: http://127.0.0.1:8000
#   فرانت:  http://127.0.0.1:5173
```

تنظیمات بک‌اند در `backend/.env` است. فرانت‌اند در توسعه از پروکسی Vite
استفاده می‌کند؛ در تولید `VITE_API_URL` را تنظیم کنید.

> برای دیدن کد ورود در توسعه، در `backend/.env` مقدار
> `AUTH_OTP_DEV_MODE=true` را بگذارید. پیش‌فرض این کلید `false` است و در
> محیط production هرگز کد را برنمی‌گرداند.

## دیتابیس

- موتور: SQLite (`backend/database/database.sqlite`) — همان انتخاب نسخهٔ Next
  برای اجرای بدون سرویس بیرونی.
- مدل‌ها: `User, Address, OtpCode, AuthSession, Category, Brand, Product,
  Coupon, Order, OrderItem, Review, ContactMessage, StockAlert, Setting,
  SmsMessage, PaymentGateway, AutomationEvent, AuditLog, Article,
  ArticleCategory, Faq, FaqCategory, LegalPage, LoyaltyTier,
  LoyaltyInstallment, LoyaltyStep`
- داده اولیه (محصولات، دسته‌ها، برندها) در `backend/database/seeders/data/`
  نگه‌داری می‌شود و از `prisma/seed-data` کپی شده است؛ دلیل کپی این است که
  بک‌اند بدون وابستگی به سورس Next هم قابل نصب باشد.
- محتوای صفحات عمومی (مقالات، پرسش‌ها، صفحات حقوقی، باشگاه مشتریان) در همان
  پوشه در `content.json` است. این فایل منبع حقیقت است و
  `node scripts/export-content.mjs` فقط سلامت آن را بررسی می‌کند.
- اگر یکی از فایل‌های داده گم شود، seeder با پیام روشن متوقف می‌شود و داده
  خالی نمی‌کارد.
- پوشهٔ `data/` در `.gitignore` ریشه فقط برای دیتابیس محلی است؛ فایل‌های seed
  با الگوی `/data/` دیگر نادیده گرفته نمی‌شوند.

## API (پیاده‌شده)

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/api/health` | سلامت سرویس + تعداد کالا |
| GET | `/api/products` | فهرست با فیلتر `q, category, brand, sort, inStock, onSale, tag, minPrice, maxPrice, page, perPage` |
| GET | `/api/products/{slug}` | جزئیات + مرتبط‌ها |
| GET/POST | `/api/products/{slug}/reviews` | نظرات |
| GET | `/api/categories`, `/api/categories/{slug}` | دسته‌ها |
| GET | `/api/brands`, `/api/brands/{slug}` | برندها |
| GET | `/api/search?q=` | جستجوی سریع |
| GET | `/api/settings/public` | تنظیمات عمومی |
| GET | `/api/payments/methods` | روش‌های پرداخت |
| POST | `/api/contact` | فرم تماس |
| POST | `/api/stock-alerts` | اطلاع موجودی |
| POST | `/api/checkout` | ثبت سفارش (قیمت و موجودی سمت سرور) |
| POST | `/api/orders/track` | پیگیری سفارش |
| POST | `/api/auth/otp/request` | ارسال کد |
| POST | `/api/auth/otp/verify` | تأیید کد + توکن |
| GET | `/api/auth/session` | نشست فعلی (Bearer) |
| POST | `/api/auth/logout` | خروج |
| GET | `/api/account/orders` | سفارش‌های کاربر |
| GET | `/api/articles` | فهرست مقالات + دسته‌ها، فیلتر `category` و `limit` |
| GET | `/api/articles/{slug}` | متن مقاله + مقالات مرتبط + کالاهای مرتبط |
| GET | `/api/faqs` | پرسش‌ها به‌همراه دسته‌بندی و تعداد هر گروه |
| GET | `/api/legal`, `/api/legal/{slug}` | فهرست و متن صفحات حقوقی (`terms`, `privacy`) |
| GET | `/api/loyalty` | سطوح عضویت، گزینه‌های اقساط و مراحل خرید اقساطی |

### API مدیریت (توکن `admin`/`operator`)

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/api/admin/stats` | آمار کاتالوگ، سفارش‌ها، درآمد، نظرات و آخرین فعالیت‌ها |
| GET | `/api/admin/products` | فهرست مدیریتی با `q, status, page, perPage` |
| GET | `/api/admin/products/{slug}` | جزئیات کامل کالا |
| POST | `/api/admin/products` | ساخت کالا |
| PATCH | `/api/admin/products/{slug}` | ویرایش جزئی (فقط فیلدهای ارسالی) |
| DELETE | `/api/admin/products/{slug}` | حذف؛ اگر سابقهٔ سفارش دارد ۴۰۹ و باید غیرفعال شود |
| GET | `/api/admin/orders` | فهرست با `status, q, page` |
| GET | `/api/admin/orders/{orderNumber}` | جزئیات سفارش |
| PATCH | `/api/admin/orders/{orderNumber}` | تغییر وضعیت/کد رهگیری/یادداشت؛ لغو، موجودی را برمی‌گرداند |
| GET | `/api/admin/reviews` | صف نظرات با `status` |
| PATCH | `/api/admin/reviews/{id}` | تأیید/رد و بازمحاسبهٔ امتیاز محصول |
| GET | `/api/admin/audit` | گزارش فعالیت مدیریتی |

## امنیت

- ورود فقط با OTP؛ رمز عبور وجود ندارد. کد با SHA-256 ذخیره می‌شود و حداکثر
  ۵ تلاش دارد.
- توکن نشست به شکل هش در `auth_sessions` ذخیره می‌شود؛ توکن خام فقط در
  مرورگر است.
- قیمت، تخفیف و موجودی در سرور محاسبه/بررسی می‌شود؛ ورودی کلاینت مرجع نیست.
- CORS فقط مبدأ فرانت‌اند را می‌پذیرد (`backend/config/cors.php`).
- `AUTH_OTP_DEV_MODE` فقط در `APP_DEBUG=true` کد را برمی‌گرداند.

## وضعیت توازن امکانات

| بخش | وضعیت |
|---|---|
| خانه، فروشگاه، محصول، سبد، تسویه، پیگیری، ورود، حساب، درباره، تماس | ✅ منتقل شده |
| کاتالوگ، فیلترها، جستجو، نظرات (خواندن)، فرم تماس، اطلاع موجودی | ✅ منتقل شده |
| ثبت سفارش با کد تخفیف و کنترل موجودی | ✅ منتقل شده |
| بلاگ (`/blog`, `/blog/:slug`)، راهنما، FAQ، وفاداری | ✅ منتقل شده |
| صفحات حقوقی (`/terms`, `/privacy`) | ✅ منتقل شده |
| پنل مدیریت: داشبورد، محصولات (CRUD)، سفارش‌ها (وضعیت/رهگیری/لغو با برگشت موجودی)، نظرات، گزارش فعالیت | ✅ پیاده‌شده |
| پنل مدیریت: کوپن، مشتریان، تنظیمات، پرداخت، گزارش فروش، اتوماسیون | ⏳ باقی‌مانده |
| درگاه‌های پرداخت (زرین‌پال/اسنپ‌پی) و بازگشت تراکنش | ⏳ باقی‌مانده |
| حذف نهایی Next.js | ⏳ بعد از توازن کامل |

## تفاوت‌های عمدی با نسخهٔ Next

- شناسه‌ها عددی (bigint) شدند نه cuid متنی؛ `order_number` و `slug` همچنان
  کلید عمومی هستند.
- نشست لاراول (`auth_sessions`) با هش توکن پیاده شد، نه NextAuth.
- پرداخت آنلاین فعلاً «ثبت سفارش + پیام» است تا کلید درگاه واقعی تنظیم شود؛
  هیچ پرداخت موفقی جعل نمی‌شود.
