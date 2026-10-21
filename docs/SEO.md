# سئو

---

## معماری: یک منبع واحد برای کلاینت و نسخهٔ ایستا

مشکل کلاسیک SPA این است که متادیتای صفحه یا اصلاً به خزنده نمی‌رسد یا با نسخهٔ
رندرشده «دو قطبی» می‌شود (مثلاً prerender یک عنوان بنویسد و `usePageMeta` بعد از
هاجرت عنوان دیگری). راه‌حل پروژه حذف هر گونه کپی است:

```
frontend/src/lib/seo-source.ts     ← هستهٔ خالص (بدون DOM، بدون React)
        │
        ├── کلاینت:  frontend/src/lib/seo.ts → usePageMeta (روی DOM اعمال می‌کند)
        │            هر صفحه: usePageMeta(productMeta(product)) و ...
        │
        └── پررندر:  frontend/scripts/prerender.mjs با tsx همین ماژول را
                     import می‌کند و HTML همان مسیر را با همان توابع می‌سازد.
```

بنابراین `productMeta(product)` هم متادیتای صفحهٔ تعاملی را می‌سازد و هم عنوان،
توضیح، canonical و JSON-LD نسخهٔ `dist/product/{slug}/index.html` را — از **یک**
تابع، بدون بازنویسی. همین قاعده دربارهٔ مارک‌آپ هم صادق است: آکاردئون سوالات
(`FaqAccordion`) و جدول‌های باشگاه مشتریان (`LoyaltyTables`) مؤلفه‌های React
مشترکی هستند که هم SPA و هم پررندر (با `renderToStaticMarkup`) از آن‌ها
استفاده می‌کنند.

سازنده‌های متادیتا: `homeMeta`، `shopMeta/categoryMeta/brandMeta`،
`productMeta`، `blogMeta/articleMeta`، `faqMeta`، `legalMeta`، `loyaltyMeta`،
`trackMeta`، `guidesMeta`، `aboutMeta`، `brandsMeta`، `contactMeta`.

---

## ساختار URL

```
/                               صفحه اصلی (prerender)
/shop                           فهرست همهٔ کالاها (prerender)
/category/{slug}                صفحهٔ دسته — مسیر واقعی روتر (prerender)
/brand/{slug}                   صفحهٔ برند — مسیر واقعی روتر (prerender)
/product/{slug}                 صفحه محصول (prerender برای همه محصولات)
/blog و /blog/{slug}            مقالات (فهرست و همه مقالات prerender)
/guides                         راهنمای خرید (prerender)
/faq                            پرسش‌های متداول + FAQPage (prerender)
/loyalty                        باشگاه مشتریان + OfferCatalog (prerender)
/terms و /privacy               صفحات حقوقی (prerender)
/brands، /about، /contact       صفحات ایستا (prerender)
/track                          پیگیری سفارش — عمومی و ایندکس‌پذیر (prerender)
/shop?q=... یا فیلترهای ترکیبی   noindex (فقط فهرست خالی دسته/برند ایندکس می‌شود)
/blog?category=...              noindex
/account، /cart، /checkout     noindex (useNoindex)
/login، /admin، /404            noindex
```

مسیرهای دسته و برند قبلاً redirect به `/shop?category=` بودند؛ حالا مسیر
canonical مستقل دارند و صفحهٔ Shop هم با `useParams` هم با پارامتر کار می‌کند.

---

## متادیتای کلاینت

```tsx
// صفحهٔ محصول — همان سازنده‌ای که پررندر استفاده می‌کند
usePageMeta(productMeta({
  slug: product.slug,
  name: product.name,
  price: product.price,
  stock: product.stock,
  brand: brandName(product.brand),
  category: { name: categoryName(product.category), slug: product.category },
  // ...
}))
```

- `usePageMeta` عنوان، description، keywords، canonical، robots، OG/Twitter و
  JSON-LD را با هر ناوبری کلاینتی به‌روز می‌کند (تگ‌های قبلی reuse می‌شوند).
- صفحات خصوصی `useNoindex(title, path)` می‌گیرند.
- `SITE_URL` از `VITE_SITE_URL`/`SITE_URL` (کلاینت: هنگام build؛ پررندر: هنگام
  اجرا) می‌آید؛ در تولید حتماً تنظیم شود.

### دادهٔ ساختاری

| صفحه | Schema |
| --- | --- |
| همه صفحات | `WebSite` (+`SearchAction`) + `Organization` |
| محصول | `Product` + `Offer` (`IRR`) + اختیاری `AggregateRating` + `BreadcrumbList` + `WebPage` |
| مقاله | `Article` (author/publisher/تاریخ‌ها) + `BreadcrumbList` + `WebPage` |
| پرسش‌های متداول | `FAQPage` + `CollectionPage` |
| باشگاه | `OfferCatalog` (اقساط) |
| دسته/برند/حقوقی/راهنما | `WebPage` + `BreadcrumbList` |

> قیمت سایت تومان است و schema.org ارز رسمی ایران را `IRR` می‌شناسد؛ مقادیر
> Offer به ریال (×۱۰) ثبت می‌شوند.

---

## Prerender

### دادهٔ ورودی: `frontend/src/data/prerender-targets.json`

