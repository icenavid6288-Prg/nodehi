#!/usr/bin/env node
/**
 * پررندر ایستا — برای هر مسیر عمومی یک index.html «هم‌ارز» با همان مسیر در SPA.
 *
 * اصل مهم: هیچ متادیتایی در این اسکریپت بازنویسی نمی‌شود. عنوان، توضیح،
 * canonical و JSON-LD هر صفحه از «همان» ماژول TypeScript کلاینت می‌آید
 * (src/lib/seo-source.ts) و مارک‌آپ FAQ/وفاداری از «همان» مؤلفه‌های React
 * (FaqAccordion, LoyaltyTables) با renderToStaticMarkup رندر می‌شود. tsx
 * لودر ESM را برای import مستقیم فایل‌های TS/TSX ثبت می‌کند.
 *
 * استفاده:
 *   node scripts/prerender.mjs                 # build کامل + پررندر
 *   node scripts/prerender.mjs --skip-build    # فقط بازنویسی صفحات روی dist موجود
 *
 * خروجی: dist/<path>/index.html برای هر مسیر + sitemap.xml + robots.txt + 404.html
 * (پوستهٔ SPA برای fallback سرور). Nginx باید try_files ... $uri/index.html داشته باشد.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const frontendDir = resolve(scriptsDir, '..')
const distDir = join(frontendDir, 'dist')
const shellPath = join(distDir, 'index.html')
const skipBuild = process.argv.includes('--skip-build')

if (!skipBuild) {
  console.log('▶ build SPA (vite)…')
  execFileSync('npm', ['run', 'build'], { cwd: frontendDir, stdio: 'inherit' })
}
if (!existsSync(shellPath)) {
  throw new Error('dist/index.html پیدا نشد؛ اول build کنید یا --skip-build را بردارید.')
}

/* ------------------------------------------------------------------ */
/* لود همان ماژول‌های TS/TSX که کلاینت استفاده می‌کند (بدون کپی منطق)  */
/* ------------------------------------------------------------------ */
const { register } = await import('tsx/esm/api')
const unregister = register()

const [seo, { FaqAccordion }, { LoyaltyTables }, react, { renderToStaticMarkup }] =
  await Promise.all([
    import('../src/lib/seo-source.ts'),
    import('../src/components/FaqAccordion.tsx'),
    import('../src/components/LoyaltyTables.tsx'),
    import('react'),
    import('react-dom/server'),
  ])
unregister()

const { createElement } = react
const targets = JSON.parse(readFileSync(join(frontendDir, 'src/data/prerender-targets.json'), 'utf8'))
const shell = readFileSync(shellPath, 'utf8')

const {
  SITE_NAME,
  escapeHtml,
  metaTag,
  linkTag,
  scriptTagJsonLd,
  homeMeta,
  shopMeta,
  productMeta,
  blogMeta,
  articleMeta,
  faqMeta,
  legalMeta,
  loyaltyMeta,
  trackMeta,
  guidesMeta,
  aboutMeta,
  brandsMeta,
  contactMeta,
} = seo

/* ------------------------- کمک‌کننده‌های متن ------------------------- */

const fa = (n) => Number(n ?? 0).toLocaleString('fa-IR')
const money = (n) => (n ? `${fa(n)} تومان` : 'تماس بگیرید')

/* --------------------------- پوستهٔ صفحه --------------------------- */

const pages = [] // { path, meta, body, index }

function addPage({ path, meta, body, index = true }) {
  pages.push({ path, meta, body, index })
}

function headBlock(meta, { index = true } = {}) {
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    metaTag('description', meta.description),
    metaTag('keywords', meta.keywords.join(', ')),
    metaTag('robots', index ? 'index, follow' : 'noindex, nofollow'),
    linkTag('canonical', meta.canonical),
    metaTag('og:site_name', SITE_NAME, { property: true }),
    metaTag('og:locale', 'fa_IR', { property: true }),
    metaTag('og:type', meta.ogType, { property: true }),
    metaTag('og:title', meta.title, { property: true }),
    metaTag('og:description', meta.description, { property: true }),
    metaTag('og:url', meta.canonical, { property: true }),
    metaTag('og:image', meta.image, { property: true }),
    metaTag('twitter:card', 'summary_large_image'),
    metaTag('twitter:title', meta.title),
    metaTag('twitter:description', meta.description),
    metaTag('twitter:image', meta.image),
    ...meta.jsonLd.filter(Boolean).map(scriptTagJsonLd),
  ].filter(Boolean)
  return tags.join('\n    ')
}

