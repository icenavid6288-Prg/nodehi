#!/usr/bin/env node
/**
 * بررسی آمادگی استقرار — «چرا روی هاست 404/500 می‌دهد؟» را در یک دستور جواب می‌دهد.
 *
 *   npm run doctor
 *
 * فقط می‌خواند و چیزی را تغییر نمی‌دهد. کد خروج ۰ یعنی همه‌چیز برای اجرا آماده است،
 * ۱ یعنی یک پیش‌نیاز واقعاً کم است (با پیام دقیقِ کاری که باید بکنید).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

const problems = []
const warnings = []
const passed = []

function pass(text) {
  passed.push(text)
}
function warn(text, fix) {
  warnings.push({ text, fix })
}
function problem(text, fix) {
  problems.push({ text, fix })
}

/** خواندن .env بدون چاپ مقدارها — فقط کلیدها */
function readEnvKeys(file) {
  try {
    const keys = new Set()
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=/)
      if (match) keys.add(match[1])
    }
    return keys
  } catch {
    return null
  }
}

function resolveDatabaseUrl() {
  // اولویت با متغیر محیطی است؛ بعد .env (چون این اسکریپت خودش Next را بالا نمی‌آورد)
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  try {
    const match = readFileSync(join(root, '.env'), 'utf8').match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

// ───────────── ۱) محل پروژه ─────────────
const parts = root.split(sep)
if (parts.includes('public_html') || parts.includes('www') || parts.includes('httpdocs')) {
  problem(
    'پروژه داخل پوشهٔ عمومی وب (public_html / www / httpdocs) است.',
    [
      'این پوشه را وب‌سرور (Apache/nginx) مستقیم سرو می‌کند و Node اجرا نمی‌شود —',
      'به همین دلیل همهٔ آدرس‌ها 404 می‌شوند. بدتر: هر فایل .env داخل آن از اینترنت',
      'قابل دانلود است.',
      '',
      'پروژه را به پوشهٔ همسطح منتقل کنید (مثلاً /home/USER/nodehi) و در پنل هاست',
      'یک Node.js App با Application root = nodehi و Startup file = server.js بسازید.',
      'راهنمای کامل: docs/SETUP.md → «هاست اشتراکی و ۴۰۴ بعد از آپلود زیپ»',
    ].join('\n'),
  )
} else {
  pass(`محل پروژه بیرون از ریشهٔ وب است (${root})`)
}

// ───────────── ۲) تنظیمات ─────────────
const envPath = join(root, '.env')
const envExamplePath = join(root, '.env.example')
const envKeys = readEnvKeys(envPath)

if (envKeys) {
  pass('.env وجود دارد')
} else if (existsSync(join(root, '.env.local'))) {
  warn('فایل .env نیست؛ .env.local پیدا شد.', 'برای هاست، مقادیر را در .env یا بخش Environment پنل بگذارید.')
} else {
  problem(
    '.env وجود ندارد.',
    existsSync(envExamplePath)
      ? 'اجرا کنید:  cp .env.example .env  و بعد مقدارهای واقعی را پر کنید.'
      : '.env را با DATABASE_URL و بقیهٔ کلیدهای لازم بسازید.',
  )
}

const databaseUrl = resolveDatabaseUrl()
if (!databaseUrl) {
  problem(
    'DATABASE_URL تنظیم نشده است.',
    'بدون آن پروسه بالا می‌آید ولی هر صفحه با خطای ۵۰۰ می‌آید. مقدارش را در .env یا پنل هاست بگذارید.',
  )
} else {
  pass(`DATABASE_URL تنظیم شده (${databaseUrl.startsWith('file:') ? 'SQLite محلی' : databaseUrl.split(':')[0]})`)
}

if (process.env.NODE_ENV === 'development') {
  warn('NODE_ENV=development است.', 'روی هاست باید production باشد؛ وگرنه Next حالت توسعه و بیلد سنگین اجرا می‌کند.')
}

// ───────────── ۳) بیلد تولیدی ─────────────
if (existsSync(join(root, '.next', 'BUILD_ID'))) {
  pass('بیلد تولیدی موجود است (.next/BUILD_ID)')
} else {
  problem(
    'بیلد تولیدی ساخته نشده است (.next/BUILD_ID نیست).',
    'روی همین هاست اجرا کنید:  npm install --include=dev && npm run build\n(بیلد ساخته‌شده روی ویندوز روی لینوکس کار نمی‌کند.)',
  )
}

// ───────────── ۴) کلاینت Prisma ─────────────
if (existsSync(join(root, 'node_modules', '.prisma', 'client', 'index.js'))) {
  pass('کلاینت Prisma ساخته شده است')
} else {
  problem('کلاینت Prisma ساخته نشده است.', 'اجرا کنید:  npm run db:generate')
}

// ───────────── ۵) دیتابیس و مهاجرت‌ها ─────────────
const migrationsDir = join(root, 'prisma', 'migrations')
let migrations = 0
try {
  migrations = readdirSync(migrationsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length
  if (migrations > 0) {
    pass(`${migrations} مهاجرت در prisma/migrations موجود است`)
  } else {
    problem('پوشهٔ prisma/migrations خالی است.', 'فایل‌های مهاجرت باید داخل بستهٔ استقرار باشند.')
  }
} catch {
  problem('پوشهٔ prisma/migrations پیدا نشد.', 'بستهٔ ناقص آپلود شده است؛ دوباره از سورس پروژه بسته بسازید.')
}

if (databaseUrl && databaseUrl.startsWith('file:')) {
  const relativePath = databaseUrl.slice('file:'.length)
  const dbPath = join(root, 'prisma', relativePath.replace(/^\.\//, ''))
  if (existsSync(dbPath)) {
    pass('فایل دیتابیس SQLite موجود است')
  } else {
    problem(
      `فایل دیتابیس SQLite پیدا نشد (${dbPath}).`,
      'با `npm run setup` (یا باز کردن /install) ساخته می‌شود. مسیر DATABASE_URL نسبت به پوشهٔ prisma است.',
    )
  }
}

if (databaseUrl) {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const rows = await prisma.$queryRaw`SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL`
    const applied = Number(rows?.[0]?.count ?? 0)
    await prisma.$disconnect()
    if (applied >= migrations && migrations > 0) {
      pass(`مهاجرت‌ها اعمال شده‌اند (${applied} مورد)`)
    } else {
      problem(
        `از ${migrations} مهاجرت، فقط ${applied} مورد اعمال شده است.`,
        'اجرا کنید:  npm run db:deploy   (یا کامل: npm run setup)',
      )
    }
  } catch (error) {
    const message = String(error?.message ?? error).split('\n')[0]
    problem(`اتصال به دیتابیس یا خواندن جدول مهاجرت‌ها ناموفق بود: ${message}`, 'DATABASE_URL و دسترسی دیتابیس را بررسی کنید، سپس: npm run db:deploy')
  }
}

// ───────────── ۶) فایل شروع ─────────────
if (existsSync(join(root, 'server.js'))) {
  pass('فایل شروع server.js موجود است (Startup file در پنل هاست)')
} else {
  warn('server.js نیست.', 'در پنل هاست Startup file را روی server.js بگذارید، یا از `npm start` استفاده کنید.')
}

// ───────────── گزارش ─────────────
console.log('\n▸ بررسی آمادگی استقرار\n')
for (const text of passed) console.log(`  ✓ ${text}`)
for (const item of warnings) {
  console.log(`  ⚠ ${item.text}`)
  if (item.fix) console.log(`      ↳ ${item.fix}`)
}
for (const item of problems) {
  console.log(`  ✗ ${item.text}`)
  if (item.fix) console.log(`      ↳ ${item.fix}`)
}

if (problems.length === 0) {
  console.log('\n✅ آماده است: با `npm start` (یا Restart در پنل هاست) بالا بیاورید و /api/health را ببینید.\n')
  process.exit(0)
}

console.log(`\n✗ ${problems.length} مورد باید رفع شود.\n`)
process.exit(1)
