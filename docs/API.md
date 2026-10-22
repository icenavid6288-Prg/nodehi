# مرجع API نودهی

همهٔ مسیرها زیر `/api` هستند و پاسخ‌ها JSON‌اند. مسیرهای محافظت‌شده توکن
`Authorization: Bearer <token>` می‌خواهند.

---

## قالب پاسخ

**موفق**

```json
{ "ok": true, "...": "دادهٔ مخصوص هر مسیر" }
```

**خطای منطقی** (کنترلرها)

```json
{ "ok": false, "error": "پیام قابل نمایش به کاربر" }
```

**خطای اعتبارسنجی لاراول** (۴۲۲)

```json
{
  "message": "The phone field is required. (and 1 more error)",
  "errors": { "phone": ["The phone field is required."] }
}
```

کلاینت فرانت‌اند هر دو شکل را می‌خواند و پیام فارسی کنترلر را در اولویت قرار
می‌دهد.

---

## ۱) سلامت

```
GET /api/health
```

```json
{ "ok": true, "status": "healthy", "service": "Nodehi", "catalogSize": 23 }
```

---

## ۲) کاتالوگ

### فهرست محصولات

```
GET /api/products
```

| پارامتر | مقدار |
| --- | --- |
| `q` | جستجوی متنی در نام و توضیح |
| `category` | نامک یا چند نامک جداشده با کاما |
| `brand` | نامک یا چند نامک جداشده با کاما |
| `minPrice` / `maxPrice` | تومان |
| `inStock` | `1` |
| `onSale` | `1` |
| `tag` | تگ محصول |
| `sort` | `relevance`, `price-asc`, `price-desc`, `newest`, `popular`, `rating`, `discount` |
| `page` / `perPage` | صفحه‌بندی (حداکثر ۶۰) |

```json
{ "ok": true, "total": 23, "page": 1, "perPage": 24, "pageCount": 1, "items": [] }
```

### چند محصول با نامک

```
GET /api/products/by-slugs?slugs=slug-a,slug-b
```

حداکثر ۸ نامک؛ ترتیب ورودی حفظ می‌شود. برای جدول مقایسه استفاده می‌شود.

### جزئیات محصول

```
GET /api/products/{slug}
```

شامل `product`، `related` و مشخصات کامل.

### نظرات محصول

```
GET  /api/products/{slug}/reviews
POST /api/products/{slug}/reviews
```

بدنهٔ ثبت نظر:

```json
{ "rating": 5, "title": "کیفیت خوب", "body": "متن نظر", "author": "نام" }
```

نظر پس از ثبت در وضعیت `pending` می‌ماند. اگر توکن معتبر بفرستید، نظر به حساب
شما وصل می‌شود؛ در غیر این صورت مهمان ثبت می‌شود.

### دسته‌ها و برندها

```
GET /api/categories          GET /api/categories/{slug}
GET /api/brands              GET /api/brands/{slug}
```

### جستجوی سریع

```
GET /api/search?q=یخچال
```

حداکثر ۸ محصول، ۴ دسته و ۴ برند.

---

## ۳) تنظیمات، پرداخت و تخفیف

```
GET /api/settings/public
GET /api/payments/methods
POST /api/coupons/validate
```

درخواست اعتبارسنجی کد تخفیف:

```json
{ "code": "NODEHI10", "subtotal": 12000000 }
```

پاسخ موفق:

```json
{
  "ok": true,
  "coupon": { "code": "NODEHI10", "label": "۱۰٪ تخفیف", "percent": 10, "discount": 1200000 }
}
```

اگر کد معتبر نباشد، پاسخ ۴۲۲ با `ok: false` برمی‌گردد. این مسیر فقط برای نمایش
است؛ هنگام ثبت سفارش دوباره روی سرور بررسی می‌شود.

---

## ۴) محتوا

```
GET /api/articles            ?category=&limit=
GET /api/articles/{slug}
GET /api/faqs
GET /api/legal
GET /api/legal/{slug}
GET /api/loyalty
GET /api/hero-slides
```

`GET /api/hero-slides` فقط اسلایدهای فعال را به ترتیب `sort_order` برمی‌گرداند.
متن، لینک و تصویر اسلایدها از پنل مدیریت (`/admin/hero-slides`) عوض می‌شود؛
اگر هیچ اسلایدی فعال نباشد، فرانت‌اند محتوای پیش‌فرض خودش را نشان می‌دهد.

