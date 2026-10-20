#!/usr/bin/env node
/**
 * اجرای سرور توسعه با نگهبان پوشه خروجی `.next`.
 *
 *   npm run dev
 *   npm run dev -- -p 3001     (فلگ‌ها به next پاس داده می‌شوند)
 *   npm run dev -- --force     (بررسی «سرور در حال اجرا» رد شود)
 *
 * چرا این نگهبان؟ یک پوشه پروژه فقط یک `.next` دارد و دو چیز آن را خراب می‌کند:
 *
 *   ۱) خروجی بیلد تولیدی (`npm run build`) روی همان پوشه بماند و بعد سرور
 *      توسعه بالا بیاید. webpack توسعه چانک‌های تولیدی را نصفه می‌بیند و
 *      نتیجه‌اش خطای ۵۰۰ روی همه صفحات است — سایت «هیچی نمی‌آید».
 *   ۲) دو سرور توسعه هم‌زمان روی یک پوشه اجرا شوند (مثلاً ۳۰۰۰ و ۳۰۰۱).
 *      هر دو در همان `.next` می‌نویسند و کار هم را خراب می‌کنند.
 *
 * نگهبان هر دو را می‌گیرد: خروجی بیلد تولیدی را پیش از شروع پاک می‌کند و اگر
 * سایت همین پروژه روی همان پورت جواب می‌دهد (از روی /api/health می‌شناسد)، سرور
 * دومی بالا نمی‌آورد و فقط آدرس را نشان می‌دهد. اگر سرور توسعه دیگری روی همین
 * پوشه در حال اجرا باشد که جواب نمی‌دهد، با پیام روشن متوقف می‌شود تا خرابی
 * تکرار نشود. قفل در node_modules/.cache/nodehi/dev-server.json نوشته و با
 * بسته‌شدن سرور پاک می‌شود؛ قفل جامانده از پروسه مرده نادیده گرفته می‌شود.
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const nextDir = join(root, '.next')
// قفل بیرون از .next نگه داشته می‌شود؛ خود Next هنگام بالا آمدن محتوای
// ناشناس .next را پاک می‌کند و هر فایلی که آن‌جا بگذاریم از بین می‌رود.
const lockPath = join(root, 'node_modules', '.cache', 'nodehi', 'dev-server.json')
const nextBin = join(root, 'node_modules', 'next', 'dist', 'bin', 'next')

const args = process.argv.slice(2)
const force = args.includes('--force')
const forwarded = args.filter((value) => value !== '--force')

/** پیام‌های کنسول با قالب ساده، هم‌سبک با scripts/install.mjs */
function info(text) {
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
  if (detail) console.error(`\n${detail}\n`)
  process.exit(1)
}

/** پورت درخواستی از فلگ‌های next یا متغیر محیطی — فقط برای پیام و تشخیص */
function resolvePort() {
  const index = forwarded.findIndex((value) => value === '-p' || value === '--port')
  if (index !== -1 && forwarded[index + 1]) {
    const fromFlag = Number(forwarded[index + 1])
    if (Number.isInteger(fromFlag) && fromFlag > 0) return fromFlag
  }
  const fromEnv = Number(process.env.PORT)
  return Number.isInteger(fromEnv) && fromEnv > 0 ? fromEnv : 3000
}

/** پروسه‌ای با این شناسه هنوز زنده است؟ */
function pidAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code === 'EPERM'
  }
}

/**
 * سایت همین پروژه روی این پورت جواب می‌دهد؟ (بر پایه /api/health)
 *
 * برای تشخیص «سرور قبلی هنوز بالاست» لازم است؛ اگر فقط باز بودن پورت را
 * بسنجیم، هر برنامه دیگری هم «سرور در حال اجرا» به حساب می‌آید.
 */
function devServerAnswers(port) {
  return new Promise((resolve) => {
    const request = http.get(
      { host: '127.0.0.1', port, path: '/api/health', timeout: 2_000 },
      (response) => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => {
          try {
            resolve(response.statusCode === 200 && JSON.parse(body)?.status === 'healthy')
          } catch {
            resolve(false)
          }
        })
      },
    )
    request.once('timeout', () => {
      request.destroy()
      resolve(false)
    })
    request.once('error', () => resolve(false))
  })
}

