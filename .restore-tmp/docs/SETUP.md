# راه‌اندازی پروژه نودهی

این سند شما را از صفر تا استقرار روی سرور همراهی می‌کند. هر مرحله مستقل است؛
می‌توانید فقط تا مرحله ۳ بروید و سایت را به‌صورت نمایشی اجرا کنید.

---

## پیش‌نیازها

| ابزار | نسخه پیشنهادی | توضیح |
| --- | --- | --- |
| Node.js | ۲۰ LTS یا بالاتر | برای اجرای Next.js |
| npm | ۱۰ یا بالاتر | همراه Node نصب می‌شود |
| Git | هر نسخه‌ای | کنترل نسخه |

برای مراحل ۵ به بعد (بک‌اند) به این‌ها هم نیاز دارید:

| ابزار | نسخه | کاربرد |
| --- | --- | --- |
| PostgreSQL | ۱۵ یا بالاتر | دیتابیس اصلی |
| Redis | ۷ یا بالاتر | کش و صف کارها |

---

## مرحله ۱ — دریافت کد و نصب وابستگی‌ها

```bash
git clone <آدرس-مخزن> nodehi
cd nodehi
npm install
```

> اگر در ایران هستید و نصب کند است، می‌توانید رجیستری را تغییر دهید:
> ```bash
> npm config set registry https://registry.npmmirror.com
> npm install
> npm config set registry https://registry.npmjs.org
> ```

---

## مرحله ۲ — متغیرهای محیطی

فایل نمونه را کپی کنید:

```bash
cp .env.example .env
```

سپس `.env` را باز کنید. **برای اجرای کامل، فقط دو خط لازم است:**

```env
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
DATABASE_URL="file:./dev.db"
```

`DATABASE_URL` به‌صورت پیش‌فرض روی یک فایل SQLite محلی است؛ PostgreSQL، Docker و
هیچ سرویس بیرونی لازم نیست. بقیه متغیرها را می‌توانید خالی بگذارید: هر سرویسی که
کلیدش خالی بماند غیرفعال می‌شود و برنامه به‌جای خطا، رفتار امن و مشخص نشان می‌دهد
(مثلاً کد ورود در حالت توسعه روی صفحه نمایش داده می‌شود).

> نکته: رمز عبور و NextAuth وجود ندارد. ورود تنها با شماره همراه و کد یک‌بارمصرف
> انجام می‌شود، پس کلید مخفی نشستی برای ساختن نیست؛ توکن نشست هنگام ورود ساخته و
> فقط به‌صورت هش در دیتابیس ذخیره می‌شود.

**تنظیمات را می‌توان از پنل هم مدیریت کرد.** متن اعلان، حالت تعمیرات، بنر تبلیغاتی،
کلید API پیامک و وبهوک اتوماسیون از مسیرهای `/admin/settings`, `/admin/sms`,
`/admin/payments` و `/admin/automation` قابل تغییرند و بر متغیر محیطی هم‌نام‌شان
اولویت دارند. در محیط تولید برای رمزنگاری مقدارهای حساس، کلید ۳۲ بایتی بسازید
(`openssl rand -hex 32`) و در `SETTINGS_ENCRYPTION_KEY` بگذارید؛ بدون آن مقدارها
متن ساده ذخیره می‌شوند و پنل هشدار می‌دهد.

---

## مرحله ۳ — اجرای سرور توسعه

```bash
npm run dev
```

سایت روی <http://localhost:3000> بالا می‌آید. صفحات کلیدی برای بررسی:

| مسیر | توضیح |
| --- | --- |
| `/` | صفحه اصلی |
| `/shop?category=refrigerator` | فروشگاه با فیلتر فعال |
| `/product/samsung-side-by-side-rs68-28ft` | صفحه محصول |
| `/compare` | جدول مقایسه |
| `/cart` → `/checkout` | فرایند خرید (ثبت واقعی سفارش روی دیتابیس) |
| `/ready-to-ship` | کالاهای موجود |
| `/loyalty` | باشگاه مشتریان |
| `/brands` · `/brand/samsung` | فهرست برندها و صفحه برند |
| `/category/refrigerator` | صفحه اختصاصی دسته‌بندی |
| `/track` | پیگیری سفارش مهمان |
| `/login` | ورود با شماره همراه (کد در حالت توسعه روی صفحه) |
| `/account` | پنل کاربری (نیازمند ورود) |
| `/admin` | پنل مدیریت (فقط نقش‌های admin/operator/accountant) |
| `/admin/settings` · `/admin/sms` · `/admin/payments` · `/admin/automation` | ابزارهای پنل: تنظیمات سایت، پیامک، درگاه‌ها، اتوماسیون |
| `/sitemap.xml` · `/robots.txt` | خروجی سئو |

> نگهبان سرور توسعه: `npm run dev` پیش از شروع، خروجی بیلد تولیدی را پاک می‌کند و
> اگر سایت همین حالا روی همان پورت بالا باشد، آدرس را نشان می‌دهد و سرور دومی بالا
> نمی‌آورد؛ اگر پورت را برنامه دیگری گرفته باشد یا سایت جواب ندهد، متوقف می‌شود. برای
> پاک‌کردن دستی خروجی: `npm run clean`. اجرای خام Next هم اگر لازم شد: `npm run dev:next`.

**ورود به پنل:** لینک «ورود کارکنان» در فوتر، دکمه «پنل مدیریت» در نوار کناری حساب،
یا مستقیم `/login?next=/admin` (پس از ورود، همان مقصد باز می‌شود).

**این مرحله هیچ دیتابیسی نیاز ندارد.** کاتالوگ از `src/lib/data/products.ts`
خوانده می‌شود و سبد خرید در `localStorage` مرورگر ذخیره می‌شود.

---

## مرحله ۴ — بررسی کیفیت کد

```bash
npm run typecheck   # بررسی نوع‌ها — باید بدون خطا تمام شود
npm run lint        # قواعد ESLint — باید بدون هشدار باشد
npm test            # ۲۳۱ تست واحد
```

خروجی مورد انتظار (خلاصه):

```
✓ src/lib/data/queries.test.ts            (۳۱ تست)
✓ src/lib/server/admin-users.test.ts      (۲۵ تست)
✓ src/lib/server/settings.test.ts         (۲۵ تست)
✓ src/lib/server/validation.test.ts       (۲۲ تست)
… ۱۱ فایل دیگر

Test Files  15 passed (15)
     Tests  231 passed (231)
```

---

## مرحله ۵ — فعال‌سازی دیتابیس (اختیاری)

اگر می‌خواهید محصولات از PostgreSQL خوانده شوند:

### ۵.۱ نصب Prisma

Prisma در `package.json` هست (`prisma` و `@prisma/client`)، پس `npm install` کافی است.

### ۵.۲ اسکیمای فعال

اسکیما همین حالا در `prisma/schema.prisma` وجود دارد و migration اولیه هم در
`prisma/migrations/` ثبت شده است؛ نسخه‌برداری از جای دیگری لازم نیست.

```bash
npm run db:generate   # ساخت کلاینت Prisma
npm run db:migrate    # اجرای migration‌ها (توسعه)
npm run db:deploy     # اجرای migration‌ها (تولید — بدون تعامل)
npm run db:seed       # کد تخفیف، حساب مدیر، نظر نمونه
```

### ۵.۳ تنظیم اتصال

در `.env`:

```env
# توسعه (پیش‌فرض) — بدون سرویس بیرونی
DATABASE_URL="file:./dev.db"
```

برای تولید، فقط provider و همان خط را عوض کنید؛ مدل‌ها بدون تغییر کار می‌کنند چون
اسکیما بدون enum، بدون آرایه اسکالر و بدون نوع بومی Postgres نوشته شده است:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```env
DATABASE_URL="postgresql://nodehi:رمز@localhost:5432/nodehi?schema=public"
```

