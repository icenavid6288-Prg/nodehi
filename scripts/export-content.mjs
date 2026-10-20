/**
 * استخراج محتوای صفحات عمومی از سورس Next.js به یک فایل JSON برای Seeder لاراول.
 *
 * اجرا: node scripts/export-content.mjs
 * خروجی: backend/database/seeders/data/content.json
 */
import { readFileSync, writeFileSync } from 'node:fs'

const read = (p) => readFileSync(p, 'utf8')

/** متن بین دو نشانگر را می‌برد (نشانگر پایان شامل نمی‌شود). */
function slice(source, start, end, label) {
  const from = source.indexOf(start)
  if (from === -1) throw new Error(`شروع «${label}» پیدا نشد`)
  const to = source.indexOf(end, from + start.length)
  if (to === -1) throw new Error(`پایان «${label}» پیدا نشد`)
  return source.slice(from + start.length, to)
}

/** یک literal جاوااسکریپت (آرایه/آبجکت) را ارزیابی می‌کند. */
function evaluate(source, scope = {}) {
  const keys = Object.keys(scope)
  const fn = new Function(...keys, `return (${source});`)
  return fn(...keys.map((key) => scope[key]))
}

const brand = {
  name: 'نودهی',
  contact: { phone: '۰۲۱-۹۱۰۰۰۰۰۰', phoneRaw: '02191000000', email: 'info@nodehi.ir' },
}

// ── مقالات ────────────────────────────────────────────────────────────────
const articlesSource = read('src/lib/data/articles.ts')
const articles = evaluate(
  slice(articlesSource, 'export const articles: Article[] =', '\n]\n\nexport const articleBySlug', 'articles') + '\n]',
)
const articleCategories = evaluate(
  slice(
    articlesSource,
    "export const articleCategoryLabels: Record<Article['category'], string> =",
    '\n}\n',
    'articleCategoryLabels',
  ) + '\n}',
)

// ── سوالات متداول ────────────────────────────────────────────────────────
const contentSource = read('src/lib/data/content.ts')
const faqs = evaluate(
  slice(contentSource, 'export const faqs: FaqItem[] =', '\n]\n\n/** نقاط اعتماد', 'faqs') + '\n]',
)

const faqPageSource = read('src/app/faq/page.tsx')
const faqCategories = evaluate(
  slice(
    faqPageSource,
    'const categoryLabels: Record<string, string> =',
    '\n}\n',
    'faqCategoryLabels',
  ) + '\n}',
)

// ── صفحات حقوقی ──────────────────────────────────────────────────────────
function legalFrom(path, slug, title, intro, updatedAt) {
  const source = read(path)
  const sections = evaluate(
    slice(source, 'const sections: LegalSection[] =', '\n]\n\nexport default function', `sections ${slug}`) + '\n]',
    { brand },
  )
  return { slug, title, intro, updatedAt, sections }
}

const legal = [
  legalFrom(
    'src/app/terms/page.tsx',
    'terms',
    'قوانین و مقررات',
    `با ثبت سفارش در فروشگاه ${brand.name}، شما شرایط زیر را می‌پذیرید. این سند حقوق و تعهدات دو طرف را شفاف مشخص می‌کند تا خرید بدون ابهام انجام شود.`,
    '2026-08-01',
  ),
  legalFrom(
    'src/app/privacy/page.tsx',
    'privacy',
    'سیاست حریم خصوصی',
    `حفاظت از اطلاعات مشتریان ${brand.name} بخشی از تعهد ما به شماست. در این سند شفاف توضیح می‌دهیم چه داده‌هایی جمع‌آوری می‌شود، چرا، چگونه محافظت می‌شود و شما چه اختیاراتی دارید.`,
    '2026-08-01',
  ),
]

// ── باشگاه مشتریان ───────────────────────────────────────────────────────
const loyaltySource = read('src/app/loyalty/page.tsx')
const tiers = evaluate(
  slice(loyaltySource, 'const tiers =', '\n]\n\nconst installments', 'loyalty tiers') + '\n]',
)
const installments = evaluate(
  slice(loyaltySource, 'const installments =', '\n]\n\nexport default function', 'loyalty installments') + '\n]',
)

const steps = [
  { step: 1, title: 'انتخاب کالا', description: 'محصول را به سبد خرید اضافه کنید.' },
  { step: 2, title: 'انتخاب اقساط', description: 'در تسویه حساب گزینه اقساطی را بزنید.' },
  { step: 3, title: 'اعتبارسنجی', description: 'مدارک را بارگذاری و نتیجه را ببینید.' },
  { step: 4, title: 'ارسال کالا', description: 'پس از تأیید، کالا بدون ضامن ارسال می‌شود.' },
]

const payload = {
  articleCategories,
  articles,
  faqCategories: Object.entries(faqCategories).map(([slug, label]) => ({ slug, label })),
  faqs,
  legal,
  loyalty: {
    tiers: tiers.map(({ current, ...tier }) => tier),
    installments,
    steps,
  },
}

writeFileSync('backend/database/seeders/data/content.json', JSON.stringify(payload, null, 2) + '\n')

console.log(
  `articles=${articles.length} faqs=${faqs.length} legal=${legal.length} tiers=${tiers.length} installments=${installments.length}`,
)
