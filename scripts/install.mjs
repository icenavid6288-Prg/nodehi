#!/usr/bin/env node
/**
 * نصب‌کن CLI نودهی — آماده‌سازی کامل سایت روی هاست با یک فرمان.
 *
 *   npm run setup
 *
 * کارها (به ترتیب، idempotent — اجرای دوباره امن است):
 *   ۱) بررسی نسخه Node و وجود node_modules
 *   ۲) ساخت .env از روی .env.example در صورت نبود + کلیدهای امنیتی تصادفی
 *   ۳) prisma generate (برای اطمینان از تطابق کلاینت با اسکیما)
 *   ۴) prisma migrate deploy — فقط مهاجرت‌های اجرا نشده
 *   ۵) seed — کاتالوگ، کد تخفیف، حساب مدیر (SEED_ADMIN_PHONE)
 *
 * فلگ‌ها:
 *   --no-seed     مرحله seed اجرا نشود (مثلاً برای به‌روزرسانی بدون دست‌زدن به داده)
 *   --no-env      فایل .env ساخته نشود (اگر مدیریت آن دست سیستم است)
 *
 * خروجی: صفر یعنی همه مراحل موفق؛ غیر صفر یعنی در همان مرحله متوقف شده.
 */

import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const args = process.argv.slice(2)
const skipSeed = args.includes('--no-seed')
const skipEnv = args.includes('--no-env')

/** پیام‌های کنسول با قالب ساده و بدون وابستگی */
function step(text) {
  console.log(`\n▸ ${text}`)
}
function ok(text) {
  console.log(`  ✓ ${text}`)
}
function warn(text) {
  console.log(`  ⚠ ${text}`)
}
function fail(text, detail) {
  console.error(`\n  ✗ ${text}`)
  if (detail) console.error(detail)
  process.exit(1)
}

/** اجرای یک فرمان با خروجی زنده؛ خروجی غیر صفر = توقف */
function run(command, commandArgs, label) {
  // shell لازم نیست: مسیر node و پریسما همان مسیر اجرای فعلی است. با shell روی
  // ویندوز، مسیر دارای فاصله («C:\Program Files\nodejs») تکه‌تکه می‌شود و
  // فرمان با خطای «is not recognized» شکست می‌خورد.
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', windowsHide: true })
  if (result.status !== 0) {
    fail(`${label} ناموفق بود (کد ${result.status}).`, `فرمان: ${command} ${commandArgs.join(' ')}`)
  }
}

// ────────────────────────────────────────────────────────────
// ۱) پیش‌نیازها
// ────────────────────────────────────────────────────────────
step('بررسی پیش‌نیازها')

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10)
if (!Number.isFinite(nodeMajor) || nodeMajor < 18) {
  fail(`Node 18 یا جدیدتر لازم است؛ نسخه فعلی ${process.versions.node} است.`)
}
ok(`Node ${process.versions.node}`)

if (!existsSync(join(root, 'node_modules', 'next'))) {
  fail('وابستگی‌ها نصب نیستند. اول اجرا کنید: npm install')
}
ok('وابستگی‌ها نصب هستند')

// ────────────────────────────────────────────────────────────
// ۲) فایل .env
// ────────────────────────────────────────────────────────────
step('آماده‌سازی متغیرهای محیطی (.env)')

const envPath = join(root, '.env')
if (existsSync(envPath)) {
  ok('.env از قبل موجود است — دست نخورد')
} else if (skipEnv) {
  warn('.env ساخته نشد (--no-env)؛ اگر DATABASE_URL تنظیم نیست، مراحل بعدی ناموفق می‌شوند')
} else if (!existsSync(join(root, '.env.example'))) {
  warn('.env.example پیدا نشد؛ .env ساخته نشد')
} else {
  // کلیدهای امنیتی تصادفی تا سایت از همان اول بدون هشدار رمزنگاری بالا بیاید
  const secrets = {
    SETTINGS_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    AUTOMATION_WEBHOOK_SECRET: randomBytes(32).toString('hex'),
    NODEHI_WEBHOOK_SECRET: randomBytes(32).toString('hex'),
  }
  let content = readFileSync(join(root, '.env.example'), 'utf8')
  for (const [key, value] of Object.entries(secrets)) {
    // فقط مقدار خالی (KEY="") پر می‌شود؛ مقدار از پیش تنظیم‌شده حفظ می‌شود
    content = content.replace(new RegExp(`^${key}=""$`, 'm'), `${key}="${value}"`)
  }
  writeFileSync(envPath, content, 'utf8')
  ok('.env از روی .env.example ساخته شد')
  ok('کلیدهای امنیتی (رمزنگاری تنظیمات و امضای وبهوک) تصادفی تولید شدند')
}

// ────────────────────────────────────────────────────────────
// ۳) تولید کلاینت پریسما
// ────────────────────────────────────────────────────────────
step('تولید کلاینت پریسما (prisma generate)')
const generate = spawnSync(process.execPath, [join(root, 'node_modules', 'prisma', 'build', 'index.js'), 'generate'], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true,
})
if (generate.status !== 0) {
  fail(
    `prisma generate ناموفق بود (کد ${generate.status}).`,
    '  اگر سرور توسعه یا «npm start» در حال اجراست، آن را ببندید و دوباره اجرا کنید؛ روی ویندوز فایل موتور پریسما هنگام اجرا قفل می‌شود (EPERM).',
  )
}
ok('کلاینت پریسما تولید شد')

// ────────────────────────────────────────────────────────────
// ۴) مهاجرت دیتابیس
// ────────────────────────────────────────────────────────────
step('اجرای مهاجرت دیتابیس (prisma migrate deploy)')
run(
  process.execPath,
  [join(root, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'],
  'prisma migrate deploy',
)
ok('جداول دیتابیس آماده است')

// ────────────────────────────────────────────────────────────
// ۵) داده اولیه
// ────────────────────────────────────────────────────────────
if (skipSeed) {
  step('داده اولیه (seed) — رد شد (--no-seed)')
} else {
  step('کاشت داده اولیه (seed)')
  run(process.execPath, [join(root, 'prisma', 'seed.mjs')], 'seed')
  ok('کاتالوگ، کدهای تخفیف، حساب مدیر و درگاه‌های پرداخت آماده‌اند')
}

// ────────────────────────────────────────────────────────────
// جمع‌بندی
// ────────────────────────────────────────────────────────────
console.log(`
──────────────────────────────────────────
✅ نصب کامل شد.

  برای اجرای سرور توسعه:   npm run dev
  برای اجرای نسخه تولید:    npm run build && npm start

  ورود به پنل مدیریت:      /login  (شماره مدیر: ${process.env.SEED_ADMIN_PHONE ?? '09120000000'})
  راهنمای استقرار:         docs/SETUP.md
──────────────────────────────────────────`)