function composePage({ meta, body, index }) {
  let html = shell
  html = html.replace(/<!--seo:head-->[\s\S]*?<!--\/seo:head-->/, `<!--seo:head-->\n    ${headBlock(meta, { index })}\n    <!--/seo:head-->`)
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${body}</div>`)
  return html
}

/* ------------------------- بدنهٔ صفحات ------------------------- */

const link = (href, text, cls = '') =>
  `<a href="${escapeHtml(href)}"${cls ? ` class="${escapeHtml(cls)}"` : ''}>${escapeHtml(text)}</a>`

function breadcrumbNav(items) {
  // items: [{href?, name}] — آخرین آیتم لینک نیست
  const parts = items.map((item, index) =>
    index === items.length - 1
      ? `<span class="text-ink-muted">${escapeHtml(item.name)}</span>`
      : link(item.href, item.name, 'hover:text-primary'),
  )
  return `<nav class="mb-5 text-xs text-ink-subtle" aria-label="مسیر صفحه">${parts.join(' / ')}</nav>`
}

function productGrid(products) {
  if (products.length === 0) return ''
  const cards = products
    .map((p) => {
      const off =
        p.compareAtPrice && p.compareAtPrice > p.price
          ? `<span class="absolute right-3 top-3 rounded-lg bg-accent px-2 py-1 text-[10px] font-bold text-white">${fa(
              Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100),
            )}٪</span>`
          : ''
      const img = p.images?.[0]
        ? `<img src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.name)}" class="h-full w-full object-cover" loading="lazy">`
        : `<div class="grid h-full w-full place-items-center text-4xl font-black text-primary/20">${escapeHtml(
            (p.brand?.name ?? '').slice(0, 2),
          )}</div>`
      return `<article class="relative overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card">
        <a href="/product/${escapeHtml(p.slug)}/" class="block">
          <div class="relative aspect-square bg-gradient-to-br from-primary/5 to-secondary/10">${img}${off}</div>
          <div class="p-4">
            <p class="text-[11px] text-ink-subtle">${escapeHtml(p.brand?.name ?? '')}</p>
            <h3 class="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-6">${escapeHtml(p.name)}</h3>
            <div class="mt-3 flex items-center justify-between">
              <span class="text-sm font-extrabold text-primary">${money(p.price)}</span>
              <span class="text-[11px] text-ink-subtle">${p.stock > 0 ? 'موجود' : 'ناموجود'}</span>
            </div>
          </div>
        </a>
      </article>`
    })
    .join('\n')
  return `<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">${cards}</div>`
}

function listingBody({ title, intro, products, crumbs }) {
  return `<div class="container-page py-8">
    ${breadcrumbNav(crumbs)}
    <header class="mb-6">
      <h1 class="text-2xl font-extrabold">${escapeHtml(title)}</h1>
      <p class="mt-1 text-sm text-ink-muted">${escapeHtml(intro)} (${fa(products.length)} کالا)</p>
    </header>
    ${productGrid(products)}
  </div>`
}

function homeBody(categories, sections) {
  const catLinks = categories
    .slice(0, 8)
    .map(
      (c) =>
        `<a href="/category/${escapeHtml(c.slug)}/" class="flex items-center justify-between gap-2 rounded-2xl border border-surface-border bg-white px-4 py-3 shadow-card transition hover:-translate-y-0.5 hover:border-secondary/40">
          <span class="text-sm font-bold">${escapeHtml(c.name)}</span>
          <span class="text-[11px] text-ink-subtle">${fa(c.count)} کالا</span>
        </a>`,
    )
    .join('\n')

  const sectionHtml = sections
    .filter((section) => section.products.length > 0)
    .map(
      (section) => `<section class="container-page mt-12">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 class="text-xl font-extrabold sm:text-2xl">${escapeHtml(section.title)}</h2>
          <p class="mt-1 text-sm text-ink-muted">${escapeHtml(section.description)}</p>
        </div>
        ${link(section.href, 'مشاهده همه ←', 'text-sm font-bold text-secondary hover:text-secondary-dark')}
      </div>
      ${productGrid(section.products)}
    </section>`,
    )
    .join('\n')

  return `<section class="relative overflow-hidden bg-gradient-to-l from-secondary-dark via-secondary to-secondary-light">
    <div class="container-page grid items-center gap-8 py-12 md:grid-cols-2 md:py-16">
      <div class="text-white">
        <h1 class="text-3xl font-extrabold leading-tight sm:text-4xl">لوازم خانگی مطمئن،<br>با ارسال سریع و نصب رایگان</h1>
        <p class="mt-4 max-w-md text-sm leading-7 text-white/85">یخچال، لباسشویی، ظرفشویی، تلویزیون و کولر گازی از برندهای معتبر؛ با ضمانت اصالت کالا و امکان پرداخت در محل.</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <a href="/shop/" class="rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-primary shadow-lg transition hover:bg-surface-muted">مشاهده فروشگاه</a>
          <a href="/shop/?onSale=1" class="rounded-xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">تخفیف‌های ویژه</a>
        </div>
      </div>
      <ul class="grid grid-cols-2 gap-3 text-sm text-white sm:grid-cols-3 md:grid-cols-1">
        <li class="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs leading-6 backdrop-blur sm:text-sm">ارسال همان‌روز در تهران و کرج</li>
        <li class="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs leading-6 backdrop-blur sm:text-sm">گارانتی معتبر و ضمانت اصالت</li>
        <li class="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs leading-6 backdrop-blur sm:text-sm">پرداخت در محل و خرید اقساطی</li>
      </ul>
    </div>
  </section>
  <section class="container-page -mt-6">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">${catLinks}</div>
  </section>
  ${sectionHtml}`
}

