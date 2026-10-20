#!/usr/bin/env node
/**
 * نقطهٔ ورود تولیدی سایت.
 *
 * چرا جدا از `next start`؟ روی هاست‌های اشتراکی (cPanel / DirectAdmin / Plesk)
 * معمولاً Passenger پروسه را با «فایل شروع» بالا می‌آورد و فلگ خط فرمان ندارد.
 * این فایل همان کاری را می‌کند که `next start` می‌کند، ولی:
 *
 *   • روی پورتی که هاست می‌دهد (`PORT`) و روی 0.0.0.0 گوش می‌دهد،
 *   • `.env` را مثل خود Next بارگذاری می‌کند،
 *   • اگر دیتابیس خالی باشد یک‌بار خودش مهاجرت و داده اولیه را می‌نشاند
 *     (روی هاست‌هایی مثل لیارا که ترمینال در دسترس نیست، نصب دستی لازم نمی‌شود)،
 *   • اگر بیلد تولیدی یا تنظیمات نباشد، پیام فارسی روشن می‌دهد و به‌جای
 *     صفحهٔ 404 مرموز، دلیل واقعی را در لاگ می‌نویسد.
 *
 * اجرا:  npm start        (روی هاست: فیلد Startup file در پنل = server.js)
 */

'use strict'

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')

const root = __dirname
const port = Number(process.env.PORT) || 3000

function fail(text, detail) {
  console.error(`\n  ✗ ${text}`)
  if (detail) console.error(`\n${detail}\n`)
  process.exit(1)
}

function warn(text) {
  console.warn(`  ⚠ ${text}`)
}

// ۱) همان کاری که next start با .env می‌کند
//
// اول از @next/env خود Next استفاده می‌کنیم (همان مسیری که `next start` می‌رود).
// اگر بستهٔ نصب هاست آن را در دسترس نگذارد (نصب غیر‌تخت مثل pnpm)، یک خوانندهٔ
// سادهٔ .env جایگزین می‌شود تا سایت به‌خاطر «DATABASE_URL تنظیم نشده» بالا نیامده نماند.
function loadEnv() {
  try {
    const { loadEnvConfig } = require('@next/env')
    loadEnvConfig(root)
    return true
  } catch {
    // ادامه به خوانندهٔ ساده
  }

  const files = ['.env.production', '.env.local', '.env']
  let loaded = false
  for (const file of files) {
    const filePath = path.join(root, file)
    if (!fs.existsSync(filePath)) continue
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!match) continue
      const key = match[1]
      if (process.env[key] !== undefined) continue
      let value = match[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
      loaded = true
    }
  }
  return loaded
}

/**
 * پوشهٔ فایل SQLite را می‌سازد.
 *
 * Prisma مسیر نسبی `file:` را نسبت به پوشهٔ اسکیما (`prisma/`) باز می‌کند، پس
 * `file:../data/nodehi.db` یعنی `<root>/data/nodehi.db`. اگر پوشه نباشد، باز کردن
 * دیتابیس شکست می‌خورد؛ ساختش اینجا بی‌خطر و لازم است.
 */
function ensureDatabaseDir(databaseUrl) {
  if (!databaseUrl || !databaseUrl.startsWith('file:')) return
  const target = databaseUrl.slice('file:'.length)
  const absolute = path.resolve(root, 'prisma', target)
  try {
    fs.mkdirSync(path.dirname(absolute), { recursive: true })
  } catch (error) {
    warn(`ساخت پوشهٔ دیتابیس ممکن نشد: ${error.message}`)
  }
}

/** آیا جدول‌های پروژه ساخته شده‌اند؟ */
async function databaseReady() {
  const { PrismaClient } = require('@prisma/client')
  const client = new PrismaClient()
  try {
    await client.$queryRaw`SELECT 1 FROM _prisma_migrations LIMIT 1`
    return true
  } catch (error) {
    const code = error && error.code
    const message = String((error && error.message) || error)
    if (code === 'P2021' || /no such table/i.test(message)) return false
    // خطای واقعی اتصال را پنهان نمی‌کنیم
    throw error
  } finally {
    await client.$disconnect()
  }
}