منبع دادهٔ پررندر «این فایل» است، نه API زنده — بنابراین build تکرارپذیر است:

- **محتوای کنترل‌شدهٔ ریپو** (مقاله، سوال، سند حقوقی، سطوح وفاداری): مستقیماً از
  seederها در همین فایل نگه داشته می‌شوند.
- **کاتالوگ** (محصول/دسته/برند): اسلاگ‌ها و مشخصات محصولات با یک اسکریپت از API
  زنده تازه می‌شود:

```bash
# نیاز به بالا بودن API (backend روی 8000)
npm run seo:refresh        # PRERENDER_API_BASE قابل تغییر است
```

### اجرا

```bash
npm run seo:prerender      # از ریشه: build کامل + پررندر
cd frontend && node scripts/prerender.mjs --skip-build   # فقط بازنویسی صفحات روی dist موجود
```

اسکریپت با `tsx` لودر ESM را ثبت می‌کند و **همان** ماژول‌های TS/TSX کلاینت
(`seo-source.ts`، `FaqAccordion.tsx`، `LoyaltyTables.tsx`) را مستقیم import و
رندر می‌کند؛ هیچ منطق یا متادیتایی در اسکریپت بازنویسی نشده است. خروجی:

```
dist/index.html                     پوستهٔ SPA (از vite build)
dist/{path}/index.html              ۵۸ صفحه عمومی با <head> کامل + بدنهٔ خام
dist/sitemap.xml                    فقط صفحات index-follow + lastmod مقالات/اسناد
dist/robots.txt                     اعلام سایت‌مپ مطلق
dist/404.html                       پوستهٔ SPA برای fallback وب‌سرور
```

بدنهٔ هر صفحه لینک‌های `<a href="/...">` واقعی دارد (شبکه خزنده از همان HTML
بدون جاوااسکریپت سایت را طی می‌کند) و بعد از لود باندل، React جای `#root` را
با نسخهٔ تعاملی می‌گیرد.

---

## پیکربندی وب‌سرور

مسیرها پوشه‌ای‌اند (`product/{slug}/index.html`)؛ وب‌سرور باید `index.html`
داخل پوشه را برای `/product/{slug}` سرو کند.

**Nginx**:

```nginx
location / {
  try_files $uri $uri/ $uri/index.html /index.html;
}
```

بدون `$uri/index.html`، آدرس بدون اسلش پایانی به `index.html` ریشه fallback
می‌کند و متادیتای صفحهٔ اصلی را برمی‌گرداند.

**هاست‌های استاتیک** (Netlify/Vercel/Cloudflare Pages) به‌طور پیش‌فرض
`slug/index.html` را برای `/slug` سرو می‌کنند؛ فقط fallback به `index.html` برای
بقیه مسیرهای SPA فعال باشد.

---

## سایت‌مپ و robots

- `sitemap.xml` دقیقاً همان صفحات index-follow پررندرشده را با اسلش انتهایی
  می‌دهد و برای مقالات و اسناد حقوقی `lastmod` دارد.
- صفحات فیلترشدهٔ فروشگاه/بلاگ و صفحات خصوصی در سایت‌مپ نیستند.
- `robots.txt` همه‌چیز را مجاز می‌کند و فقط سایت‌مپ را اعلام می‌کند؛ جلوگیری از
  ایندکس صفحات خصوصی با متا `noindex` انجام می‌شود (مسدود کردن دسترسی خزنده،
  متا noindex را نامرئی می‌کند و عملاً ایندکس را ممکن می‌سازد).
- پس از انتشار، `sitemap.xml` را در Google Search Console ثبت کنید.

---

## آزمون‌ها

```bash
npm run test:unit            # vitest از ریشه
npm --prefix frontend run typecheck
```

- `tests/seo-source.test.ts` — واحد: canonical/اسلش انتهایی، escape، ساختار
  همهٔ schemaها، هر دو مؤلفهٔ مشترک React.
- `tests/prerender-output.test.ts` — یکپارچگی: اسکریپت واقعی (build + پررندر)
  اجرا می‌شود و بررسی می‌شود عنوان/canonical/JSON-LD هر صفحهٔ dist دقیقاً با
  همان سازنده‌ای که کلاینت استفاده می‌کند برابر است، سایت‌مپ با فایل‌های موجود
  تطبیق دارد، صفحات خصوصی غایب‌اند، هر صفحه یک title دارد و لینک‌های خام داخل
  HTML هستند.

---

## نکته‌های باقی‌مانده

- بازبینی نهایی متادیتا در Rich Results Test گوگل و پیش‌نمایش شبکه‌های اجتماعی
  پس از انتشار روی دامنهٔ واقعی انجام شود.
- تغییر عنوان در ناوبری کلاینتی با مرورگر واقعی راستی‌آزمایی شود (تست‌ها لایهٔ
  ساخت متادیتا را پوشش می‌دهند؛ رندر DOM در مرورگر دستی است).
- فونت Vazirmatn از Google Fonts بارگذاری می‌شود؛ میزبانی محلی برای LCP بهتر
  پیشنهاد می‌شود.
- اگر محصولی به seed اضافه شد، `npm run seo:refresh` و سپس `seo:prerender` را
  اجرا کنید تا صفحه و سایت‌مپ به‌روز شود.
