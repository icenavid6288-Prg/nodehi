#!/usr/bin/env node
/**
 * ساخت بستهٔ آمادهٔ هاست اشتراکی (LiteSpeed/cPanel) برای نودهی.
 *
 * چرا این اسکریپت؟
 * هاست‌های اشتراکی معمولاً Node و Composer ندارند و Document Root هم همان
 * public_html است. پس بسته به شکلی ساخته می‌شود که فقط با File Manager قابل
 * آپلود باشد:
 *
 *   nodehi-host/
 *   ├── public_html/   ← خروجی Vite + .htaccess + laravel.php + install.php
 *   ├── nodehi/        ← لاراول کامل با vendor/ (بدون dev)
 *   └── INSTALL.txt
 *
 * استفاده:
 *   node tools/build-host-release.mjs --site-url=https://noudalife.ir
 *   PHP_BIN=/usr/local/bin/php node tools/build-host-release.mjs --site-url=...
 *
 * گزینه‌ها:
 *   --site-url=<url>   آدرس عمومی سایت (پیش‌فرض https://noudalife.ir)
 *   --skip-build       از dist موجود استفاده کن (بدون npm)
 *   --skip-zip         فقط پوشهٔ build را بساز
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    return [key, rest.join('=') || 'true']
  }),
)

const siteUrl = (args.get('site-url') ?? 'https://noudalife.ir').replace(/\/+$/, '')
const skipBuild = args.has('skip-build')
const skipZip = args.has('skip-zip')
const phpBin = process.env.PHP_BIN ?? 'php'

const buildDir = join(root, '.build', 'host-release')
const appOut = join(buildDir, 'nodehi')
const publicOut = join(buildDir, 'public_html')
const vendorOut = join(appOut, 'vendor')
const artifactDir = join(root, 'artifacts')
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const zipPath = join(artifactDir, `nodehi-host-${stamp}.zip`)

function step(message) {
  process.stdout.write(`\n▶ ${message}\n`)
}

function run(command, commandArgs, options = {}) {
  execFileSync(command, commandArgs, { stdio: 'inherit', cwd: root, ...options })
}

/* ------------------------------ ۱. فرانت‌اند ------------------------------ */

if (skipBuild) {
  if (!existsSync(join(root, 'frontend', 'dist', 'index.html'))) {
    throw new Error('dist موجود نیست؛ بدون --skip-build اجرا کنید.')
  }
  step('استفاده از dist موجود')
} else {
  if (!existsSync(join(root, 'frontend', 'node_modules'))) {
    step('نصب وابستگی‌های فرانت‌اند (npm ci)')
    run('npm', ['ci'], { cwd: join(root, 'frontend') })
  }

  step(`ساخت SPA + پررندر برای ${siteUrl}`)
  run('npm', ['run', 'prerender'], {
    cwd: join(root, 'frontend'),
    env: {
      ...process.env,
      // همین‌مبدأ: درخواست‌ها به /api همان دامنه می‌رود (بدون CORS و بدون هارد‌کد دامنه).
      VITE_API_URL: '/api',
      VITE_SITE_URL: siteUrl,
      SITE_URL: siteUrl,
    },
  })
}

/* ------------------------------ ۲. آماده‌سازی ------------------------------ */

step('پاک‌کردن build قبلی')
rmSync(buildDir, { recursive: true, force: true })
mkdirSync(appOut, { recursive: true })
mkdirSync(publicOut, { recursive: true })
mkdirSync(artifactDir, { recursive: true })

/* ---------------------------- ۳. کپی لاراول ---------------------------- */

step('کپی کد لاراول')
const backendRoot = join(root, 'backend')
const exclude = new Set([
  'vendor', 'node_modules', '.env', '.env.example.bak', 'tests', 'phpunit.xml',
  '.phpunit.result.cache', '.git', '.gitignore',
])

cpSync(backendRoot, appOut, {
  recursive: true,
  dereference: true,
  filter: (src) => {
    const rel = src.slice(backendRoot.length + 1)
    if (rel === '') return true
    const top = rel.split(/[\\/]/)[0]
    if (exclude.has(top)) return false
    if (top === 'database' && rel.endsWith('.sqlite')) return false
    if (top === 'database' && /\.sqlite-(journal|wal|shm)$/.test(rel)) return false
    if (rel.startsWith('storage/logs/') && rel !== 'storage/logs' && !rel.endsWith('.gitignore')) return false
    return true
  },
})

/* ------------------------- ۴. vendor نسخهٔ تولید ------------------------- */

// مهم: composer باید *داخل* پوشهٔ کپی‌شده اجرا شود. اگر vendor بیرون از
// پوشهٔ پروژه ساخته شود، autoloader مسیر نسبی تا پوشهٔ اصلی پروژه را
// هارد‌کد می‌کند و بسته پس از آپلود روی هاست کار نمی‌کند.
step('نصب وابستگی‌های PHP بدون dev (composer install --no-dev)')
if (!existsSync(join(root, 'tools', 'composer.phar'))) {
  throw new Error('tools/composer.phar پیدا نشد.')
}
run(phpBin, [
  join(root, 'tools', 'composer.phar'),
  'install',
  '--no-dev',
  '--no-interaction',
  '--no-progress',
  '--prefer-dist',
  '--optimize-autoloader',
  '--working-dir=' + appOut,
], {
  env: { ...process.env, COMPOSER_NO_INTERACTION: '1' },
})