اگر PostgreSQL محلی ندارید، سریع‌ترین راه با Docker:

```bash
docker run -d --name nodehi-db \
  -e POSTGRES_USER=nodehi \
  -e POSTGRES_PASSWORD=رمز \
  -e POSTGRES_DB=nodehi \
  -p 5432:5432 postgres:15
```

### ۵.۴ ساخت جداول

```bash
npm run db:migrate     # توسعه: ساخت و اعمال migration
npm run db:generate    # ساخت کلاینت Prisma
npm run db:seed        # داده اولیه (کد تخفیف، مدیر، نظر نمونه)
```

> ⚠️ اگر سرور توسعه در حال اجراست، `db:generate` ممکن است با خطای `EPERM` شکست
> بخورد چون فایل موتور Prisma قفل است. سرور را متوقف کنید، generate را اجرا کنید و
> دوباره بالا بیاورید.

### ۵.۵ انتقال داده‌های نمونه موجود (انجام‌نشده)

بخش عملیاتی فروشگاه (کاربر، سفارش، آدرس، نظر، کد تخفیف، پیام، هشدار موجودی) همین
حالا روی دیتابیس است. تنها چیزی که فعلاً درون‌حافظه مانده **کاتالوگ محصولات**
(`src/lib/data/products.ts`، دسته‌ها و برندها) است.

دلیل تعویق: توابع `src/lib/data/queries.ts` عمداً هم‌شکل رکورد دیتابیس نوشته شده‌اند،
پس این انتقال یک تغییر متمرکز است و نیازی به بازنویسی کامپوننت‌ها ندارد. اسکریپت زیر
طرح کار است و هنوز وجود ندارد (مدل‌های Category/Brand/Product فعلاً در اسکیما نیستند):

