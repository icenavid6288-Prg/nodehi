/**
 * اسکریپت seed دیتابیس.
 *
 * اجرا:  npm run db:seed
 *
 * چه چیزی می‌کارد؟
 *   • کاتالوگ — دسته‌بندی‌ها، برندها و محصولات از `prisma/seed-data/*.json`.
 *     فروشگاه همین‌ها را از دیتابیس می‌خواند و پنل مدیریت روی همان ردیف‌ها
 *     کار می‌کند. این بخش فقط درج می‌کند تا ویرایش‌های پنل پاک نشوند.
 *
 *   • کدهای تخفیف — از همان فایل JSON که رابط کاربری می‌خواند، پس هرگز
 *     بین پیش‌نمایش کلاینت و حکم سرور اختلاف پیش نمی‌آید.
 *   • یک حساب مدیر — چون ورود با شماره تلفن است، برای دسترسی به پنل مدیریت
 *     باید کاربری با نقش admin وجود داشته باشد وگرنه هیچ‌کس نمی‌تواند وارد شود.
 *
 *   • چند نظر نمونه — صف «بازبینی نظرات» در پنل مدیریت و نظرهای صفحه محصول
 *     بدون داده قابل ارزیابی نیستند. یک نظر تأییدشده و دو نظر در انتظار
 *     می‌کاریم تا هر دو حالت را بتوان دید.
 *
 *   • درگاه‌های پرداخت — روش‌های پرداخت تسویه با شناسه‌های `online` / `cod` /
 *     `installment` شناخته می‌شوند و پنل مدیریت روی همین ردیف‌ها کار می‌کند.
 *     ردیف‌های گم‌شده در پنل نمایش داده می‌شوند ولی تا وقتی ذخیره نشوند
 *     شناسه واقعی ندارند؛ پس در seed ساخته می‌شوند.
 *
 * تنظیمات سایت در seed کاشته نمی‌شود: فهرست کلیدها بسته است و مقدار
 * پیش‌فرض هر کلید داخل `lib/server/settings.ts` زندگی می‌کند. کاشتن ردیف
 * برای همان مقادیر فقط دو منبع حقیقت می‌ساخت.
 *
 * این اسکریپت idempotent است: اجرای چندباره خطا نمی‌دهد و داده تکراری نمی‌سازد.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const here = dirname(fileURLToPath(import.meta.url))

/** شماره‌های مدیریتی — قابل تغییر با متغیر محیطی */
const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? '09120000000'

async function seedCoupons() {
  const raw = readFileSync(join(here, '..', 'src', 'lib', 'data', 'coupons.json'), 'utf8')
  const coupons = JSON.parse(raw)

  for (const [code, value] of Object.entries(coupons)) {
    await prisma.coupon.upsert({
      where: { code },
      update: { label: value.label, percent: value.percent, isActive: true },
      create: {
        code,
        label: value.label,
        percent: value.percent,
        isActive: true,
        // جشنواره نمونه تا یک سال آینده معتبر است
        expiresAt: new Date(Date.now() + 365 * 86_400_000),
      },
    })
    console.log(`  ✓ کد تخفیف ${code} (${value.percent}٪)`)
  }
}

async function seedAdmin() {
  const admin = await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: { role: 'admin', isActive: true },
    create: {
      phone: ADMIN_PHONE,
      firstName: 'مدیر',
      lastName: 'نودهی',
      role: 'admin',
      phoneVerifiedAt: new Date(),
      // سطح باشگاه ست نمی‌شود: سطح از روی امتیاز محاسبه می‌شود
      // (`lib/loyalty.ts`) و مقدار پیش‌فرض با صفر امتیاز می‌خواند. ست‌کردن
      // «طلایی» با صفر امتیاز، سطحی متناقض می‌ساخت.
    },
  })
  console.log(`  ✓ حساب مدیر با شماره ${admin.phone} آماده است`)
}