> محتوا از دیتابیس خوانده می‌شود و در نصب تازه با `php artisan migrate --seed`
> از `backend/database/seeders/data/content.json` پر می‌شود.

---

## ۵) تعامل با مشتری

```
POST /api/contact        { name, phone, email?, subject, message }
POST /api/stock-alerts   { productSlug, phone, email? }
```

هر دو محدودیت نرخ دارند. هشدار موجودی برای هر محصول و شماره یکتا است.

---

## ۶) تسویه و سفارش

### ثبت سفارش

```
POST /api/checkout
```

```json
{
  "items": [{ "slug": "pars-khazar-tea-maker-3l", "quantity": 1 }],
  "firstName": "نوید",
  "lastName": "احمدی",
  "phone": "09121234567",
  "email": "user@example.com",
  "province": "تهران",
  "city": "تهران",
  "line": "خیابان ولیعصر، پلاک ۱۲",
  "postalCode": "1234567890",
  "paymentMethod": "cod",
  "shippingMethod": "standard",
  "couponCode": "NODEHI10",
  "note": "توضیح اختیاری",
  "idempotencyKey": "cd1f2f3e-..."
}
```

قواعد:

- قیمت و موجودی از دیتابیس خوانده می‌شود؛ فیلد قیمت از کلاینت پذیرفته نمی‌شود.
- `paymentMethod`: `cod` | `online` | `installment`.
- خرید اقساطی حداقل ۳۰٬۰۰۰٬۰۰۰ تومان است.
- `idempotencyKey` یکتاست. تکرار همان کلید با همان کاربر/شماره پاسخ تکراری
  (`duplicate: true`) می‌دهد؛ استفادهٔ همان کلید توسط شخص دیگر ۴۰۹ می‌گیرد.
- سفارش `cod` با وضعیت `processing` و موجودی کاسته‌شده ثبت می‌شود.
  سفارش `online`/`installment` با وضعیت `pending` ثبت می‌شود و موجودی را کم نمی‌کند.

پاسخ ۲۰۱:

```json
{
  "ok": true,
  "order": {
    "id": 12,
    "orderNumber": "ND-261021-A1B2C3",
    "status": "processing",
    "paymentMethod": "cod",
    "subtotal": 4200000,
    "discount": 420000,
    "shipping": 450000,
    "total": 4230000,
    "items": []
  },
  "payment": { "type": "cod", "message": "پرداخت هنگام تحویل..." }
}
```

### پیگیری سفارش مهمان

```
POST /api/orders/track   { orderNumber, phone }
```

پاسخ ۴۰۴ یعنی شمارهٔ سفارش و شمارهٔ همراه با هم مطابقت ندارند.

---

## ۷) احراز هویت

### درخواست کد

```
POST /api/auth/otp/request   { "phone": "09121234567" }
```

```json
{
  "ok": true,
  "message": "کد ورود ارسال شد.",
  "expiresIn": 120,
  "smsDelivered": true,
  "devCode": "12345"
}
```

`devCode` فقط وقتی `APP_DEBUG=true` و `AUTH_OTP_DEV_MODE=1` باشد برمی‌گردد.
اگر پیامک تنظیم نشده باشد و حالت توسعه خاموش باشد، پاسخ ۵۰۳ است.

### تأیید کد

```
POST /api/auth/otp/verify   { "phone": "09121234567", "code": "12345" }
```

```json
{
  "ok": true,
  "token": "hex-token",
  "user": { "id": 1, "phone": "09121234567", "fullName": "کاربر نودهی", "role": "customer" }
}
```

کد یک‌بارمصرف است، حداکثر ۵ تلاش دارد و با درخواست تازه باطل می‌شود.

### نشست و خروج

```
GET  /api/auth/session      (Bearer)
POST /api/auth/logout       (Bearer)
GET  /api/account/orders    (Bearer)
```

---

## ۸) پرداخت آنلاین (زرین‌پال)

مبلغ‌های کاتالوگ به **تومان** است و درگاه مبلغ را **ریال** می‌گیرد؛ تبدیل
فقط یک‌بار و سمت سرور (`×۱۰`) انجام می‌شود و پارامتر `currency` عمداً
فرستاده نمی‌شود تا مبلغ `request` و `verify` هم‌واحد بماند.