```ts
// scripts/seed-catalog.ts  ← هنوز نوشته نشده؛ فقط طرح کار
import { PrismaClient } from '@prisma/client'
import { products } from '../src/lib/data/products'
import { categories } from '../src/lib/data/categories'
import { brands } from '../src/lib/data/brands'

const prisma = new PrismaClient()

async function main() {
  // دسته‌بندی‌ها
  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        slug: category.slug,
        name: category.name,
        nameEn: category.nameEn,
        description: category.description,
        seoIntro: category.seoIntro,
        featured: category.featured,
        position: index,
      },
    })
  }

  // برندها
  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: {
        slug: brand.slug,
        name: brand.name,
        nameEn: brand.nameEn,
        origin: brand.origin,
        description: brand.description,
        featured: brand.featured,
      },
    })
  }

  // محصولات
  for (const product of products) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: product.category },
    })
    const brand = await prisma.brand.findUniqueOrThrow({
      where: { slug: product.attributes.brand },
    })

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        sku: product.id,
        slug: product.slug,
        name: product.name,
        categoryId: category.id,
        brandId: brand.id,
        // توجه: قیمت در دیتابیس ریال است، در کاتالوگ فعلی تومان
        price: product.price * 10,
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice * 10 : null,
        stock: product.stock,
        rating: product.rating,
        reviewCount: product.reviewCount,
        shortDescription: product.shortDescription,
        description: product.description,
        highlights: product.highlights,
        capacity: product.attributes.capacity,
        capacityUnit: product.attributes.capacityUnit,
        energyRating: product.attributes.energyRating,
        color: product.attributes.color,
        widthCm: product.attributes.widthCm,
        heightCm: product.attributes.heightCm,
        depthCm: product.attributes.depthCm,
        inverter: product.attributes.inverter,
        warrantyMonths: product.attributes.warrantyMonths,
        madeIn: product.attributes.madeIn,
        installmentAvailable: product.attributes.installmentAvailable,
        readyToShip: product.attributes.readyToShip,
        images: product.images,
        videoUrl: product.videoUrl,
        tags: product.tags,
        publishedAt: new Date(product.publishedAt),
        specs: {
          create: product.specs.map((spec, index) => ({
            group: spec.group,
            label: spec.label,
            value: spec.value,
            position: index,
          })),
        },
      },
    })
  }

  console.log(`✅ ${products.length} محصول، ${categories.length} دسته و ${brands.length} برند درج شد`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

اجرا:

```bash
npx tsx scripts/seed.ts
```

### ۵.۶ جایگزینی لایه داده (انجام‌نشده)

فقط توابع `src/lib/data/queries.ts` را تغییر دهید تا از Prisma بخوانند — بقیه
برنامه دست نمی‌خورد، چون کامپوننت‌ها فقط با امضاهای این فایل کار می‌کنند:

```ts
// src/lib/data/queries.ts
export async function queryProducts(filters: ProductFilters) {
  return prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      ...(filters.categories.length && { category: { slug: { in: filters.categories } } }),
      ...(filters.brands.length && { brand: { slug: { in: filters.brands } } }),
      ...(filters.minPrice !== null && { price: { gte: filters.minPrice * 10 } }),
      ...(filters.maxPrice !== null && { price: { lte: filters.maxPrice * 10 } }),
      ...(filters.inverterOnly && { inverter: true }),
    },
    include: { specs: true, category: true, brand: true, reviews: true },
    orderBy: buildOrderBy(filters.sort),
  })
}
```

> **هشدار مهم درباره واحد پول:** کاتالوگ فعلی قیمت‌ها را به **تومان** نگه می‌دارد
> (نمایش مستقیم به کاربر). دیتابیس همه مبالغ را به **ریال** ذخیره می‌کند تا از
> خطای گردکردن جلوگیری شود. در مرز بین این دو لایه، همیشه `× 10` برای نوشتن و
> `÷ 10` برای خواندن لازم است. این تبدیل را در یک تابع کمکی متمرکز کنید تا
> تکرار نشود.

---

## مرحله ۶ — فعال‌سازی Redis (اختیاری)

Redis برای کش فیلترها، شمارش بازدید محصول و صف کارهای پس‌زمینه استفاده می‌شود.

```bash
docker run -d --name nodehi-cache -p 6379:6379 redis:7-alpine
```

```env
REDIS_URL="redis://localhost:6379"
```

بدون Redis هم برنامه کار می‌کند؛ فقط کش غیرفعال می‌شود.

---

## مرحله ۷ — بیلد و استقرار

### بیلد تولید

```bash
npm run build
npm start
```

خروجی بیلد باید ۵۴ صفحه استاتیک تولید کند. صفحات `/product/[slug]` و
`/blog/[slug]` به‌صورت SSG پیش‌ساخته می‌شوند و `/shop` به‌دلیل خواندن
`searchParams` به‌صورت پویا رندر می‌شود.

### استقرار روی هاست cPanel (noudalife.ir — پارس‌پک)

دامنه `noudalife.ir` الان به `89.44.243.103` (پارس‌پک، وب‌سرور LiteSpeed) اشاره می‌کند و
گواهی Let's Encrypt روی آن معتبر است؛ یعنی دامنه و SSL آماده‌اند و فقط باید خود
برنامهٔ Node بالا بیاید. ترتیب کار:

**۱) ساخت بستهٔ آپلودی** (روی همین کامپیوتر):

```bash
npm run pack:host            # خروجی: nodehi-deploy.zip — بعد از هر تغییر کد دوباره بزنید
```

**۲) آپلود و استخراج بیرون از `public_html`:** از cPanel → File Manager زیپ را آپلود و
در ریشهٔ خانه (هم‌سطح `public_html`، مثلاً `~/nodehi`) استخراج کنید. استخراج داخل
`public_html` ممنوع است: `.env` از اینترنت دانلود می‌شود و وب‌سرور به‌جای Node فایل‌ها
را استاتیک سرو می‌کند — علامتش ۴۰۴ ساده از همه مسیرهاست (بخش «هاست اشتراکی و ۴۰۴ بعد
از آپلود زیپ»).

**۳) ساخت اپ Node:** cPanel → Software → `Setup Node.js App`:

| فیلد | مقدار |
| --- | --- |
| Application root | `nodehi` |
| Application URL | `https://noudalife.ir` |
| Application startup file | `server.js` |
| Node version | 20 LTS |

