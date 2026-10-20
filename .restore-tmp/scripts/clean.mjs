#!/usr/bin/env node
/**
 * پاک‌کردن پوشه خروجی Next (`.next`).
 *
 *   npm run clean
 *
 * چه زمانی لازم است؟ وقتی صفحات به‌جای محتوا خطای ۵۰۰ یا ۴۰۴ می‌دهند،
 * معمولاً `.next` با خروجی یک بیلد تولیدی یا یک سرور توسعه دیگر قاطی شده
 * است. پاک‌کردن این پوشه، کاملاً امن است؛ فقط کامپایل بعدی از صفر انجام
 * می‌شود. فایل‌های منبع، `.env` و دیتابیس دست نمی‌خورند.
 *
 * سرور توسعه باید بسته باشد؛ اگر باز باشد، همین پوشه را دوباره می‌سازد.
 */

import { existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const targets = ['.next', 'tsconfig.tsbuildinfo']

for (const target of targets) {
  const full = join(root, target)
  if (!existsSync(full)) continue
  rmSync(full, { recursive: true, force: true })
  console.log(`  ✓ ${target} پاک شد`)
}

console.log('\n▸ تمام. سرور را با npm run dev دوباره بالا بیاورید.')
