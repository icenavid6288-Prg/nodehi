/**
 * تست‌های واحد هستهٔ مشترک سئو — همان ماژولی که هم usePageMeta کلاینت و هم
 * اسکریپت پررندر از آن استفاده می‌کنند؛ پس این تست‌ها متادیتای هر دو مسیر را
 * پوشش می‌دهند.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import {
  SITE_URL,
  absoluteUrl,
  articleMeta,
  breadcrumbJsonLd,
  canonicalPath,
  escapeHtml,
  faqJsonLd,
  faqMeta,
  homeMeta,
  legalMeta,
  linkTag,
  loyaltyMeta,
  metaTag,
  normalizePath,
  productJsonLd,
  productMeta,
  scriptTagJsonLd,
  shopMeta,
  trackMeta,
  webSiteMetaJsonLd,
} from '../frontend/src/lib/seo-source'
import { FaqAccordion } from '../frontend/src/components/FaqAccordion'
import { LoyaltyTables } from '../frontend/src/components/LoyaltyTables'

const sampleProduct = {
  slug: 'lg-inverter-refrigerator',
  name: 'یخچال فریزر اینورتر الجی',
  shortDescription: 'یخچال ۴۶۵ لیتری با کمپرسور اینورتر و مصرف انرژی A+',
  description: 'توضیحات کامل محصول',
  price: 98_500_000,
  compareAtPrice: 105_000_000,
  stock: 4,
  rating: 4.6,
  reviewCount: 18,
  images: ['/images/products/lg-1.webp'],
  brand: { name: 'الجی', slug: 'lg' },
  category: { name: 'یخچال و فریزر', slug: 'refrigerators' },
}

describe('canonical و URL', () => {
  it('canonicalPath برای مسیرهای غیرریشه اسلش انتهایی می‌گذارد', () => {
    expect(canonicalPath('/product/x')).toBe('/product/x/')
    expect(canonicalPath('product/x/')).toBe('/product/x/')
    expect(canonicalPath('/')).toBe('/')
  })

  it('normalizePath مسیر خالی را به ریشه تبدیل می‌کند', () => {
    expect(normalizePath('')).toBe('/')
    expect(normalizePath(null)).toBe('/')
    expect(normalizePath('  shop  ')).toBe('/shop')
  })

  it('absoluteUrl دامنه و مسیر را می‌چسباند', () => {
    expect(absoluteUrl('/shop')).toBe(`${SITE_URL}/shop`)
    expect(absoluteUrl('/')).toBe(`${SITE_URL}/`)
    expect(absoluteUrl('/x', 'https://example.com/')).toBe('https://example.com/x')
  })
})

describe('escapeHtml و برچسب‌ها', () => {
  it("کاراکترهای HTML را escape می‌کند", () => {
    expect(escapeHtml('<b>"a"&\'b')).toBe('&lt;b&gt;&quot;a&quot;&amp;&#039;b')
    expect(escapeHtml(null)).toBe('')
  })

  it('metaTag مقدار خالی را حذف می‌کند و مقدار را escape می‌کند', () => {
    expect(metaTag('description', '')).toBe('')
    expect(metaTag('description', 'a <b>')).toBe('<meta name="description" content="a &lt;b&gt;">')
    expect(metaTag('og:title', 'x', { property: true })).toContain('property="og:title"')
  })

  it('scriptTagJsonLd بستن اسکریپت با </ را خنثی می‌کند', () => {
    const tag = scriptTagJsonLd({ a: '</script><script>alert(1)</script>' })
    expect(tag).not.toContain('</script><script>')
    expect(tag).toContain('\\u003c')
  })

  it('linkTag حافظ نسبت‌های rel/href است', () => {
    expect(linkTag('canonical', 'https://x.test/a/')).toBe('<link rel="canonical" href="https://x.test/a/">')
  })
})

describe('JSON-LD', () => {
  it('WebSite دارای SearchAction با URL جستجو است', () => {
    const node = webSiteMetaJsonLd() as any
    expect(node['@type']).toBe('WebSite')
    expect(node.potentialAction['@type']).toBe('SearchAction')
    expect(node.url).toBe(`${SITE_URL}/`)
  })

  it('breadcrumb آخرین آیتم را بدون item می‌فرستد و بقیه را مطلق می‌کند', () => {
    const node = breadcrumbJsonLd([
      { name: 'خانه', href: '/' },
      { name: 'فروشگاه', href: '/shop' },
      { name: 'کالا' },
    ]) as any
    expect(node.itemListElement).toHaveLength(3)
    expect(node.itemListElement[0].item).toBe(`${SITE_URL}/`)
    expect(node.itemListElement[1].item).toBe(`${SITE_URL}/shop`)
    expect(node.itemListElement[2].item).toBeUndefined()
  })

  it('productJsonLd offers با قیمت ریال و موجودی می‌سازد', () => {
    const node = productJsonLd(sampleProduct) as any
    expect(node['@type']).toBe('Product')
    expect(node.offers.priceCurrency).toBe('IRR')
    expect(node.offers.price).toBe(sampleProduct.price)
    expect(node.offers.availability).toContain('InStock')
    expect(node.brand.name).toBe('الجی')
    expect(node.aggregateRating.ratingValue).toBe(4.6)
    expect(productJsonLd(null)).toBeNull()
  })

  it('productJsonLd برای کالای ناموجود OutOfStock می‌دهد', () => {
    const node = productJsonLd({ ...sampleProduct, stock: 0 }) as any
    expect(node.offers.availability).toContain('OutOfStock')
  })

  it('faqJsonLd فقط سوالات کامل را نگه می‌دارد', () => {
    const node = faqJsonLd([
      { question: 'q1', answer: 'a1' },
      { question: '', answer: 'a2' },
    ]) as any
    expect(node['@type']).toBe('FAQPage')
    expect(node.mainEntity).toHaveLength(1)
    expect(faqJsonLd([])).toBeNull()
  })
})

describe('سازنده‌های متادیتای صفحه', () => {
  it('homeMeta عنوان و canonical ریشه و WebSite/Organization دارد', () => {
    const meta = homeMeta()
    expect(meta.title).toContain('Nodehi')
    expect(meta.canonical).toBe(`${SITE_URL}/`)
    expect(meta.ogType).toBe('website')
    const types = meta.jsonLd.map((node: any) => node['@type'])
    expect(types).toContain('WebSite')
    expect(types).toContain('Organization')
    expect(meta.keywords.length).toBeGreaterThan(0)
  })

  it('productMeta عنوان، canonical و breadcrumb درست می‌سازد', () => {
    const meta = productMeta(sampleProduct)
    expect(meta.title).toBe(`خرید ${sampleProduct.name} | قیمت و مشخصات | Nodehi`)
    expect(meta.canonical).toBe(`${SITE_URL}/product/${sampleProduct.slug}/`)
    expect(meta.image).toBe(`${SITE_URL}/images/products/lg-1.webp`)
    const productNode = meta.jsonLd.find((node: any) => node?.['@type'] === 'Product') as any
    expect(productNode.offers.price).toBe(sampleProduct.price)
    const breadcrumb = meta.jsonLd.find((node: any) => node?.['@type'] === 'BreadcrumbList') as any
    expect(breadcrumb.itemListElement.map((i: any) => i.name)).toEqual([
      'خانه',
      'فروشگاه',
      'یخچال و فریزر',
      sampleProduct.name,
    ])
  })

  it('productMeta با برند/دسته رشته‌ای هم کار می‌کند', () => {
    const meta = productMeta({ ...sampleProduct, brand: 'lg', category: 'refrigerators' } as any)
    const productNode = meta.jsonLd.find((node: any) => node?.['@type'] === 'Product') as any
    expect(productNode.brand.name).toBe('lg')
    expect(meta.canonical).toBe(`${SITE_URL}/product/${sampleProduct.slug}/`)
  })

  it('articleMeta ogType=article و Article با تاریخ‌ها دارد', () => {
    const meta = articleMeta({
      slug: 'tv-guide',
      title: 'راهنمای تلویزیون',
      excerpt: 'خلاصه',
      author: 'مدیر محتوا',
      publishedAt: '2026-01-01',
      updatedAt: '2026-01-05',
      keywords: ['تلویزیون'],
    })
    expect(meta.ogType).toBe('article')
    expect(meta.canonical).toBe(`${SITE_URL}/blog/tv-guide/`)
    const node = meta.jsonLd.find((item: any) => item?.['@type'] === 'Article') as any
    expect(node.datePublished).toBe('2026-01-01')
    expect(node.dateModified).toBe('2026-01-05')
    expect(node.author.name).toBe('مدیر محتوا')
  })

  it('faqMeta FAQPage با همه سوالات می‌سازد', () => {
    const meta = faqMeta(
      [
        { question: 'ارسال چند روزه است؟', answer: '۲ تا ۴ روز', category: 'shipping' },
        { question: 'مرجوعی دارید؟', answer: 'تا ۷ روز', category: 'returns' },
      ],
      [{ slug: 'shipping', label: 'ارسال' }],
    )
    const faqNode = meta.jsonLd.find((node: any) => node?.['@type'] === 'FAQPage') as any
    expect(faqNode.mainEntity).toHaveLength(2)
    expect(meta.canonical).toBe(`${SITE_URL}/faq/`)
  })

  it('shopMeta برای دسته و برند canonical مسیری و breadcrumb دارد', () => {
    const categoryMeta = shopMeta({ category: { slug: 'tvs', name: 'تلویزیون', seoIntro: 'intro' } })
    expect(categoryMeta.canonical).toBe(`${SITE_URL}/category/tvs/`)
    expect(categoryMeta.title).toBe('خرید تلویزیون | Nodehi')

    const brandMetaResult = shopMeta({ brand: { slug: 'lg', name: 'الجی' } })
    expect(brandMetaResult.canonical).toBe(`${SITE_URL}/brand/lg/`)
    expect(brandMetaResult.title).toBe('خرید الجی | Nodehi')
  })

  it('legalMeta و trackMeta و loyaltyMeta ساختار درست دارند', () => {
    const legal = legalMeta({ slug: 'terms', title: 'قوانین', intro: 'مقدمه' })
    expect(legal.canonical).toBe(`${SITE_URL}/terms/`)
    expect(legal.title).toBe('قوانین | Nodehi')

    const track = trackMeta()
    expect(track.canonical).toBe(`${SITE_URL}/track/`)

    const loyalty = loyaltyMeta({
      installments: [{ label: '۶ ماهه', interest: 'کارمزد ۲٪' }],
    })
    const catalog = loyalty.jsonLd.find((node: any) => node?.['@type'] === 'OfferCatalog') as any
    expect(catalog.itemListElement).toHaveLength(1)
  })

  it('هیچ صفحه‌ای canonical ریشهٔ تکراری نمی‌گیرد (به‌جز خانه)', () => {
    const metas = [
      shopMeta(),
      productMeta(sampleProduct),
      articleMeta({ slug: 'a', title: 't', excerpt: 'e' }),
      faqMeta(),
      legalMeta({ slug: 'privacy', title: 'p' }),
      loyaltyMeta(),
      trackMeta(),
    ]
    const canonicals = metas.map((meta) => meta.canonical)
    expect(new Set(canonicals).size).toBe(canonicals.length)
    expect(canonicals).not.toContain(`${SITE_URL}/`)
  })
})

describe('مؤلفه‌های مشترک React (منبع واحد مارک‌آپ)', () => {
  it('FaqAccordion برای هر سوال یک details با id قابل لنگر می‌سازد', () => {
    const html = renderToStaticMarkup(
      createElement(FaqAccordion, {
        items: [
          { id: 7, question: 'سوال اول؟', answer: 'پاسخ اول' },
          { id: 8, question: 'سوال دوم؟', answer: ['الف', 'دوم'].join(String.fromCharCode(10)) },
        ],
        idPrefix: 'shipping',
      }),
    )
    expect(html).toContain('<details')
    expect(html).toContain('id="shipping-7"')
    expect(html).toContain('سوال اول؟')
    // پاسخ چندخطی به پاراگراف جدا تبدیل می‌شود (بدون نیاز به JS)
    expect(html.match(/<p/gu)).toHaveLength(3)
  })

  it('LoyaltyTables سطوح، اقساط و مراحل را رندر می‌کند', () => {
    const html = renderToStaticMarkup(
      createElement(LoyaltyTables, {
        tiers: [
          { name: 'طلایی', requirement: 'شرط', discount: '۵٪', points: '۲ امتیاز', perks: ['پشتیبانی'] },
        ],
        installments: [{ months: 6, label: '۶ ماهه', interest: 'کارمزد ۲٪', note: 'یادداشت', featured: true }],
        steps: [{ step: 1, title: 'انتخاب کالا', description: 'توضیح' }],
        currentTier: 'طلایی',
        points: 120,
      }),
    )
    expect(html).toContain('طلایی')
    expect(html).toContain('سطح شما')
    expect(html).toContain('۶ ماهه')
    expect(html).toContain('پرطرفدار')
    expect(html).toContain('انتخاب کالا')
  })
})