### شروع پرداخت در تسویه

`POST /api/checkout` برای سفارش `online` در پاسخ، قصد پرداخت را برمی‌گرداند:

```json
{
  "ok": true,
  "order": { "orderNumber": "ND-261021-A1B2C3", "status": "pending", "total": 4650000 },
  "payment": {
    "type": "online",
    "gateway": "zarinpal",
    "redirectUrl": "https://sandbox.zarinpal.com/pg/StartPay/A000...",
    "sandbox": true,
    "message": null
  }
}
```

اگر درگاه پیکربندی نشده یا در دسترس نباشد، سفارش باز هم ثبت می‌شود و
`redirectUrl` تهی با `message` دلیل برمی‌گردد. اگر همان کلید idempotency دوباره
فرستاده شود، همان `redirectUrl` قبلی برمی‌گردد و تراکنش تازه‌ای در درگاه ساخته
نمی‌شود.

### شروع یا ادامهٔ پرداخت

```
POST /api/payments/zarinpal/start   { "orderNumber": "ND-...", "phone": "0912..." }
```

توکن Bearer اختیاری است. مالکیت سفارش با حساب واردشده **یا** شمارهٔ همراه
همان سفارش بررسی می‌شود؛ در غیر این صورت ۴۰۴ (بدون افشای سفارش دیگران).

```json
{ "ok": true, "gateway": "zarinpal", "authority": "A000...", "redirectUrl": "https://...", "sandbox": true, "reused": false }
```

- اگر سفارش قبلاً `authority` گرفته باشد همان برگردانده می‌شود (`reused: true`)
  تا هر کلیک تراکنش تازه نسازد (خطای ‎-12).
- `409` برای سفارش `paid`/`cancelled`، `503` وقتی درگاه خاموش یا پذیرنده تنظیم
  نشده، `502` برای خطای درگاه یا شبکه، `422` برای سفارش غیرآنلاین.

### بازگشت از درگاه

```
GET /api/payments/zarinpal/callback?Authority=A000...&Status=OK|NOK
```

- `Status` فقط ثبت می‌شود؛ **تنها منبع حقیقت پاسخ `verify` است**.
- مرورگر با `303` به `FRONTEND_URL/checkout/result?state=...&order=...&code=...`
  می‌رود. با `Accept: application/json` همان نتیجه به‌صورت JSON برمی‌گردد.
- `state` یکی از `paid`، `already_paid`، `failed`، `unverifiable`، `unknown` است.

### idempotency تأیید

1. سفارش تسویه‌شده (`paid/processing/shipped/delivered`) دیگر وریفای نمی‌شود و
   پاسخ `already_paid` می‌گیرد؛ تماس شبکه‌ای تازه‌ای رخ نمی‌دهد.
2. به‌روزرسانی وضعیت با شرط `status = 'pending'` انجام می‌شود؛ دو بازگشت
   هم‌زمان فقط یک اثر دارند.
3. کد `101` زرین‌پال («قبلاً تأیید شده») موفق است، نه خطا.

خطای قطعی درگاه (کد عددی) `authority` را آزاد می‌کند تا پرداخت تازه ممکن شود؛
خطای ارتباطی (بدون کد) آن را نگه می‌دارد، چون ممکن است پول رسیده باشد و فقط
پاسخ به سرور نرسیده باشد. شمارهٔ کارت فقط با چهار رقم آخر (`****1234`) ذخیره
می‌شود.

---

## ۹) محدودیت نرخ

| مسیر | سقف |
| --- | --- |
| `POST /api/auth/otp/request` | ۱۰ در دقیقه برای هر IP + ۳ در ۲ دقیقه برای هر شماره |
| `POST /api/auth/otp/verify` | ۳۰ در دقیقه برای هر IP |
| `POST /api/checkout` | ۱۰ در دقیقه برای هر IP |
| `POST /api/coupons/validate` | ۳۰ در دقیقه |
| `POST /api/contact` | ۵ در دقیقه |
| `POST /api/stock-alerts` | ۱۰ در دقیقه |
| `POST /api/products/{slug}/reviews` | ۶ در دقیقه |
| `POST /api/orders/track` | ۲۰ در دقیقه |
| `GET /api/search` | ۱۲۰ در دقیقه |
| `POST /api/payments/zarinpal/start` | ۱۰ در دقیقه |
| `GET /api/payments/zarinpal/callback` | ۶۰ در دقیقه |