اگر چنین آیکونی در پنل نیست، هاست Node.js App ندارد؛ اول آزمایش ۳۰ ثانیه‌ای در بخش
«هاست اشتراکی و ۴۰۴ بعد از آپلود زیپ» را بزنید و اگر جواب نداد با پشتیبانی پارس‌پک
مطرح کنید (این قابلیت به CloudLinux نیاز دارد و پارس‌پک آن را روی همهٔ پلن‌های
اشتراکی فعال نکرده است).

**۴) متغیرهای محیطی** — در بخش Environment همان اپ، یا فایل `.env` ریشهٔ پروژه. مهم است
پیش از `npm run build` تنظیم شوند، چون مقادیر `NEXT_PUBLIC_*` موقع بیلد در کد درونی
می‌شوند:

```
DATABASE_URL="file:../data/nodehi.db"
NEXT_PUBLIC_SITE_URL="https://noudalife.ir"
SETTINGS_ENCRYPTION_KEY=<openssl rand -hex 32>
NODEHI_WEBHOOK_SECRET=<openssl rand -hex 32>
AUTOMATION_WEBHOOK_SECRET=<openssl rand -hex 32>
SEED_ADMIN_PHONE=0912xxxxxxx
INSTALL_TOKEN=<openssl rand -hex 32>
AUTH_OTP_DEV_MODE=1
```

**۵) نصب و بیلد** در ترمینال پنل (cPanel → Terminal، در پوشهٔ `~/nodehi`):

```bash
npm install --include=dev
npm run doctor      # دقیقاً می‌گوید چه چیزی کم است
npm run build
```

سپس در پنل **Restart** کنید. دکمهٔ `Run NPM Install` خود پنل فقط `npm install` را می‌زند؛
بدون ترمینال، `npm run build` ممکن نیست.

**۶) نصب دیتابیس:** بار اول که سایت بالا بیاید [`server.js`](../server.js) می‌بیند جدولی
نیست و خودش `prisma migrate deploy` + seed را می‌زند (۲۳ محصول، ۸ دسته، مدیر، درگاه‌ها)؛
در بالا آمدن‌های بعدی فقط بررسی می‌کند و به داده دست نمی‌زند (`NODEHI_AUTO_SETUP=0` این
کار را خاموش می‌کند). معادل دستی: `npm run setup`.

**۷) بررسی:** `https://noudalife.ir/api/health` باید `"catalogSize": 23` بدهد. ورود پنل با
`/login` و همان `SEED_ADMIN_PHONE` — تا وقتی `KAVENEGAR_API_KEY` وصل نشده،
`AUTH_OTP_DEV_MODE=1` کد را در پاسخ API نشان می‌دهد (پس از وصل‌کردن پیامک `0` کنید).

**دیتابیس و پشتیبان‌گیری:** فایل SQLite روی `~/nodehi/data/nodehi.db` می‌ماند؛ پشتیبان
گرفتن یعنی کپی همین فایل. برای فروشگاه کوچک کافی است، برای چند نمونهٔ هم‌زمان باید به
Postgres مهاجرت کنید (provider در `prisma/schema.prisma`).

### استقرار روی سرور اختصاصی

```bash
# روی سرور
git clone <آدرس-مخزن> /var/www/nodehi
cd /var/www/nodehi
npm ci --omit=dev
npm run build
```