function productBody(product, related) {
  const highlights =
    product.highlights?.length > 0
      ? `<div class="mt-6 rounded-2xl border border-surface-border bg-white p-5">
          <h2 class="mb-3 text-sm font-extrabold">ویژگی‌های کلیدی</h2>
          <ul class="grid gap-2 sm:grid-cols-2">
            ${product.highlights.map((item) => `<li class="flex items-start gap-2 text-sm text-ink-muted"><span class="mt-0.5 text-success">✓</span>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>`
      : ''
  const specs =
    product.specs?.length > 0
      ? `<div class="mt-6 rounded-2xl border border-surface-border bg-white p-5">
          <h2 class="mb-3 text-sm font-extrabold">مشخصات فنی</h2>
          <dl class="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            ${product.specs
              .map(
                (spec) =>
                  `<div class="flex justify-between gap-4 border-b border-dashed border-surface-border py-2 text-sm last:border-0"><dt class="text-ink-subtle">${escapeHtml(spec.label)}</dt><dd class="font-medium">${escapeHtml(spec.value)}</dd></div>`,
              )
              .join('')}
          </dl>
        </div>`
      : ''
  const image = product.images?.[0]
    ? `<img src="${escapeHtml(product.images[0])}" alt="${escapeHtml(product.name)}" class="h-full w-full object-cover">`
    : `<div class="grid h-full w-full place-items-center"><span class="text-6xl font-black text-primary/20">${escapeHtml((product.brand?.name ?? '').slice(0, 2))}</span></div>`

  return `<div class="container-page py-8">
    ${breadcrumbNav([
      { href: '/', name: 'خانه' },
      { href: `/category/${product.category.slug}/`, name: product.category.name },
      { name: product.name },
    ])}
    <div class="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div>
        <div class="overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card">
          <div class="relative aspect-square bg-gradient-to-br from-primary/5 to-secondary/10">${image}</div>
        </div>
        ${highlights}
        <div class="mt-6 rounded-2xl border border-surface-border bg-white p-5">
          <h2 class="mb-3 text-sm font-extrabold">توضیحات محصول</h2>
          <p class="text-sm leading-7 text-ink-muted">${escapeHtml(product.description)}</p>
        </div>
        ${specs}
      </div>
      <aside class="lg:sticky lg:top-24 lg:self-start">
        <div class="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
          <div class="mb-1 flex items-center gap-2 text-xs text-ink-subtle">
            ${link(`/brand/${product.brand.slug}/`, product.brand.name, 'hover:text-primary')}
            <span>·</span><span>${escapeHtml(product.category.name)}</span>
          </div>
          <h1 class="text-xl font-extrabold leading-8">${escapeHtml(product.name)}</h1>
          <div class="mt-2 flex items-center gap-2 text-amber-500">
            <span>★</span><span class="text-sm font-bold text-ink">${fa(product.rating?.toFixed(1))}</span>
            <span class="text-xs text-ink-subtle">(${fa(product.reviewCount)} نظر)</span>
          </div>
          <p class="mt-3 text-sm leading-6 text-ink-muted">${escapeHtml(product.shortDescription)}</p>
          <div class="mt-5 rounded-xl bg-surface-muted p-4">
            ${product.compareAtPrice && product.compareAtPrice > product.price ? `<div class="text-xs text-ink-subtle line-through">${money(product.compareAtPrice)}</div>` : ''}
            <div class="text-2xl font-extrabold text-primary">${money(product.price)}</div>
            <p class="mt-1 text-xs font-bold ${product.stock > 0 ? 'text-success' : 'text-danger'}">${product.stock > 0 ? `موجود در انبار (${fa(product.stock)} عدد)` : 'ناموجود'}</p>
          </div>
        </div>
      </aside>
    </div>
    ${related.length > 0 ? `<section class="mt-12"><h2 class="mb-4 text-lg font-extrabold">محصولات مرتبط</h2>${productGrid(related)}</section>` : ''}
  </div>`
}

function articleBody(article, relatedArticles, relatedProducts) {
  return `<div class="container-page py-8">
    ${breadcrumbNav([
      { href: '/', name: 'خانه' },
      { href: '/blog/', name: 'بلاگ' },
      { name: article.title },
    ])}
    <article class="min-w-0 pb-10">
      <header class="pb-6">
        <span class="inline-flex rounded-full bg-primary/[0.08] px-3 py-1 text-xs font-medium text-primary">${escapeHtml(article.categoryLabel)}</span>
        <h1 class="mt-3 text-2xl font-extrabold leading-9">${escapeHtml(article.title)}</h1>
        <p class="mt-3 text-sm leading-7 text-ink-muted">${escapeHtml(article.excerpt)}</p>
        <div class="mt-4 flex flex-wrap items-center gap-4 border-y border-surface-border py-3 text-xs text-ink-subtle">
          <span>نویسنده: ${escapeHtml(article.author)}</span>
          <span>انتشار: ${escapeHtml(article.publishedAt)}</span>
          <span>آخرین به‌روزرسانی: ${escapeHtml(article.updatedAt ?? article.publishedAt)}</span>
          <span>${fa(article.readingMinutes)} دقیقه مطالعه</span>
        </div>
      </header>
      <div class="flex flex-col gap-5">
        ${(article.body ?? [])
          .map((p) => `<p class="text-sm leading-8 text-ink-muted sm:text-[15px] sm:leading-[2.1]">${escapeHtml(p)}</p>`)
          .join('')}
      </div>
      ${
        relatedProducts.length > 0
          ? `<aside class="mt-8 rounded-2xl border border-surface-border bg-white p-6">
        <h2 class="text-base font-bold">محصولات مرتبط با این مقاله</h2>
        <ul class="mt-4 grid gap-2.5 sm:grid-cols-2">
          ${relatedProducts
            .map(
              (p) =>
                `<li><a href="/product/${escapeHtml(p.slug)}/" class="flex flex-col gap-1 rounded-xl bg-surface-muted px-4 py-3 text-sm transition-colors hover:bg-primary/[0.06]"><span class="line-clamp-2 font-medium">${escapeHtml(p.name)}</span><span class="text-xs text-ink-subtle">${money(p.price)}</span></a></li>`,
            )
            .join('')}
        </ul>
      </aside>`
          : ''
      }
      ${
        relatedArticles.length > 0
          ? `<section class="mt-8"><h2 class="mb-4 text-base font-bold">مقالات مرتبط</h2><div class="grid gap-4 sm:grid-cols-3">
          ${relatedArticles
            .map(
              (a) =>
                `<article class="rounded-2xl border border-surface-border bg-white p-5 shadow-card"><a href="/blog/${escapeHtml(a.slug)}/"><span class="rounded-full bg-primary/[0.08] px-2.5 py-1 text-[11px] font-medium text-primary">${escapeHtml(a.categoryLabel)}</span><h3 class="mt-2 font-bold leading-7 transition-colors hover:text-primary">${escapeHtml(a.title)}</h3><p class="mt-2 line-clamp-2 text-xs leading-6 text-ink-muted">${escapeHtml(a.excerpt)}</p></a></article>`,
            )
            .join('')}
        </div></section>`
          : ''
      }
    </article>
  </div>`
}

function blogListBody(articles, categories) {
  const chips = [
    `<a href="/blog/" class="rounded-full border border-primary bg-primary px-3.5 py-1.5 text-xs font-medium text-white">همه موضوع‌ها</a>`,
    ...categories.map(
      (c) =>
        `<a href="/blog/?category=${encodeURIComponent(c.slug)}" class="rounded-full border border-surface-border bg-white px-3.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-primary">${escapeHtml(c.label)} (${fa(c.count)})</a>`,
    ),
  ].join('')

  const cards = articles
    .map(
      (a) =>
        `<article class="rounded-2xl border border-surface-border bg-white p-5 shadow-card"><a href="/blog/${escapeHtml(a.slug)}/"><span class="rounded-full bg-primary/[0.08] px-2.5 py-1 text-[11px] font-medium text-primary">${escapeHtml(a.categoryLabel)}</span><h3 class="mt-2 font-bold leading-7 transition-colors hover:text-primary">${escapeHtml(a.title)}</h3><p class="mt-2 line-clamp-2 text-xs leading-6 text-ink-muted">${escapeHtml(a.excerpt)}</p><p class="mt-3 text-[11px] text-ink-subtle">${escapeHtml(a.publishedAt)} · ${fa(a.readingMinutes)} دقیقه مطالعه</p></a></article>`,
    )
    .join('')

  return `<div class="container-page py-8">
    ${breadcrumbNav([{ href: '/', name: 'خانه' }, { name: 'مقالات' }])}
    <header class="pb-6">
      <h1 class="text-2xl font-extrabold">مقالات و راهنمای خرید</h1>
      <p class="mt-2.5 max-w-3xl text-sm leading-7 text-ink-muted">پیش از خرید، تفاوت فناوری‌ها و مشخصات فنی را بشناسید. کارشناسان نودهی در ${fa(articles.length)} مقاله تخصصی، معیارهای انتخاب هر دسته از لوازم خانگی را بدون بزرگ‌نمایی توضیح داده‌اند.</p>
      <nav aria-label="دسته‌بندی مقالات" class="mt-5 flex flex-wrap gap-1.5">${chips}</nav>
    </header>
    <section class="pb-10"><div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${cards}</div></section>
  </div>`
}

function faqBody(items, categories) {
  const groups = categories
    .map((category) => ({ ...category, items: items.filter((i) => i.category === category.slug) }))
    .filter((group) => group.items.length > 0)

  const groupHtml = groups
    .map(
      (group) => `<section id="${escapeHtml(group.slug)}" class="scroll-mt-28">
      <h2 class="mb-3 text-base font-bold">${escapeHtml(group.label)}</h2>
      ${renderToStaticMarkup(createElement(FaqAccordion, { items: group.items, idPrefix: group.slug }))}
    </section>`,
    )
    .join('')

  const toc = groups
    .map(
      (group) =>
        `<li><a href="#${escapeHtml(group.slug)}" class="text-ink-muted transition-colors hover:text-primary">${escapeHtml(group.label)} (${fa(group.items.length)})</a></li>`,
    )
    .join('')

  return `<div class="container-page py-8">
    ${breadcrumbNav([{ href: '/', name: 'خانه' }, { name: 'سوالات متداول' }])}
    <header class="pb-6">
      <h1 class="text-2xl font-extrabold">سوالات متداول</h1>
      <p class="mt-2.5 max-w-3xl text-sm leading-7 text-ink-muted">پاسخ ${fa(items.length)} پرسش پرتکرار مشتریان درباره ارسال، گارانتی، پرداخت و مرجوعی را در این صفحه جمع کرده‌ایم.</p>
    </header>
    <div class="grid gap-8 pb-10 lg:grid-cols-[1fr_300px]">
      <div class="flex flex-col gap-8">${groupHtml}</div>
      <aside class="flex h-fit flex-col gap-4 lg:sticky lg:top-28">
        <nav aria-label="موضوع پرسش‌ها" class="rounded-2xl border border-surface-border bg-white p-5">
          <h2 class="mb-3 text-sm font-bold">موضوع‌ها</h2>
          <ul class="flex flex-col gap-2 text-xs">${toc}</ul>
        </nav>
      </aside>
    </div>
  </div>`
}

function loyaltyBody(loyalty) {
  const tables = renderToStaticMarkup(
    createElement(LoyaltyTables, {
      tiers: loyalty.tiers,
      installments: loyalty.installments,
      steps: loyalty.steps,
    }),
  )
  return `<div class="container-page py-8">
    ${breadcrumbNav([{ href: '/', name: 'خانه' }, { name: 'باشگاه مشتریان' }])}
    <header class="overflow-hidden rounded-2xl bg-primary p-6 sm:p-9">
      <h1 class="text-2xl font-extrabold leading-9 text-white">با هر خرید امتیاز بگیرید و در خرید بعدی تخفیف بگیرید</h1>
      <p class="mt-3 text-sm leading-7 text-white/80">عضویت در باشگاه مشتریان رایگان است و به‌صورت خودکار با اولین خرید فعال می‌شود. امتیازهای شما در تمام سفارش‌ها جمع می‌شود و در سطوح بالاتر، تخفیف دائمی و خدمات اختصاصی دریافت می‌کنید.</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <a href="/login/" class="rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary transition hover:bg-white/90">ورود و مشاهده امتیاز</a>
        <a href="/shop/" class="rounded-xl border border-white/35 px-5 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/10">شروع خرید</a>
      </div>
    </header>
    <div class="pb-4">${tables}</div>
  </div>`
}

function legalBody(page) {
  const toc = page.sections
    .map(
      (section) =>
        `<li><a href="#${escapeHtml(section.id)}" class="text-ink-muted transition-colors hover:text-primary">${escapeHtml(section.title)}</a></li>`,
    )
    .join('')
  const sections = page.sections
    .map(
      (section) => `<section id="${escapeHtml(section.id)}" class="scroll-mt-28">
      <h2 class="text-base font-bold">${escapeHtml(section.title)}</h2>
      <div class="mt-2 flex flex-col gap-2.5">
        ${section.paragraphs.map((p) => `<p class="text-sm leading-8 text-ink-muted">${escapeHtml(p)}</p>`).join('')}
      </div>
      ${
        section.bullets.length > 0
          ? `<ul class="mt-3 flex flex-col gap-2 rounded-2xl border border-surface-border bg-white p-5">
        ${section.bullets
          .map(
            (b) =>
              `<li class="flex items-start gap-2 text-sm leading-7 text-ink-muted"><span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" aria-hidden="true"></span>${escapeHtml(b)}</li>`,
          )
          .join('')}
      </ul>`
          : ''
      }
    </section>`,
    )
    .join('')

  const other = page.slug === 'terms' ? { href: '/privacy/', label: 'سیاست حریم خصوصی' } : { href: '/terms/', label: 'قوانین و مقررات' }

  return `<div class="container-page py-8">
    ${breadcrumbNav([{ href: '/', name: 'خانه' }, { name: page.title }])}
    <div class="grid gap-8 pb-10 lg:grid-cols-[260px_1fr]">
      <aside class="order-2 lg:order-1 lg:sticky lg:top-28 lg:h-fit">
        <nav aria-label="فهرست بخش‌ها" class="rounded-2xl border border-surface-border bg-white p-5">
          <h2 class="mb-3 text-sm font-extrabold">فهرست مطالب</h2>
          <ol class="flex flex-col gap-2 text-xs">${toc}</ol>
          <a href="${escapeHtml(other.href)}" class="mt-4 block border-t border-surface-border pt-3 text-xs font-bold text-primary">${escapeHtml(other.label)}</a>
        </nav>
      </aside>
      <article class="order-1 min-w-0 lg:order-2">
        <header class="pb-6">
          <h1 class="text-2xl font-extrabold">${escapeHtml(page.title)}</h1>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-ink-muted">${escapeHtml(page.intro)}</p>
          <p class="mt-3 text-xs text-ink-subtle">آخرین به‌روزرسانی: ${escapeHtml(page.updatedAt)}</p>
        </header>
        <div class="flex flex-col gap-8">${sections}</div>
      </article>
    </div>
  </div>`
}

