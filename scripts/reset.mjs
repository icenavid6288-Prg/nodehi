#!/usr/bin/env node
/**
 * برش‌داشتن نصب و نصب دوباره — نودهی
 *
 *   npm run reinstall                 # ریست کامل + seed با شماره SEED_ADMIN_PHONE
 *   npm run reinstall -- --phone=09121234567
 *   npm run reinstall -- --empty      # فقط ریست؛ بدون seed (ویزارد /install باز می‌ماند)
 *   npm run reinstall -- --force      # اجرا روی NODE_ENV=production
 *
 * «نصب‌شده» یک فایل نشانه نیست؛ وضعیت از دیتابیس خوانده می‌شود (حساب مدیر +
 * محصولات). پس پاک‌کردن داده‌ها همان برش‌داشتن نصب است. این اسکریپت از همان
 * ابزار رسمی پریسما استفاده می‌کند تا SQLite و PostgreSQL یکسان رفتار کنند.
 *
 * روی داده واقعی مخرب است؛ به همین دلیل در production بدون --force اجرا نمی‌شود.
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const args = process.argv.slice(2)
const force = args.includes('--force')
const skipSeed = args.includes('--empty')
const phoneArg = args.find((arg) => arg.startsWith('--phone='))
const adminPhone = phoneArg ? phoneArg.slice('--phone='.length) : (process.env.SEED_ADMIN_PHONE ?? '09120000000')

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

/** اجرای فرمان با خروجی زنده؛ کد خروج غیر صفر = توقف */
function run(command, commandArgs, label) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    // روی ویندوز سرور بدون کنسول، پنجره فرزند باید پنهان باشد
    windowsHide: true,
  })
  if (result.error) fail(`${label} اجرا نشد.`, String(result.error))
  if (result.status !== 0) fail(`${label} ناموفق بود (کد ${result.status}).`)
}

// ────────────────────────────────────────────────────────────
// ۱) محافظت و پیش‌نیاز
// ────────────────────────────────────────────────────────────
step('بررسی پیش‌نیازها')

if (process.env.NODE_ENV === 'production' && !force) {
  fail(
    'NODE_ENV=production است و ریست همه داده‌ها را پاک می‌کند.',
    '  اگر واقعاً می‌خواهید این کار را بکنید: npm run reinstall -- --force',
  )
}
ok(`Node ${process.versions.node}`)

if (!existsSync(join(root, 'node_modules', 'prisma', 'build', 'index.js'))) {
  fail('وابستگی‌ها نصب نیستند. اول اجرا کنید: npm install')
}
ok('وابستگی‌ها نصب هستند')

if (!existsSync(join(root, '.env'))) {
  warn('.env پیدا نشد؛ DATABASE_URL باید در محیط تنظیم شده باشد')
}

const prismaCli = join(root, 'node_modules', 'prisma', 'build', 'index.js')

// ────────────────────────────────────────────────────────────
// ۲) ریست دیتابیس — حذف داده‌ها و اجرای دوباره همه مهاجرت‌ها
// ────────────────────────────────────────────────────────────
step('پاک‌کردن داده‌ها و اجرای دوباره مهاجرت‌ها (prisma migrate reset)')
console.log('  تمام جدول‌ها خالی و از نو ساخته می‌شوند…')
run(process.execPath, [prismaCli, 'migrate', 'reset', '--force'], 'prisma migrate reset')
ok('دیتابیس خالی و جداول آماده است')

// ────────────────────────────────────────────────────────────
// ۳) داده اولیه — همان seed نصب
// ────────────────────────────────────────────────────────────
if (skipSeed) {
  step('داده اولیه (seed) — رد شد (--empty)')
  console.log('\n  ویزارد نصب باز است: /install')
} else {
  step(`کاشت داده اولیه (seed) با شماره مدیر ${adminPhone}`)
  const result = spawnSync(process.execPath, [join(root, 'prisma', 'seed.mjs')], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, SEED_ADMIN_PHONE: adminPhone },
  })
  if (result.status !== 0) fail('seed ناموفق بود؛ لاگ بالا را ببینید.')
  ok('کاتالوگ، کدهای تخفیف، حساب مدیر و درگاه‌ها آماده‌اند')
}

console.log(`
──────────────────────────────────────────
✅ نصب از نو انجام شد.

  ورود به پنل مدیریت:  /login   (شماره مدیر: ${skipSeed ? '—' : adminPhone})
  ویزارد نصب:          /install (فقط وقتی --empty زده باشید)
──────────────────────────────────────────`)