پاسخ ۴۲۹ هدر `Retry-After` دارد.

---

## ۱۰) پنل مدیریت

همهٔ مسیرهای زیر `/api/admin` با میدل‌ور `auth.token` و `admin` محافظت
می‌شوند: بدون توکن **۴۰۱** و با نقش `customer` **۴۰۳** برمی‌گردد. هر دو نقش
`admin` و `operator` دسترسی دارند. فهرست‌ها همیشه صفحه‌بندی می‌شوند و قالب
پاسخ `{ ok, total, page, perPage, pageCount, items }` است.

در کنار آن، هر گروه مسیر میدل‌ور `perm:<بخش>` دارد (بخش‌ها: `products`, `orders`,
`coupons`, `reviews`, `hero_slides`, `users`, `settings`, `integrations`,
`gateways`, `sms`). نقش `admin` همیشه همهٔ بخش‌ها را دارد؛ برای `operator`
مجوزها در جدول `user_permissions` ثبت می‌شوند و بدون هیچ ردیفی، دسترسی
پیش‌فرض قدیمی (محصولات، سفارش، کد تخفیف، نظرات، اسلایدها) اعمال می‌شود. پاسخ
`/api/auth/session` فهرست مجوزهای مؤثر را در `user.permissions` می‌دهد.

### محصولات

```
GET    /api/admin/products        ?q=&status=&category=&brand=&page=&perPage=
POST   /api/admin/products
GET    /api/admin/products/{id}
PUT    /api/admin/products/{id}    (PATCH هم پذیرفته می‌شود)
DELETE /api/admin/products/{id}
```

`status` یکی از `active`، `inactive`، `out_of_stock` یا `low_stock` است.
نامک (`slug`) فقط هنگام ساخت تعیین می‌شود و تغییر آن در ویرایش نادیده گرفته
می‌شود. حذف محصولی که در سفارشی استفاده شده **۴۰۹** می‌دهد؛ در این حالت آن را
غیرفعال کنید. حذف محصول بدون سفارش، نظرات همان محصول را هم پاک می‌کند.

### سفارش‌ها

```
GET   /api/admin/orders          ?q=&status=&paymentMethod=&page=&perPage=
GET   /api/admin/orders/{id}
PATCH /api/admin/orders/{id}      { status, trackingCode, note }
```

جزئیات سفارش شامل مشتری، آدرس، اقلام، پرداخت و یادداشت داخلی است.
جابه‌جایی وضعیت فقط در مسیر مجاز امکان‌دار است:

```
pending → paid | cancelled
paid → processing | cancelled
processing → shipped | cancelled
shipped → delivered
delivered / cancelled → (پایان)
```

هر تغییر نامعتبر **۴۲۲** می‌گیرد. رفتن به `paid`، `shipped` و `delivered`
زمان‌های `paid_at`، `shipped_at` و `delivered_at` را پر می‌کند. لغو سفارش
پرداخت در محل، موجودی اقلام را فقط یک‌بار به انبار برمی‌گرداند.

### کدهای تخفیف

```
GET    /api/admin/coupons         ?q=&page=&perPage=
POST   /api/admin/coupons
PATCH  /api/admin/coupons/{id}
DELETE /api/admin/coupons/{id}
```

`code` یکتاست و بدون حساسیت به بزرگی/کوچکی حرف ذخیره می‌شود. `percent` بین
۱ تا ۱۰۰ است و سقف استفاده (`maxUses`) را نمی‌توان کمتر از تعداد استفاده‌شده
(`usedCount`) گذاشت.

### نظرات

```
GET    /api/admin/reviews         ?status=&productSlug=&q=&page=&perPage=
PATCH  /api/admin/reviews/{id}     { status }
DELETE /api/admin/reviews/{id}
```

`status` یکی از `pending`، `approved` یا `rejected` است. تأیید یا رد نظر،
میانگین امتیاز و تعداد نظرات محصول را بازمحاسبه می‌کند.

### اسلایدهای هیرو