function staticBody({ title, intro, blocks = [] }) {
  return `<div class="container-page py-10">
    <div class="mx-auto max-w-3xl">
      <h1 class="text-2xl font-extrabold sm:text-3xl">${escapeHtml(title)}</h1>
      ${intro.map((p) => `<p class="mt-4 text-sm leading-8 text-ink-muted">${escapeHtml(p)}</p>`).join('')}
      ${blocks.join('')}
    </div>
  </div>`
}

/* --------------------- ساخت صفحات از targets --------------------- */

const products = targets.products ?? []
const categories = targets.categories ?? []
const brands = targets.brands ?? []
const articles = (targets.articles ?? []).map((a) => ({ ...a, body: a.body ?? [] }))
const faqs = targets.faqs ?? []
const faqCategories = targets.faqCategories ?? []
const legalPages = targets.legal ?? []
const loyalty = targets.loyalty ?? { tiers: [], installments: [], steps: [] }

const byPopularity = [...products].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
const byNewest = products // ترتیب API از جدیدترین است
const ready = products.filter((p) => p.stock > 0).slice(0, 4)

addPage({
  path: '/',
  meta: homeMeta(),
  body: homeBody(categories, [
    {
      title: 'پرفروش‌ترین لوازم خانگی',
      description: 'انتخاب‌های محبوب مشتریان نودهی بر اساس تعداد خرید و رضایت ثبت‌شده.',
      href: '/shop/?sort=popular',
      products: byPopularity.slice(0, 8),
    },
    {
      title: 'آماده ارسال امروز',
      description: 'کالاهایی که در انبار موجود هستند و امروز ارسال می‌شوند.',
      href: '/shop/?inStock=1',
      products: ready,
    },
    {
      title: 'جدیدترین محصولات',
      description: 'تازه‌ترین کالاهای اضافه‌شده به فروشگاه نودهی.',
      href: '/shop/?sort=newest',
      products: byNewest.slice(0, 4),
    },
  ]),
})