/**
 * نظرهای نمونه.
 * یک نظر تأییدشده (روی صفحه محصول دیده می‌شود) و دو نظر در انتظار تأیید
 * (در صف پنل مدیریت) تا هر دو مسیر بدون دست‌کاری دستی دیتابیس قابل آزمایش باشد.
 *
 * برای idempotent بودن از یک کاربر مهمانِ مشخص استفاده می‌کنیم: نظری که
 * userId ندارد، با قید یکتایی (userId + productSlug) تضاد پیدا نمی‌کند؛ پس
 * وجود/عدم وجود را دستی بررسی و در صورت نبود، درج می‌کنیم.
 */
const SAMPLE_REVIEWS = [
  {
    productSlug: 'samsung-side-by-side-rs68-28ft',
    author: 'مریم احمدی',
    rating: 5,
    status: 'approved',
    title: 'کیفیت ساخت عالی',
    body: 'بعد از دو ماه استفاده، سرما‌ی یخچال خیلی خوب است و صدای کمپرسور آزار نمی‌دهد. نصب هم توسط تیم نودهی بی‌نقص انجام شد.',
  },
  {
    productSlug: 'pars-khazar-vacuum-2200',
    author: 'رضا کریمی',
    rating: 4,
    status: 'pending',
    title: 'برای این قیمت مناسب است',
    body: 'توان مکش خوبی دارد ولی کیسه‌اش زود پر می‌شود. در کل با توجه به قیمت راضی هستم.',
  },
  {
    productSlug: 'snowa-top-freezer-16ft',
    author: 'سارا موسوی',
    rating: 5,
    status: 'pending',
    title: 'مصرف برق پایین',
    body: 'قبض برق را واقعاً کمتر کرد. جای‌گیری قفسه‌ها هم خوب طراحی شده و فضای مفید زیادی دارد.',
  },
]

async function seedReviews() {
  for (const review of SAMPLE_REVIEWS) {
    const existing = await prisma.review.findFirst({
      where: { productSlug: review.productSlug, author: review.author },
      select: { id: true },
    })
    if (existing) continue

    await prisma.review.create({
      data: {
        productSlug: review.productSlug,
        author: review.author,
        rating: review.rating,
        title: review.title,
        body: review.body,
        status: review.status,
      },
    })
    console.log(`  ✓ نظر «${review.author}» (${review.status})`)
  }
}

/**
 * درگاه‌های پرداخت.
 * ترتیب و شناسه‌ها باید با `GATEWAY_PRESETS` در `lib/server/gateways.ts` یکی باشد؛
 * فقط `activeByDefault` و برچسب‌ها اینجا تکرار می‌شوند و در seed دوباره
 * نوشته نمی‌شوند (`update: {}`) تا تغییرهای پنل با اجرای مجدد seed پاک نشود.
 */
const PAYMENT_GATEWAY_PRESETS = [
  {
    key: 'snappay',
    label: 'پرداخت اعتباری (اسنپ‌پی)',
    description: 'پرداخت اقساطی و تقسیم‌بندی بانکی بدون کارت از درگاه اسنپ‌پی.',
    activeByDefault: false,
    sortOrder: 0,
  },
  {
    key: 'online',
    label: 'پرداخت آنلاین (زرین‌پال)',
    description: 'انتقال به درگاه بانکی و بازگشت به سایت پس از پرداخت موفق.',
    activeByDefault: false,
    sortOrder: 0,
  },
  {
    key: 'cod',
    label: 'پرداخت درب منزل',
    description: 'مشتری هنگام تحویل کالا مبلغ را می‌پردازد.',
    activeByDefault: true,
    sortOrder: 1,
  },
  {
    key: 'installment',
    label: 'خرید اقساطی',
    description: 'فقط برای سفارش‌های بالای حداقل مبلغ اقساط.',
    activeByDefault: true,
    sortOrder: 3,
  },
]