نمونه فایل systemd:

```ini
# /etc/systemd/system/nodehi.service
[Unit]
Description=Nodehi Store
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/nodehi
EnvironmentFile=/var/www/nodehi/.env.local
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now nodehi
```

نمونه پیکربندی Nginx (پروکسی معکوس + فشرده‌سازی + کش دارایی‌ها):

```nginx
server {
  listen 443 ssl http2;
  server_name nodehi.ir www.nodehi.ir;

  ssl_certificate     /etc/letsencrypt/live/nodehi.ir/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/nodehi.ir/privkey.pem;
  ssl_protocols       TLSv1.2 TLSv1.3;

  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;
  gzip_min_length 1024;

  # دارایی‌های نسخه‌دار نکست — کش یک‌ساله
  location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}

# هدایت اجباری HTTP به HTTPS
server {
  listen 80;
  server_name nodehi.ir www.nodehi.ir;
  return 301 https://$host$request_uri;
}
```

### انتقال با زیپ به هاست (بدون git)

اگر پروژه را زیپ می‌کنید و روی هاست باز می‌کنید، این‌ها را **داخل زیپ نگذارید**:

| مسیر | چرا |
| --- | --- |
| `node_modules/` | روی هاست با `npm install` ساخته می‌شود؛ نسخه ویندوزی روی لینوکس کار نمی‌کند |
| `.next/` | بیلد ویندوزی روی هاست لینوکسی اجرا نمی‌شود |
| `.env` | تنظیمات محلی است؛ روی هاست مقدارهای واقعی را بدهید |
| `prisma/dev.db` و `dev.db-journal` / `-wal` / `-shm` | دیتابیس محلی است؛ اگر بیاید سایت «قبلاً نصب شده» بالا می‌آید |
| `tmp/` | فایل‌های موقت تست |

روی هاست:

```bash
npm install
cp .env.example .env    # یا متغیرها را از پنل هاست تنظیم کنید
npm run setup           # مهاجرت + داده اولیه، بدون نیاز به مرورگر
npm run build && npm start
```

برای اینکه خودتان درگیر فهرست بالا نشوید، بسته تمیز را با اسکریپت بسازید:

```bash
npm run pack:host                    # خروجی: nodehi-deploy.zip
npm run pack:host -- --out=D:/x/nodehi.zip
```

این اسکریپت خودش `node_modules`، `.next`، `.env`، `prisma/dev.db*` و `tmp` را کنار می‌گذارد؛
مسیرهای داخل زیپ با «/» نوشته می‌شوند تا روی لینوکس درست باز شود. حاصل یک بستهٔ
«نصب‌نشده» است: روی هاست پس از `npm install`، با `npm run setup` یا باز کردن `/install`
نصب می‌شود.

> ⚠️ `node_modules` و `.next` ساخته‌شده روی ویندوز روی هاست لینوکسی کار نمی‌کند — موتور
> Prisma و بیلد Next پلتفرم‌محورند. روی خود هاست `npm install` و `npm run build` بزنید.

### هاست اشتراکی و ۴۰۴ بعد از آپلود زیپ

علامت مشخصه: **همهٔ** آدرس‌ها ۴۰۴ می‌دهند و صفحهٔ ۴۰۴ ساده است (طرح سایت را ندارد).
این یعنی درخواست هرگز به Next نمی‌رسد؛ وب‌سرور Apache/nginx دارد فایل استاتیک سرو می‌کند.

دو دلیل، هر دو رایج:

۱. زیپ در `public_html` باز شده و دامنه همان پوشه را سرو می‌کند. Next صفحهٔ آمادهٔ
`index.html` ندارد (صفحه‌ها را خود پروسهٔ Node رندر می‌کند)، پس `/` و بقیه مسیرها ۴۰۴
می‌شوند. بدتر: هر `.env` داخل `public_html` از اینترنت قابل دانلود است.
۲. حساب Node.js App ساخته نشده، یا ساخته شده ولی پروسه بالا نیامده است.