addPage({
  path: '/shop',
  meta: shopMeta(),
  body: listingBody({
    title: 'فروشگاه نودهی',
    intro: 'همه کالاهای موجود با گارانتی و ارسال سریع.',
    products,
    crumbs: [{ href: '/', name: 'خانه' }, { name: 'فروشگاه' }],
  }),
})

for (const category of categories) {
  const items = products.filter((p) => p.category.slug === category.slug)
  addPage({
    path: `/category/${category.slug}`,
    meta: shopMeta({ category }),
    body: listingBody({
      title: category.name,
      intro: category.seoIntro || category.description || `خرید ${category.name} با بهترین قیمت و گارانتی.`,
      products: items,
      crumbs: [{ href: '/', name: 'خانه' }, { href: '/shop/', name: 'فروشگاه' }, { name: category.name }],
    }),
  })
}

for (const brand of brands) {
  const items = products.filter((p) => p.brand.slug === brand.slug)
  addPage({
    path: `/brand/${brand.slug}`,
    meta: shopMeta({ brand }),
    body: listingBody({
      title: `محصولات ${brand.name}`,
      intro: brand.description || `خرید محصولات ${brand.name} با ضمانت اصالت و بهترین قیمت.`,
      products: items,
      crumbs: [{ href: '/', name: 'خانه' }, { href: '/brands/', name: 'برندها' }, { name: brand.name }],
    }),
  })
}