/** روی این پورت کسی گوش می‌دهد؟ */
function portListening(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' })
    const finish = (value) => {
      socket.destroy()
      resolve(value)
    }
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
    socket.setTimeout(1_000, () => finish(false))
  })
}

function readLock() {
  try {
    return JSON.parse(readFileSync(lockPath, 'utf8'))
  } catch {
    return null
  }
}

function clearLock() {
  try {
    rmSync(lockPath, { force: true })
  } catch {
    // قفل پاک نشد؛ مهم نیست — تشخیص قفل کهنه بر پایه زنده‌بودن پروسه است
  }
}

const port = resolvePort()

// اگر پورت از هیچ‌جا نیامده، صریح به next می‌دهیم؛ وگرنه Next عدد
// نامعتبری مثل PORT=0 را می‌گیرد و روی یک پورت تصادفی بالا می‌آید.
const hasPortFlag = forwarded.some((value) => value === '-p' || value === '--port')
const childArgs = hasPortFlag ? forwarded : ['-p', String(port), ...forwarded]

// ۱) سرور توسعه دیگری روی همین پوشه در حال اجراست؟
//
// فقط به قفل تکیه نمی‌کنیم؛ قفل ممکن است کهنه باشد (پروسه مرده) در حالی
// که خود Next هنوز در یک پروسه فرزند به پورت گوش می‌دهد. در آن حالت اجرای
// سرور دوم، همان خرابی .next را می‌سازد که نگهبان برای پیشگیری از آن است.
if (!force) {
  const lock = readLock()
  if (await portListening(port)) {
    if (await devServerAnswers(port)) {
      console.log(`\n▸ سایت همین حالا روی http://localhost:${port} بالاست — سرور دومی لازم نیست.`)
      console.log('  همان آدرس را در مرورگر باز کنید. برای اجرای دوباره، اول سرور فعلی را ببندید (Ctrl+C).')
      console.log('  اگر عمداً سرور دوم می‌خواهید، از پورت دیگری استفاده کنید: npm run dev -- -p 3001\n')
      process.exit(0)
    }
    fail(
      `پورت ${port} اشغال است و برنامه‌ای که آن‌جا جواب می‌دهد، این سایت نیست.`,
      `اگر همان برنامه لازم نیست ببندید، یا سرور را روی پورت دیگری بالا بیاورید:\n  npm run dev -- -p 3001`,
    )
  }
  if (lock) clearLock()
}

// ۲) خروجی بیلد تولیدی روی پوشه نمانده باشد (BUILD_ID نشانه بیلد است، نه dev)
if (existsSync(join(nextDir, 'BUILD_ID'))) {
  info('خروجی بیلد تولیدی پیدا شد — پاک شد تا با سرور توسعه قاطی نشود')
  rmSync(nextDir, { recursive: true, force: true })
  ok('.next پاک شد (برای بیلد بعدی: npm run build)')
}

if (!existsSync(nextBin)) {
  fail('بسته next در node_modules پیدا نشد.', 'اول `npm install` را اجرا کنید.')
}

const startedAt = new Date().toISOString()
const child = spawn(process.execPath, [nextBin, 'dev', ...childArgs], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})

// قفل فقط برای همین سرور است؛ با بسته‌شدن آن پاک می‌شود
try {
  mkdirSync(dirname(lockPath), { recursive: true })
  writeFileSync(lockPath, JSON.stringify({ pid: child.pid, port, startedAt }, null, 2))
} catch {
  warn('قفل سرور توسعه نوشته نشد؛ محافظت از اجرای دو سرور هم‌زمان فعال نیست.')
}

let closing = false
function close(code) {
  if (closing) return
  closing = true
  clearLock()
  process.exit(code ?? 0)
}

child.on('exit', (code, signal) => close(signal ? 0 : code ?? 0))
child.on('error', (error) => fail('اجرای next با خطا متوقف شد.', String(error)))
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal)
    close(0)
  })
}
