# منبع تصاویر هیرو

تصاویر پس‌زمینهٔ اسلایدهای صفحهٔ اصلی در `frontend/public/hero/` نگه‌داری
می‌شوند. هر سه عکس با پروانهٔ **CC0** (پابلیک‌دامین) منتشر شده‌اند، پس استفادهٔ
تجاری آزاد است و ذکر منبع اجباری نیست؛ این فایل فقط برای پیگیری منبع نگه داشته
می‌شود.

| فایل | اسلاید | منبع | عکاس | پروانه |
| --- | --- | --- | --- | --- |
| `promise.jpg` | آشپزخانه با یخچال/فر/مایکروویو | [Kitchen (Unsplash)](https://commons.wikimedia.org/wiki/File:Kitchen_(Unsplash).jpg) | Naomi Hébert | CC0 |
| `festival.jpg` | آشپزخانه با یخچال و ظرفشویی | [Blue white kitchen interior (Unsplash)](https://commons.wikimedia.org/wiki/File:Blue_white_kitchen_interior_(Unsplash).jpg) | NeONBRAND | CC0 |
| `installment.jpg` | نشیمن با تلویزیون | [Living room (Unsplash)](https://commons.wikimedia.org/wiki/File:Living_room_(Unsplash).jpg) | Jarosław Ceborski | CC0 |

تصاویر از نسخهٔ ۱۹۲۰ پیکسلی ویکی‌مدیا گرفته و به **۱۶۰۰×۹۰۰، JPEG کیفیت
۷۲** (۸۹ تا ۱۴۱ کیلوبایت) تبدیل شده‌اند تا وزن صفحه کم بماند.

## جایگزینی عکس‌ها

همان نام فایل‌ها را رعایت کنید تا نیازی به تغییر کد نباشد:

```bash
# هر عکس ۱۶۰۰×۹۰۰ یا بزرگ‌تر با نسبت نزدیک به ۱۶:۹
cp my-photo.jpg frontend/public/hero/promise.jpg
npm --prefix frontend run build   # کپی خودکار به dist/hero
```

نکتهٔ خوانایی: متن اسلایدها سفید است و یک لایهٔ تیرهٔ گرادیانی روی عکس می‌نشیند
(۹۵٪ سمت راست تا ۳۵٪ سمت چپ). عکس‌های خیلی روشن یا پرجزئیات انتخاب نکنید؛
اگر پس‌زمینه روشن شد، در `HeroSlideshow.tsx` مقدار `to-primary-dark/35` را به
عدد بالاتری مثل `to-primary-dark/50` برسانید.
