#!/usr/bin/env node
/**
 * ساختن بستهٔ استقرار «نصب‌نشده» برای انتقال با زیپ به هاست.
 *
 *   npm run pack:host                 # خروجی: nodehi-deploy.zip در ریشه پروژه
 *   npm run pack:host -- --out=D:/x/nodehi.zip
 *
 * چه چیزهایی داخل بسته نمی‌رود (تا سایت روی هاست از صفر نصب شود):
 *   • node_modules و .next — روی هاست خودش نصب/بیلد می‌شود (نسخه ویندوزی روی لینوکس کار نمی‌کند)
 *   • .env و هر .env.local — تنظیمات محلی؛ روی هاست از .env.example ساخته می‌شود
 *   • prisma/dev.db* — همان چیزی که سایت را «نصب‌شده» می‌کند؛ بدون آن، ویزارد /install باز است
 *   • tmp، .freebuff، coverage و زیپ‌های قبلی
 *
 * در نتیجه بسته فقط سورس + migrationها + .env.example است و روی هاست با
 * `npm install && npm run setup` (یا باز کردن /install) نصب می‌شود.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createZip } from './zip.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const args = process.argv.slice(2)
const outArg = args.find((arg) => arg.startsWith('--out='))
const outFile = outArg ? outArg.slice('--out='.length) : join(root, 'nodehi-deploy.zip')

/** پوشه‌هایی که هرگز منتقل نمی‌شوند */
const IGNORED_DIRS = new Set(['node_modules', '.next', '.git', 'tmp', '.freebuff', 'coverage', '.vercel', 'out', 'build', 'dist', 'data'])
/** فایل‌هایی که تنظیمات یا خروجی محلی‌اند */
const IGNORED_NAMES = new Set(['tsconfig.tsbuildinfo', 'next-env.d.ts', '.DS_Store', 'preview-start.log', 'preview-start.err'])
const ENV_TEMPLATES = new Set(['.env.example', '.env.sample', '.env.template'])

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

/** آیا این مسیر باید از بسته حذف شود؟ */
function isIgnored(sourcePath) {
  const rel = relative(root, sourcePath)
  if (!rel) return false

  const parts = rel.split(sep)
  if (IGNORED_DIRS.has(parts[0])) return true

  // دیتابیس محلی — همین فایل است که سایت را «نصب‌شده» می‌کند
  if (parts[0] === 'prisma' && /^dev\.db/.test(parts[1] ?? '')) return true

  const name = parts[parts.length - 1]
  if (IGNORED_NAMES.has(name)) return true
  if (name.startsWith('.env') && !ENV_TEMPLATES.has(name)) return true
  if (extname(name) === '.zip') return true

  return false
}

// ────────────────────────────────────────────────────────────
// ۱) بررسی پیش‌نیازها
// ────────────────────────────────────────────────────────────
step('بررسی پیش‌نیازها')

if (!existsSync(join(root, 'package.json'))) fail('package.json پیدا نشد؛ از ریشه پروژه اجرا کنید.')
if (!existsSync(join(root, 'prisma', 'migrations'))) fail('پوشه prisma/migrations پیدا نشد.')
if (!existsSync(join(root, '.env.example'))) warn('.env.example نیست؛ روی هاست باید .env را دستی بسازید')
ok('ساختار پروژه سالم است')

// ────────────────────────────────────────────────────────────
// ۲) کپی فایل‌های مجاز در پوشه موقت
// ────────────────────────────────────────────────────────────
// پوشه موقت خارج از پروژه — داخل خود پروژه، cpSync اجازه کپی نمی‌دهد
const stagingRoot = join(tmpdir(), `nodehi-pack-${process.pid}`)
const staging = join(stagingRoot, 'nodehi')

step('جمع‌آوری فایل‌های سورس')
rmSync(stagingRoot, { recursive: true, force: true })
mkdirSync(staging, { recursive: true })

cpSync(root, staging, {
  recursive: true,
  preserveTimestamps: true,
  filter: (sourcePath) => !isIgnored(sourcePath),
})

const copied = readdirSync(staging)
ok(`پوشه‌های منتقل‌شده: ${copied.length} مورد`)

// ────────────────────────────────────────────────────────────
// ۳) ساخت زیپ
// ────────────────────────────────────────────────────────────
step('ساخت فایل زیپ')

mkdirSync(dirname(outFile), { recursive: true })
rmSync(outFile, { force: true })

let zipped = false
let archive = { files: 0, bytes: 0 }
try {
  archive = createZip(staging, outFile)
  zipped = true
} catch (error) {
  fail('ساخت زیپ ناموفق بود.', String(error))
}

rmSync(stagingRoot, { recursive: true, force: true })

if (!zipped || !existsSync(outFile)) fail('ساخت زیپ ناموفق بود.')
ok(`${archive.files} فایل داخل بسته`)

const sizeMb = (statSync(outFile).size / (1024 * 1024)).toFixed(1)
ok(`ساخته شد: ${outFile} (${sizeMb} مگابایت)`)

console.log(`
──────────────────────────────────────────
✅ بستهٔ استقرار آماده است — بدون دیتابیس و بدون node_modules.

  روی هاست، پس از باز کردن زیپ:
    1) npm install --include=dev   (با NODE_ENV=production وابستگی‌های dev حذف می‌شوند)
    2) cp .env.example .env        (یا متغیرها را از پنل هاست بدهید)
    3) npm run doctor              (دقیقاً می‌گوید چه چیزی کم است)
    4) npm run setup               (یا سایت را بالا بیاورید و /install را باز کنید)
    5) npm run build               (بیلد باید روی همان هاست لینوکسی ساخته شود)
    6) در پنل هاست: Node.js App → Startup file = server.js → Restart

  ⚠ زیپ را داخل public_html باز نکنید؛ وب‌سرور آن پوشه را مستقیم سرو می‌کند
    و همهٔ آدرس‌ها ۴۰۴ می‌شوند. پوشه‌ای هم‌سطح public_html درست است.

  این بسته «نصب‌نشده» است: هیچ prisma/dev.db و .env داخلش نیست.
──────────────────────────────────────────`)
