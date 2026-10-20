import type { Metadata } from 'next'
import { ArticleCard } from '@/components/content/article-card'
import { BrandStrip, Newsletter } from '@/components/home/brand-strip'
import { CategoryStrip, Hero } from '@/components/home/hero'
import { PromoBand } from '@/components/home/promo-band'
import { Testimonials } from '@/components/home/testimonials'
import { ProductCard } from '@/components/product/product-card'
import { ProductGrid } from '@/components/product/product-grid'
import { JsonLd } from '@/components/seo/json-ld'
import { Section } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { brand } from '@/config/brand'
import { articles } from '@/lib/data/articles'
import { breadcrumbSchema, itemListSchema } from '@/lib/seo'
import {
  bestSellers,
  categoryCounts,
  discountedProducts,
  getCategories,
  newArrivals,
  readyToShipProducts,
} from '@/lib/server/catalog'
import { getPublicSettings } from '@/lib/server/settings'

export const metadata: Metadata = {
  title: `${brand.name} | ${brand.tagline}`,
  description: brand.description,
  alternates: { canonical: '/' },
}

/**
 * صفحه اصلی بازآورده (ISR) می‌شود، نه کاملاً ایستا.
 *
 * دلیل: محتوای بنر تبلیغاتی از تنظیمات دیتابیس می‌آید. صفحه کاملاً ایستا تا
 * انتشار بعدی سایت مقدار تازه را نمی‌گرفت. با این مقدار، صفحه در تولید هر
 * ۵ دقیقه تازه می‌شود و پس از ذخیره تنظیمات در پنل هم `revalidatePath` از
 * مسیر API فراخوانده می‌شود تا تغییر بلافاصله دیده شود.
 */
export const revalidate = 300

export default async function HomePage() {
  // کاتالوگ و شمارش‌ها از دیتابیس؛ هر تغییر در پنل پس از revalidate دیده می‌شود
  const [categories, counts, settings] = await Promise.all([
    getCategories(),
    categoryCounts(),
    getPublicSettings(),
  ])

  const promo = {
    enabled: settings['pages.promo.enabled'] === 'true',
    badge: settings['pages.promo.badge'] ?? null,
    title: settings['pages.promo.title'] ?? null,
    subtitle: settings['pages.promo.subtitle'] ?? null,
    href: settings['pages.promo.href'] ?? '/shop',
    cta: settings['pages.promo.cta'] ?? 'مشاهده کالاها',
  }
  const [best, fresh, deals, ready] = await Promise.all([
    bestSellers(8),
    newArrivals(4),
    discountedProducts(4),
    readyToShipProducts(4),
  ])
  const featuredArticles = articles.slice(0, 3)

  return (
    <>
      <JsonLd
        id="schema-home-list"
        data={[
          breadcrumbSchema([{ name: 'صفحه اصلی', path: '/' }]),
          itemListSchema(best, 'پرفروش‌ترین لوازم خانگی نودهی'),
        ]}
      />

      <div className="container-page">
        <div className="py-4 sm:py-6">
          <Hero />
          {promo.enabled && (promo.title || promo.subtitle) ? (
            <PromoBand
              content={{
                badge: promo.badge,
                title: promo.title,
                subtitle: promo.subtitle,
                href: promo.href,
                cta: promo.cta,
              }}
            />
          ) : null}
        </div>

        <div className="pb-2">
          <CategoryStrip counts={counts} />
        </div>

        {/* پرفروش‌ترین‌ها */}
        <Section
          id="best-sellers"
          title="پرفروش‌ترین لوازم خانگی"
          description="انتخاب‌های محبوب مشتریان نودهی بر اساس تعداد خرید و رضایت ثبت‌شده."
          action={
            <ButtonLink href="/shop?sort=popular" variant="link" size="sm">
              مشاهده همه پرفروش‌ها ←
            </ButtonLink>
          }
        >
          <ProductGrid products={best} priorityCount={4} />
        </Section>

        {/* کالاهای آماده ارسال */}
        <Section
          id="ready-to-ship"
          title="آماده ارسال امروز"
          description="کالاهایی که در انبار تهران موجود هستند و تا ساعت ۱۴ برای ارسال همان‌روز ثبت می‌شوند."
          action={
            <ButtonLink href="/ready-to-ship" variant="link" size="sm">
              همه کالاهای موجود ←
            </ButtonLink>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ready.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        </Section>

        {/* تخفیف‌های ویژه */}
        {deals.length > 0 ? (
          <Section
            id="deals"
            title="تخفیف‌های ویژه این هفته"
            description="بیشترین تخفیف‌های فعال فروشگاه؛ محدود به موجودی انبار."
            action={
              <ButtonLink href="/shop?discounted=1" variant="link" size="sm">
                همه تخفیف‌ها ←
              </ButtonLink>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {deals.map((product) => (
                <ProductCard key={product.id} product={product} compact />
              ))}
            </div>
          </Section>
        ) : null}

        {/* دسته‌بندی‌ها با توضیح سئو */}
        <Section
          id="categories"
          title="خرید بر اساس دسته‌بندی"
          description="هر دسته شامل راهنمای انتخاب، مقایسه مدل‌ها و مشخصات فنی کامل است."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <article key={category.slug} className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
                <h3 className="text-sm font-bold text-ink">
                  <ButtonLink href={`/shop?category=${category.slug}`} variant="link" size="sm" className="text-sm font-bold">
                    {category.name}
                  </ButtonLink>
                </h3>
                <p className="mt-2 line-clamp-3 text-xs leading-6 text-ink-muted">{category.seoIntro}</p>
                <p className="mt-3 text-[11px] text-ink-subtle">
                  {category.description} · {counts[category.slug]} کالا
                </p>
              </article>
            ))}
          </div>
        </Section>

        {/* تازه‌ها */}
        <Section
          id="new-arrivals"
          title="جدیدترین محصولات"
          description="تازه‌ترین کالاهای اضافه‌شده به فروشگاه نودهی."
          action={
            <ButtonLink href="/shop?sort=newest" variant="link" size="sm">
              همه جدیدترین‌ها ←
            </ButtonLink>
          }
        >
          <ProductGrid products={fresh} />
        </Section>

        {/* برندها */}
        <Section
          id="brands"
          title="برندهای معتبر فروشگاه"
          description="نمایندگی فروش برندهای داخلی و خارجی با گارانتی رسمی و خدمات پس از فروش."
        >
          <BrandStrip />
        </Section>

        {/* نظرات مشتریان */}
        <Section
          id="testimonials"
          title="مشتریان نودهی چه می‌گویند"
          description="تجربه واقعی خریداران از فرایند خرید، ارسال و خدمات پس از فروش."
        >
          <Testimonials />
        </Section>

        {/* مقالات */}
        <Section
          id="articles"
          title="راهنمای خرید و مقالات آموزشی"
          description="پیش از خرید، مشخصات فنی و تفاوت مدل‌ها را بشناسید تا انتخابی درست داشته باشید."
          action={
            <ButtonLink href="/blog" variant="link" size="sm">
              همه مقالات ←
            </ButtonLink>
          }
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {featuredArticles.map((article, index) => (
              <ArticleCard key={article.slug} article={article} featured={index === 0} />
            ))}
          </div>
        </Section>

        <div className="pb-8">
          <Newsletter />
        </div>
      </div>
    </>
  )
}