```
GET    /api/admin/hero-slides
POST   /api/admin/hero-slides      { badge?, title, titleAccent?, text, primaryLabel, primaryUrl,
                                     secondaryLabel?, secondaryUrl?, features?, image?, theme?, isActive? }
PATCH  /api/admin/hero-slides/{id}
DELETE /api/admin/hero-slides/{id}
POST   /api/admin/hero-slides/reorder   { ids: [۳, ۱, ۲] }
POST   /api/admin/hero-slides/image     multipart: image
```

`theme` یکی از `primary`، `secondary` یا `accent` است. `features` حداکثر سه
مزیت کوتاه است. آپلود تصویر فقط `png`, `jpg`, `jpeg`, `webp` تا ۳ مگابایت را
می‌پذیرد، فایل را در `backend/public/uploads/hero` ذخیره می‌کند و `{ ok, url }`
برمی‌گرداند؛ همان `url` را در فیلد `image` اسلاید بگذارید. با `reorder`
ترتیب نمایش را یک‌جا عوض کنید و حذف اسلاید، تصویر آپلودی همان اسلاید را هم
پاک می‌کند.

### کاربران

```
GET   /api/admin/users            ?q=&role=&status=&page=&perPage=
GET   /api/admin/users/{id}
PATCH /api/admin/users/{id}       { role?, isActive?, loyaltyPoints?, loyaltyTier?, permissions? }
```

`role` یکی از `customer`، `operator` یا `admin` است و `permissions` آرایه‌ای از
کلیدهای بخش‌های پنل. دیدن فهرست با مجوز `users` ممکن است، اما تغییر نقش،
وضعیت و مجوزها فقط با نقش `admin` پذیرفته می‌شود؛ همین‌طور نمی‌توان نقش خود
یا آخرین مدیر فعال را حذف کرد. پاسخ جزئیات شامل آخرین ۲۰ سفارش و آدرس‌های
کاربر است.

### تنظیمات سایت

```
GET   /api/admin/settings
PATCH /api/admin/settings         { settings: { "site.name": "...", "shipping.cost": 600000 } }
```

فقط کلیدهای شناخته‌شده پذیرفته می‌شوند (`site.name`, `site.tagline`,
`contact.phone`, `contact.email`, `contact.address`, `contact.instagram`,
`contact.telegram`, `shipping.cost`, `shipping.freeThreshold`)؛ کلید ناشناخته
**۴۲۲** می‌دهد. مقادیر غیرحساس از `/api/settings/public` هم خوانده می‌شوند.

### یکپارچه‌سازی و سئو

```
GET   /api/admin/integrations
PATCH /api/admin/integrations     { items: { "seo.ga4": "G-XXXXXXX", "seo.gtm": "GTM-XXXXXX",
                                            "seo.gsc": "...", "seo.customHead": "<script>…</script>" } }
```

شناسه‌های GA4/GTM با الگوی `G-`/`GTM-` بررسی می‌شوند. پاسخ `GET` علاوه بر
مقادیر، بلوک `status` شامل وضعیت اتصال پیامک، درگاه زرین‌پال و اطلاعات سایت
را هم برمی‌گرداند. این کلیدها در گروه `integration` تنظیمات ذخیره می‌شوند و
فرانت‌اند آن‌ها را در `head` تزریق می‌کند.

### درگاه‌های پرداخت

```
GET   /api/admin/payment-gateways
PATCH /api/admin/payment-gateways/{id}   { label?, description?, isActive?, isSandbox?,
                                           merchantId?, apiKey?, sortOrder? }
```

`merchantId` و `apiKey` رمزنگاری‌شده (`enc:v1:…`) ذخیره می‌شوند و در پاسخ فقط
چهار کاراکتر آخرشان برمی‌گردد (`••••4321`). فرستادن همان ماسک یعنی «تغییر
نده»؛ برای پاک‌کردن، رشتهٔ خالی بفرستید.

### سرویس پیامک

```
GET   /api/admin/sms
PATCH /api/admin/sms              { apiKey?, sender?, otpTemplate? }
POST  /api/admin/sms/test         { phone, message? }
```

کلید کاوه‌نگار رمزنگاری‌شده ذخیره می‌شود و بر `.env` اولویت دارد؛
`settings.source` نشان می‌دهد مقدار از پنل آمده یا از فایل محیطی. ارسال
آزمایشی با کد **۴۲۲** و پیام روشن شکست می‌خورد.
