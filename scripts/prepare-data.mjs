#!/usr/bin/env node
/**
 * آماده‌سازی پوشهٔ داده برای دیتابیس SQLite.
 *
 *   npm run build   →  قبل از build خودکار اجرا می‌شود (prebuild)
 *
 * چرا؟ روی هاست‌های ابری (لیارا) دیتابیس روی دیسک دائمی در `data/` است و
 * `DATABASE_URL="file:../data/nodehi.db"` به آن اشاره می‌کند. اگر این پوشه در
 * محیط build وجود نداشته باشد، Prisma هنگام بیلد نمی‌تواند فایل را باز کند و
 * بیلد شکست می‌خورد — در حالی که همان بیلد باید بدون داده هم موفق شود
 * (کاتالوگ خالی، صفحه‌ها در زمان اجرا رندر می‌شوند).
 */

import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dataDir = join(root, 'data')

try {
  mkdirSync(dataDir, { recursive: true })
  console.log(`  ✓ ${dataDir} آماده است`)
} catch (error) {
  console.error(`  ✗ ساخت ${dataDir} ناموفق بود: ${error.message}`)
  process.exit(1)
}