function relatedProductsFor(article) {
  const tokens = (article.keywords ?? [])
    .flatMap((k) => String(k).split(/\s+/u))
    .map((t) => t.trim())
    .filter((t) => t.length >= 4)
  if (tokens.length === 0) return []
  const matched = products.filter((p) => tokens.some((t) => p.name.includes(t)))
  return matched.slice(0, 4)
}

for (const product of products) {
  const related = products
    .filter((p) => p.slug !== product.slug && p.category.slug === product.category.slug)
    .slice(0, 4)
  addPage({
    path: `/product/${product.slug}`,
    meta: productMeta(product),
    body: productBody(product, related),
  })
}

addPage({
  path: '/blog',
  meta: blogMeta(),
  body: blogListBody(articles, articleCategoryCounts()),
})

function articleCategoryCounts() {
  const counts = new Map()
  for (const a of articles) {
    const key = a.category
    const prev = counts.get(key) ?? { slug: key, label: a.categoryLabel ?? key, count: 0 }
    prev.count += 1
    counts.set(key, prev)
  }
  return [...counts.values()]
}

for (const article of articles) {
  const related = articles.filter((a) => a.slug !== article.slug).slice(0, 3)
  addPage({
    path: `/blog/${article.slug}`,
    meta: articleMeta(article),
    body: articleBody(article, related, relatedProductsFor(article)),
  })
}