#### گام ۱ — پروژه را از ریشهٔ وب بیرون ببرید

```bash
mv ~/public_html/nodehi ~/nodehi        # پوشه‌ای هم‌سطح public_html
```

#### گام ۲ — در پنل، Node.js App بسازید

| فیلد | مقدار |
| --- | --- |
| Application root | `nodehi` |
| Application URL | دامنه یا زیردامنه |
| Application startup file | `server.js` |
| Node version | 20 LTS |

`server.js` در ریشهٔ پروژه هست و همان کاری را می‌کند که `next start` می‌کند: روی
`PORT` پنل گوش می‌دهد، `.env` را بارگذاری می‌کند و اگر بیلد یا `DATABASE_URL` نباشد
دلیل واقعی را در لاگ می‌نویسد (نه ۴۰۴ مرموز).

سپس در ترمینال همان پوشه (یا دکمهٔ Run NPM Install پنل):

```bash
npm install --include=dev   # با NODE_ENV=production وابستگی‌های dev حذف می‌شوند، ولی build به next/prisma/typescript نیاز دارد
cp .env.example .env        # یا متغیرها را در بخش Environment پنل بگذارید
npm run doctor              # دقیقاً می‌گوید چه چیزی کم است (بیلد، دیتابیس، مهاجرت، محل پروژه)
npm run setup               # مهاجرت + داده اولیه (یا باز کردن /install)
npm run build
```

بعد در پنل **Restart** کنید؛ اگر پروسه را ری‌استارت نکنید، نسخهٔ قبلی سرو می‌شود.

#### گام ۳ — بررسی

```bash
curl -s https://دامنه/api/health
# {"ok":true,"status":"healthy",...,"catalogSize":23}
```

| نشانه | معنی |
| --- | --- |
| ۴۰۴ ساده از همه مسیرها | پروسه بالا نیست، یا Application URL به پوشهٔ دیگری وصل است |
| ۵۰۲ / ۵۰۳ | پروسه کرش کرده — لاگ پنل (`stderr.log` یا Passenger log) را ببینید |
| ۴۰۴ با طرح خود سایت | Next در حال اجراست ولی آن مسیر وجود ندارد (طبیعی) |
| ۵۰۰ با پیام دیتابیس | `DATABASE_URL` یا مهاجرت‌ها کم است → `npm run doctor` |

#### آزمایش ۳۰ ثانیه‌ای: آیا این هاست Node اجرا می‌کند؟

دو راه، بدون نیاز به ترمینال:

۱. آدرس `https://دامنه/README.md` را باز کنید. اگر متن فایل را دیدید، وب‌سرور دارد
فایل‌های استخراج‌شده را استاتیک سرو می‌کند و هیچ پروسهٔ Node‌ای بالا نیست.
۲. اگر پنل بخش Node.js دارد، Startup file را موقتاً `scripts/probe.js` بگذارید و
Restart کنید. اگر صفحهٔ «NODE IS RUNNING» آمد، Node سالم است و مسیر دامنه درست است؛
بعد Startup file را به `server.js` برگردانید و سراغ `npm run doctor` بروید. اگر باز
هم ۴۰۴ ساده آمد، درخواست‌ها هرگز به Node نمی‌رسند.

> آپلود فایل‌های Next.js روی هاستی که فقط استاتیک سرو می‌کند هیچ‌وقت جواب نمی‌دهد؛
> این پروژه API، دیتابیس و پنل مدیریت دارد و به `next export` هم تبدیل نمی‌شود.

#### اگر پنل ترمینال یا SSH نمی‌دهد

بیلد Next (و موتور Prisma) باید روی لینوکس انجام شود؛ آپلود بیلد ویندوزی جواب نمی‌دهد.
در این حالت این هاست برای این پروژه مناسب نیست؛ با پشتیبانی هاست برای فعال‌سازی
Node.js/SSH مطرح کنید یا از یک VPS (بخش «استقرار روی سرور اختصاصی») استفاده کنید.

