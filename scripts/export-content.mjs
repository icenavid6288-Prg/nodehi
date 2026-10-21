#!/usr/bin/env node
/**
 * اعتبارسنجی دادهٔ seed بک‌اند لاراول.
 *
 *   node scripts/export-content.mjs
 *
 * پیش‌تر این اسکریپت محتوای صفحات را از سورس Next.js استخراج می‌کرد؛ با حذف
 * لایهٔ داده‌ای Next دیگر چنین سورسی وجود ندارد و اجرای قبلی با ENOENT
 * می‌شکست. حالا `backend/database/seeders/data/content.json` منبع حقیقت است
 * و این اسکریپت فقط وجود و ساختار فایل‌ها را بررسی می‌کند تا پیش از
 * `migrate --seed` معلوم شود چه چیزی کم است.
 *
 * نام فایل برای سازگاری با مستندات و اسکریپت‌های قبلی حفظ شده است.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dir = join(root, 'backend', 'database', 'seeders', 'data')

const files = {
  'categories.json': (data) => Array.isArray(data) && data.length > 0,
  'brands.json': (data) => Array.isArray(data) && data.length > 0,
  'products.json': (data) => Array.isArray(data) && data.length > 0,
  'content.json': (data) =>
    Array.isArray(data.articles) &&
    data.articles.length > 0 &&
    Array.isArray(data.faqs) &&
    Array.isArray(data.legal) &&
    data.legal.length > 0 &&
    Array.isArray(data.loyalty?.tiers),
}

let failed = 0

for (const [file, validate] of Object.entries(files)) {
  const path = join(dir, file)

  if (!existsSync(path)) {
    console.error(`✗ ${file} پیدا نشد — ${path}`)
    failed += 1
    continue
  }

  let data
  try {
    data = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    console.error(`✗ ${file} JSON معتبر نیست — ${error.message}`)
    failed += 1
    continue
  }

  if (!validate(data)) {
    console.error(`✗ ${file} ساختار مورد انتظار را ندارد.`)
    failed += 1
    continue
  }

  const count = Array.isArray(data) ? data.length : Object.keys(data).length
  console.log(`✓ ${file} (${count} گروه داده)`)
}

if (failed > 0) {
  console.error(`\n${failed} فایل داده مشکل دارد؛ seeder با این وضعیت اجرا نمی‌شود.`)
  process.exit(1)
}

console.log('\nدادهٔ seed کامل است.')