if (!existsSync(join(vendorOut, 'autoload.php'))) {
  throw new Error('vendor ساخته نشد: ' + vendorOut)
}

step('کپی خروجی فرانت‌اند')
cpSync(join(root, 'frontend', 'dist'), publicOut, { recursive: true })

step('افزودن فایل‌های داکیومنتروت')
for (const file of ['.htaccess', 'laravel.php', 'install.php']) {
  cpSync(join(root, 'deploy', 'public_html', file), join(publicOut, file))
}
mkdirSync(join(publicOut, 'uploads'), { recursive: true })
// بدون این فایل، باز کردن /uploads/ یا فهرست پوشه یا پوستهٔ SPA برمی‌گرداند.
writeFileSync(join(publicOut, 'uploads', 'index.html'), '<!doctype html><title></title>\n')

/* --------------------------- ۵. بررسی بسته --------------------------- */

step('بررسی ساختار بسته')
const required = [
  join(publicOut, 'index.html'),
  join(publicOut, '.htaccess'),
  join(publicOut, 'laravel.php'),
  join(publicOut, 'install.php'),
  join(appOut, 'bootstrap', 'app.php'),
  join(appOut, '.env.example'),
  join(vendorOut, 'autoload.php'),
  join(appOut, 'storage', 'framework', 'views'),
]
const missing = required.filter((path) => !existsSync(path))
if (missing.length > 0) {
  throw new Error('این مسیرها در بسته نیستند:\n' + missing.join('\n'))
}

const leaked = readdirSync(appOut).filter((name) => name === '.env')
if (leaked.length > 0) {
  throw new Error('فایل .env نباید در بسته باشد.')
}

/* ---------------------------- ۶. راهنمای نصب ---------------------------- */

writeFileSync(join(buildDir, 'INSTALL.txt'), `نودهی — بستهٔ نصب روی هاست اشتراکی
=====================================================

۱) دو پوشهٔ این بسته را در هوم‌دایرکتوری هاست آپلود کنید:

   home/USERNAME/public_html   ← محتوای پوشهٔ public_html این بسته
   home/USERNAME/nodehi        ← محتوای پوشهٔ nodehi این بسته

   مهم: کل محتوای public_html (شامل .htaccess و laravel.php و index.html)
   باید مستقیم در public_html باشد، نه در یک زیرپوشه.

   اگر فقط یک پوشه آپلود می‌کنید، حتماً public_html را اول آپلود کنید تا
   دامنه از حالت ۴۰۴ خارج شود.

۲) دسترسی پوشه‌ها را روی 755 بگذارید (اگر خطای نوشتن گرفتید 775):

   nodehi/storage
   nodehi/bootstrap/cache
   nodehi/database

۳) در مرورگر باز کنید:  https://YOUR-DOMAIN/install.php

   فرم را پر کنید. بعد از نصب موفق، install.php خودش حذف می‌شود و سایت روی
   https://YOUR-DOMAIN بالا می‌آید.

۴) کد ورود پنل (/admin) با شمارهٔ همراه مدیر و کد یک‌بارمصرف است. تا زمانی که
   کلید کاوه‌نگار ثبت نشده، گزینهٔ «ورود بدون پیامک» را در .env فعال بگذارید
   (AUTH_OTP_DEV_MODE=1) و بعد از تنظیم پیامک آن را صفر کنید.

۵) اگر گواهی SSL فعال نیست، اول از پنل هاست (Let's Encrypt) فعالش کنید؛
   آدرس سایت در .env باید همان https باشد.

راهنمای کامل: docs/HOST-DEPLOY.md در مخزن پروژه.
`)

/* ------------------------------- ۷. فشرده‌سازی ------------------------------- */

if (!skipZip) {
  step('فشرده‌سازی')
  rmSync(zipPath, { force: true })
  run('zip', ['-rq', zipPath, 'public_html', 'nodehi', 'INSTALL.txt'], { cwd: buildDir })
}

/* ------------------------------- ۸. گزارش ------------------------------- */

function sizeOf(path) {
  const stats = statSync(path)
  if (!stats.isDirectory()) return stats.size
  return readdirSync(path).reduce((sum, name) => sum + sizeOf(join(path, name)), 0)
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + ' MB'

process.stdout.write('\n────────────────────────────────────────────\n')
process.stdout.write(`آدرس سایت در بیلد: ${siteUrl}\n`)
process.stdout.write(`پوشهٔ بسته: ${buildDir}  (${mb(sizeOf(buildDir))})\n`)
if (!skipZip) process.stdout.write(`فایل آپلود: ${zipPath}  (${mb(sizeOf(zipPath))})\n`)
process.stdout.write('بعد از آپلود: https://YOUR-DOMAIN/install.php\n')
process.stdout.write('────────────────────────────────────────────\n')