### برش‌داشتن نصب و نصب دوباره

«نصب‌شده» یک فایل نشانه نیست؛ از دیتابیس خوانده می‌شود (حساب مدیر + کاتالوگ). پس با
پاک‌کردن داده‌ها نصب از صفر می‌شود:

```bash
npm run reinstall                          # پاک‌سازی کامل + نصب تازه با SEED_ADMIN_PHONE
npm run reinstall -- --phone=09121234567   # با شماره مدیر دلخواه
npm run reinstall -- --empty               # فقط پاک‌سازی؛ ویزارد /install باز می‌ماند
npm run reinstall -- --force               # اجرا روی NODE_ENV=production (خطرناک)
```

معادل دستی برای SQLite: توقف سرور، حذف `prisma/dev.db`، سپس `npm run setup`.
`npm run reinstall` روی `NODE_ENV=production` بدون `--force` اجرا نمی‌شود تا داده واقعی
به‌اشتباه پاک نشود.

---

## عیب‌یابی

| مشکل | راه‌حل |
| --- | --- |
| فونت فارسی لود نمی‌شود | دسترسی به `fonts.googleapis.com` را بررسی کنید. در نبود شبکه، فونت سیستمی جایگزین می‌شود و ظاهر سایت از هم نمی‌پاشد. |
| تصاویر محصول نمایش داده نمی‌شوند | دامنه مخزن تصاویر را به `remotePatterns` در `next.config.mjs` اضافه کنید. |
| هشدار `aria-expanded` در کنسول | به‌روزرسانی نسخه مرورگر؛ در نسخه فعلی رفع شده است. |
| پورت ۳۰۰۰ اشغال است | اگر نرم‌افزار دیگری آن را گرفته: `npm run dev -- -p 3001`. اگر سرور توسعه همین پروژه است، همان آدرس را باز کنید؛ دو سرور هم‌زمان روی یک پوشه، `.next` را خراب می‌کنند. |
| تمام صفحات خطا ۵۰۰/۴۰۴ می‌دهند و «هیچی نمی‌آید» | `npm run clean` و بعد `npm run dev`. خروجی بیلد تولیدی یا اجرای هم‌زمان دو سرور توسعه باعث قاطی‌شدن `.next` می‌شود؛ نگهبان `npm run dev` دیگر نمی‌گذارد این حالت تکرار شود. |
| سبد خرید خالی می‌شود | `localStorage` در حالت ناشناس مرورگر غیرفعال است. |
| خطای `DATABASE_URL` | فقط در صورت اجرای دستورات Prisma لازم است؛ برای `npm run dev` نیازی نیست. |

---

## پیش از انتشار — چک‌لیست سریع

- [ ] `NEXT_PUBLIC_SITE_URL` روی دامنه واقعی تنظیم شده
- [ ] `AUTH_OTP_DEV_MODE` در تولید روی `0` است (وگرنه کد ورود افشا می‌شود)
- [ ] `SETTINGS_ENCRYPTION_KEY` با ۳۲ بایت تصادفی ساخته شده
- [ ] `NODEHI_WEBHOOK_SECRET` و `AUTOMATION_WEBHOOK_SECRET` تنظیم شده‌اند
- [ ] SSL فعال و هدایت HTTP به HTTPS برقرار است
- [ ] `npm run typecheck && npm run lint && npm test` بدون خطا
- [ ] `docs/SECURITY.md` مرور و موارد آن اعمال شده
- [ ] پشتیبان‌گیری خودکار روزانه دیتابیس فعال است
- [ ] نماد اعتماد الکترونیکی در فوتر به نماد واقعی متصل شده
- [ ] آدرس سایت در Google Search Console ثبت و سایت‌مپ ارسال شده