addPage({
  path: '/faq',
  meta: faqMeta(faqs, faqCategories),
  body: faqBody(faqs, faqCategories),
})

addPage({
  path: '/loyalty',
  meta: loyaltyMeta(loyalty),
  body: loyaltyBody(loyalty),
})

for (const page of legalPages) {
  addPage({
    path: `/${page.slug}`,
    meta: legalMeta(page),
    body: legalBody(page),
  })
}

addPage({
  path: '/track',
  meta: trackMeta(),
  body: staticBody({
    title: 'پیگیری سفارش',
    intro: ['شماره سفارش و شماره همراه ثبت‌شده را وارد کنید تا وضعیت سفارش خود را ببینید.'],
    blocks: [
      `<p class="mt-4 rounded-2xl bg-white p-5 text-sm leading-7 text-ink-muted">برای پیگیری به <a href="/login/" class="font-bold text-primary">حساب کاربری</a> وارد شوید یا با شماره <strong>۰۲۱-۹۱۰۰۰۰۰۰</strong> تماس بگیرید.</p>`,
    ],
  }),
})

addPage({
  path: '/guides',
  meta: guidesMeta(),
  body: staticBody({
    title: 'راهنمای خرید لوازم خانگی',
    intro: [
      'پیش از خرید لوازم خانگی، ظرفیت، مصرف انرژی و شرایط گارانتی را با هم مقایسه کنید؛ در این صفحه خلاصه‌ای از معیارهای انتخاب هر دسته و جدیدترین مقالات تخصصی را می‌بینید.',
    ],
    blocks: [
      `<section class="mt-8"><h2 class="text-lg font-extrabold">جدول تصمیم‌گیری سریع</h2>
      <div class="mt-4 overflow-x-auto rounded-2xl border border-surface-border bg-white p-5">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-surface-border text-right text-xs text-ink-subtle"><th class="py-2 font-bold">کالا</th><th class="py-2 font-bold">خانواده کوچک</th><th class="py-2 font-bold">متوسط</th><th class="py-2 font-bold">بزرگ</th></tr></thead>
          <tbody>
            <tr class="border-b border-dashed border-surface-border"><td class="py-2">یخچال فریزر</td><td class="py-2">۳۰۰ تا ۴۵۰ لیتر</td><td class="py-2">۴۵۰ تا ۶۰۰ لیتر</td><td class="py-2">بالای ۶۰۰ لیتر</td></tr>
            <tr class="border-b border-dashed border-surface-border"><td class="py-2">ماشین لباسشویی</td><td class="py-2">۶ تا ۷ کیلوگرم</td><td class="py-2">۸ تا ۹ کیلوگرم</td><td class="py-2">بالای ۹ کیلوگرم</td></tr>
            <tr class="border-b border-dashed border-surface-border"><td class="py-2">ماشین ظرفشویی</td><td class="py-2">۸ تا ۱۰ نفره</td><td class="py-2">۱۲ تا ۱۳ نفره</td><td class="py-2">۱۴ نفره و بالاتر</td></tr>
            <tr class="border-b border-dashed border-surface-border"><td class="py-2">کولر گازی</td><td class="py-2">۹۰۰۰ تا ۱۲۰۰۰ BTU</td><td class="py-2">۱۲۰۰۰ تا ۱۸۰۰۰ BTU</td><td class="py-2">۲۴۰۰۰ BTU و بالاتر</td></tr>
            <tr><td class="py-2">تلویزیون</td><td class="py-2">۴۳ تا ۵۰ اینچ</td><td class="py-2">۵۵ اینچ</td><td class="py-2">۶۵ اینچ و بالاتر</td></tr>
          </tbody>
        </table>
      </div></section>`,
      `<section class="mt-8"><h2 class="text-lg font-extrabold">مقالات راهنما</h2><div class="mt-4 grid gap-4 sm:grid-cols-3">
        ${articles
          .map(
            (a) =>
              `<article class="rounded-2xl border border-surface-border bg-white p-5 shadow-card"><a href="/blog/${escapeHtml(a.slug)}/"><span class="rounded-full bg-primary/[0.08] px-2.5 py-1 text-[11px] font-medium text-primary">${escapeHtml(a.categoryLabel)}</span><h3 class="mt-2 font-bold leading-7 transition-colors hover:text-primary">${escapeHtml(a.title)}</h3><p class="mt-2 line-clamp-2 text-xs leading-6 text-ink-muted">${escapeHtml(a.excerpt)}</p></a></article>`,
          )
          .join('')}
      </div></section>`,
    ],
  }),
})