async function seedGateways() {
  for (const preset of PAYMENT_GATEWAY_PRESETS) {
    await prisma.paymentGateway.upsert({
      where: { key: preset.key },
      // مقادیر قابل ویرایش در پنل را دست نمی‌زنیم
      update: {},
      create: {
        key: preset.key,
        label: preset.label,
        description: preset.description,
        isActive: preset.activeByDefault,
        isSandbox: true,
        sortOrder: preset.sortOrder,
      },
    })
    const state = preset.activeByDefault ? 'فعال' : 'غیرفعال'
    console.log(`  ✓ درگاه ${preset.label} (${state})`)
  }
}

/**
 * کاتالوگ: دسته‌ها، برندها و محصولات.
 *
 * دادهٔ این سه از `prisma/seed-data/*.json` می‌آید که یک‌بار از کاتالوگ
 * درون‌حافظهٔ قبلی تولید شد؛ حالا دیتابیس منبع حقیقت است.
 *
 * **فقط درج می‌کند، بازنویسی نمی‌کند** (`update: {}` یا بررسی وجود): اگر مدیر
 * قیمت یا موجودی را در پنل تغییر داده باشد، اجرای دوبارهٔ seed نباید آن را
 * به مقدار اولیه برگرداند. همچنین کالایی که نرم‌حذف شده (isActive=false) با
 * اجرای seed دوباره در فروشگاه ظاهر نمی‌شود.
 */
async function seedCatalog() {
  const dir = join(here, 'seed-data')
  const categories = JSON.parse(readFileSync(join(dir, 'categories.json'), 'utf8'))
  const brands = JSON.parse(readFileSync(join(dir, 'brands.json'), 'utf8'))
  const products = JSON.parse(readFileSync(join(dir, 'products.json'), 'utf8'))

  let categoryCount = 0
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
        icon: category.icon,
        featured: category.featured,
        sortOrder: index,
      },
    })
    categoryCount += 1
  }
  console.log(`  ✓ دسته‌بندی‌ها (${categoryCount})`)

  let brandCount = 0
  for (const [index, brand] of brands.entries()) {
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
        sortOrder: index,
      },
    })
    brandCount += 1
  }
  console.log(`  ✓ برندها (${brandCount})`)

  let created = 0
  for (const product of products) {
    // شناسهٔ ثابت محصول حفظ می‌شود تا سبدها و علاقه‌مندی‌های ذخیره‌شده در
    // مرورگر کاربران (localStorage) پس از انتقال به دیتابیس از دست نرود
    const existing = await prisma.product.findUnique({ where: { id: product.id }, select: { id: true } })
    if (existing) continue

    await prisma.product.create({
      data: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        categorySlug: product.category,
        brandSlug: product.brand,
        price: product.price,
        compareAtPrice: product.compareAtPrice ?? null,
        stock: product.stock,
        rating: product.rating,
        reviewCount: product.reviewCount,
        shortDescription: product.shortDescription,
        description: product.description ?? '',
        highlights: JSON.stringify(product.highlights ?? []),
        specs: JSON.stringify(product.specs ?? []),
        attributes: JSON.stringify(product.attributes ?? {}),
        images: JSON.stringify(product.images ?? []),
        tags: JSON.stringify(product.tags ?? []),
        relatedSlugs: JSON.stringify(product.relatedSlugs ?? []),
        videoUrl: product.videoUrl ?? null,
        publishedAt: new Date(product.publishedAt),
      },
    })
    created += 1
  }
  console.log(
    `  ✓ محصولات (${created} تازه درج شد، ${products.length - created} از قبل موجود بود)`,
  )
}

async function main() {
  console.log('در حال آماده‌سازی داده اولیه…')
  await seedCatalog()
  await seedCoupons()
  await seedAdmin()
  await seedReviews()
  await seedGateways()
  console.log('پایان. برای ورود به پنل مدیریت، با شماره مدیر کد ورود بگیرید.')
}

main()
  .catch((error) => {
    console.error('خطا در seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