/** مهاجرت + داده اولیه، بدون نیاز به ترمینال (روی هاست‌های ابری لازم است) */
function runSetup() {
  const cli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js')
  if (!fs.existsSync(cli)) {
    warn('دیتابیس خالی است ولی CLI پریسما نصب نیست؛ `npm install` سپس `npm run setup` را اجرا کنید.')
    return false
  }

  console.log('\n▸ دیتابیس خالی است — اجرای مهاجرت و داده اولیه (یک‌بار)')
  const steps = [
    ['migrate deploy', [cli, 'migrate', 'deploy']],
    ['seed', [path.join(root, 'prisma', 'seed.mjs')]],
  ]
  for (const [label, args] of steps) {
    const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' })
    if (result.status !== 0) {
      fail(
        `مرحلهٔ «${label}» ناموفق بود (کد ${result.status}).`,
        'DATABASE_URL و دسترسی نوشتن پوشهٔ دیتابیس را بررسی کنید.',
      )
    }
    console.log(`  ✓ ${label}`)
  }
  return true
}

async function main() {
  // ۲) بیلد تولیدی باید روی همین هاست ساخته شده باشد
  if (!fs.existsSync(path.join(root, '.next', 'BUILD_ID'))) {
    fail(
      'بیلد تولیدی پیدا نشد: .next/BUILD_ID وجود ندارد.',
      [
        'روی خود هاست این را اجرا کنید (بیلد ویندوز روی لینوکس کار نمی‌کند):',
        '  npm install --include=dev',
        '  npm run build',
        '',
        'اگر پنل هاست فقط «آپلود فایل» دارد و ترمینال/SSH نمی‌دهد،',
        'این هاست برای اجرای Next.js مناسب نیست — جزئیات در docs/SETUP.md.',
      ].join('\n'),
    )
  }

  if (!loadEnv()) {
    warn('.env بارگذاری نشد؛ مقادیر را در بخش Environment پنل هاست تنظیم کنید.')
  }

  if (!process.env.DATABASE_URL) {
    fail(
      'DATABASE_URL تنظیم نشده است.',
      'فایل .env را از .env.example بسازید یا مقادیر را در بخش Environment پنل هاست بگذارید.\nاگر DATABASE_URL نباشد، هر صفحه با خطای ۵۰۰ می‌آید.',
    )
  }

  ensureDatabaseDir(process.env.DATABASE_URL)

  // ۳) نصب خودکار فقط وقتی دیتابیس هنوز جدولی ندارد (نه در هر بار بالا آمدن)
  if (process.env.NODEHI_AUTO_SETUP !== '0') {
    let ready = true
    try {
      ready = await databaseReady()
    } catch (error) {
      fail('اتصال به دیتابیس ناموفق بود.', String((error && error.stack) || error))
    }
    if (!ready) runSetup()
  }

  // ۴) بالا آوردن Next
  const next = require('next')
  const app = next({ dev: false, dir: root })
  const handle = app.getRequestHandler()

  await app.prepare()

  const server = http.createServer((request, response) => handle(request, response))

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      fail(
        `پورت ${port} در حال استفاده است.`,
        'یک نسخه از سایت از قبل بالاست. در پنل هاست پروسهٔ Node را Restart/Stop کنید،\nیا اگر دستی اجرا می‌کنید پورت دیگری بدهید: PORT=3001 npm start',
      )
    }
    fail('سرور بالا نیامد.', String((error && error.stack) || error))
  })

  server.listen(port, '0.0.0.0', () => {
    console.log(`\n▸ سایت روی http://0.0.0.0:${port} بالا آمد (NODE_ENV=${process.env.NODE_ENV || 'production'})`)
    console.log('  بررسی سلامت: /api/health\n')
  })

  const shutdown = () => server.close(() => process.exit(0))
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  fail('آماده‌سازی Next ناموفق بود.', (error && error.stack) || String(error))
})