addPage({
  path: '/about',
  meta: aboutMeta(),
  body: staticBody({
    title: 'درباره نودهی',
    intro: [
      'نودهی یک فروشگاه اینترنتی تخصصی در حوزه لوازم خانگی است؛ از یخچال و ماشین لباسشویی تا تلویزیون و کولر گازی. هدف ما ساده است: خرید لوازم خانگی باید مطمئن، شفاف و بدون ریسک باشد.',
    ],
    blocks: [
      `<div class="mt-8 grid gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-surface-border bg-white p-5"><h2 class="font-bold">ضمانت اصالت کالا</h2><p class="mt-2 text-xs leading-6 text-ink-muted">همه کالاها اورجینال و دارای گارانتی رسمی هستند.</p></div>
        <div class="rounded-2xl border border-surface-border bg-white p-5"><h2 class="font-bold">ارسال سریع</h2><p class="mt-2 text-xs leading-6 text-ink-muted">سفارش‌های تهران و کرج در همان روز ارسال می‌شوند.</p></div>
        <div class="rounded-2xl border border-surface-border bg-white p-5"><h2 class="font-bold">پشتیبانی واقعی</h2><p class="mt-2 text-xs leading-6 text-ink-muted">کارشناسان ما پیش و پس از خرید همراه شما هستند.</p></div>
      </div>`,
    ],
  }),
})

addPage({
  path: '/brands',
  meta: brandsMeta(),
  body: `<div class="container-page py-10">
    ${breadcrumbNav([{ href: '/', name: 'خانه' }, { name: 'برندها' }])}
    <h1 class="text-2xl font-extrabold">برندهای فروشگاه</h1>
    <p class="mt-1 text-sm text-ink-muted">کالاهای هر برند را با گارانتی رسمی و قیمت روز ببینید.</p>
    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      ${brands
        .map(
          (b) => `<a href="/brand/${escapeHtml(b.slug)}/" class="rounded-2xl border border-surface-border bg-white p-5 transition hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-card">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-extrabold">${escapeHtml(b.name)}</h2>
          <span class="ltr-inline text-[11px] text-ink-subtle">${escapeHtml(b.nameEn ?? '')}</span>
        </div>
        ${b.origin ? `<p class="mt-1 text-[11px] text-ink-subtle">کشور مبدأ: ${escapeHtml(b.origin)}</p>` : ''}
        <p class="mt-2 text-xs leading-6 text-ink-muted">${escapeHtml(b.description ?? '')}</p>
      </a>`,
        )
        .join('')}
    </div>
  </div>`,
})

addPage({
  path: '/contact',
  meta: contactMeta(),
  body: staticBody({
    title: 'تماس با نودهی',
    intro: [
      'کارشناسان پشتیبانی نودهی هر روز از ۹ صبح تا ۹ شب پاسخگوی شما هستند؛ برای مشاوره خرید، پیگیری سفارش یا شرایط گارانتی با ما تماس بگیرید.',
    ],
    blocks: [
      `<div class="mt-6 rounded-2xl border border-surface-border bg-white p-5 text-sm leading-8 text-ink-muted">
        <p>تلفن: <strong class="text-ink">۰۲۱-۹۱۰۰۰۰۰۰</strong></p>
        <p>ایمیل: <strong class="text-ink">info@nodehi.ir</strong></p>
        <p>نشانی: تهران، خیابان ولیعصر، پلاک ۱۲۳</p>
      </div>`,
    ],
  }),
})

/* --------------------------- خروجی‌ها --------------------------- */

let written = 0
for (const page of pages) {
  const dir = page.path === '/' ? distDir : join(distDir, page.path.replace(/^\//u, ''))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), composePage(page))
  written += 1
}

// فایل ۴۰۴: پوستهٔ خام SPA تا سرور بتواند fallback بدهد و رندر کلاینتی ادامه یابد.
writeFileSync(join(distDir, '404.html'), shell)

// sitemap فقط صفحات index-follow را می‌دهد (مسیرهای فیلترشده ایندکس نمی‌شوند).
const siteUrl = seo.SITE_URL
// lastmod فقط برای محتوایی که تاریخ به‌روزرسانی واقعی دارد (مقالات و اسناد).
const lastmodByPath = new Map()
for (const article of articles) {
  const date = article.updatedAt ?? article.publishedAt
  if (date) lastmodByPath.set(`/blog/${article.slug}`, date)
}
for (const page of legalPages) {
  if (page.updatedAt) lastmodByPath.set(`/${page.slug}`, page.updatedAt)
}
const sitemapUrls = pages
  .filter((page) => page.index !== false)
  .map((page) => {
    const loc = page.path === '/' ? `${siteUrl}/` : `${siteUrl}${page.path}/`
    const lastmod = lastmodByPath.get(page.path)
    return `  <url>\n    <loc>${escapeHtml(loc)}</loc>${lastmod ? `\n    <lastmod>${escapeHtml(lastmod)}</lastmod>` : ''}\n  </url>`
  })
  .join('\n')
writeFileSync(
  join(distDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`,
)

writeFileSync(
  join(distDir, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
)

console.log(`✓ پررندر شد: ${written} صفحه در ${distDir}`)
console.log(`  sitemap: ${pages.length} URL | سایت: ${siteUrl}`)
