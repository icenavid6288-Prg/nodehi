/**
 * نصب خودکار سایت روی هاست.
 *
 * دو ورودی دارد:
 *   • CLI — `npm run setup` (scripts/install.mjs) پیش از آپلود/استقرار اجرا می‌شود.
 *   • وب — مسیر /install و API آن، برای هاست‌هایی که فقط بیلد آماده را اجرا می‌کنند.
 *
 * هر دو از همین ماژول استفاده می‌کنند تا قواعد یکی باشد. نصب وقتی «کامل»
 * است که حساب مدیر ساخته شده باشد؛ تا آن زمان /install باز است و بعد از
 * آن برای همیشه ۴۰۴ می‌شود. اگر متغیر INSTALL_TOKEN تنظیم شده باشد، وب‌نصب
 * علاوه بر باز بودن قفل، آن توکن را هم می‌خواهد — برای هاست عمومی الزامی است.
 */

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { isDbNotReadyError, prisma } from '@/lib/db'

const execFileAsync = promisify(execFile)

/** وضعیت نصب — توسط صفحه /install و API آن گزارش می‌شود */
export interface InstallState {
  /** حساب مدیر ساخته شده و کاتالوگ کاشته شده است؛ /install باید قفل باشد */
  installed: boolean
  /** DATABASE_URL تنظیم شده است */
  databaseConfigured: boolean
  /** جداول دیتابیس ساخته شده‌اند (مهاجرت اجرا شده) */
  migrationsApplied: boolean
  /** دست‌کم یک حساب با نقش admin وجود دارد */
  adminExists: boolean
  /** دست‌کم یک محصول کاشته شده (seed اجرا شده) */
  catalogSeeded: boolean
  /** CLI پریسما روی هاست موجود است — بدون آن نصب وب ممکن نیست */
  prismaCliAvailable: boolean
  /** وب‌نصب توکن INSTALL_TOKEN را هم می‌خواهد (بدون افشای مقدارش) */
  tokenRequired: boolean
}

/** خواندن وضعیت فعلی نصب — خطاهای «دیتابیس هنوز نصب‌نشده» خالی شمرده می‌شوند */
export async function getInstallState(): Promise<InstallState> {
  const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim())

  let migrationsApplied = false
  try {
    // جدول Setting با اولین مهاجرت ساخته می‌شود؛ نبودنش یعنی مهاجرت اجرا نشده
    await prisma.setting.findFirst({ select: { key: true } })
    migrationsApplied = true
  } catch (error) {
    if (!isDbNotReadyError(error)) throw error
  }

  let adminExists = false
  let catalogSeeded = false
  if (migrationsApplied) {
    try {
      adminExists = (await prisma.user.count({ where: { role: 'admin' } })) > 0
      catalogSeeded = (await prisma.product.count()) > 0
    } catch (error) {
      if (!isDbNotReadyError(error)) throw error
    }
  }

  return {
    installed: adminExists && catalogSeeded,
    databaseConfigured,
    migrationsApplied,
    adminExists,
    catalogSeeded,
    prismaCliAvailable: existsSync(path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js')),
    tokenRequired: Boolean(process.env.INSTALL_TOKEN?.trim()),
  }
}

/** گام‌های اجراشده نصب — برای نمایش نتیجه به کاربر */
export interface InstallStep {
  name: string
  ok: boolean
  log: string
}

/** خطای نصب با گام‌های انجام‌شده تا نقطه خطا */
export class InstallError extends Error {
  readonly steps: InstallStep[]

  constructor(message: string, steps: InstallStep[]) {
    super(message)
    this.name = 'InstallError'
    this.steps = steps
  }
}

/** حداکثر طول لاگ هر گام که به کاربر گزارش می‌شود */
const MAX_LOG_CHARS = 4_000

function truncateLog(value: string): string {
  const text = value.trim()
  return text.length > MAX_LOG_CHARS ? `${text.slice(0, MAX_LOG_CHARS)}…` : text
}

/**
 * اجرای نصب: مهاجرت جداول، سپس داده اولیه (کاتالوگ + حساب مدیر).
 *
 * به‌جای اجرای SQL دستی، همان ابزار رسمی پریسما صدا زده می‌شود؛ بنابراین
 * دیتابیس در هر دو حالت SQLite و PostgreSQL درست آماده می‌شود و رکورد
 * مهاجرت‌های اجراشده (برای `migrate deploy` بعدی) نیز ثبت می‌ماند.
 */
export async function runInstall(options: { adminPhone: string }): Promise<InstallStep[]> {
  const root = process.cwd()
  const prismaCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js')
  if (!existsSync(prismaCli)) {
    throw new InstallError(
      'ابزار پریسما روی سرور پیدا نشد. روی هاست `npm install --include=dev` را اجرا کنید یا از نصب CLI (npm run setup) استفاده کنید.',
      [],
    )
  }

  const steps: InstallStep[] = []
  // SEED_ADMIN_PHONE حساب مدیر را می‌سازد؛ همین‌جا از ورودی کاربر تغذیه می‌شود
  const env = { ...process.env, SEED_ADMIN_PHONE: options.adminPhone }

  // ۱) ساخت جداول — migrate deploy فقط مهاجرت‌های اجرا‌نشده را اجرا می‌کند
  // windowsHide لازم است: سرور Node روی ویندوز کنسول ندارد و ساختن فرزند با
  // پنجره کنسول با خطای STATUS_DLL_INIT_FAILED (0xC0000142) شکست می‌خورد.
  try {
    const migrate = await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: root,
      env,
      timeout: 180_000,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    })
    steps.push({ name: 'migrate', ok: true, log: truncateLog(`${migrate.stdout}${migrate.stderr}`) })
  } catch (error) {
    const output = `${(error as { stdout?: string }).stdout ?? ''}${(error as { stderr?: string }).stderr ?? ''}`
    const diag = JSON.stringify({
      code: (error as { code?: unknown }).code,
      signal: (error as { signal?: unknown }).signal,
      status: (error as { status?: unknown }).status,
      errno: (error as { errno?: unknown }).errno,
      syscall: (error as { syscall?: unknown }).syscall,
      nodeOptions: process.env.NODE_OPTIONS ?? null,
      cwd: process.cwd(),
    })
    steps.push({ name: 'migrate', ok: false, log: truncateLog(output || `${String(error)}\n${diag}`) })
    throw new InstallError('اجرای مهاجرت دیتابیس ناموفق بود. جزئیات را در لاگ گام اول ببینید.', steps)
  }

  // ۲) داده اولیه — کاتالوگ، کد تخفیف، حساب مدیر و درگاه‌ها (idempotent)
  try {
    const seed = await execFileAsync(process.execPath, [path.join(root, 'prisma', 'seed.mjs')], {
      cwd: root,
      env,
      timeout: 180_000,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    })
    steps.push({ name: 'seed', ok: true, log: truncateLog(`${seed.stdout}${seed.stderr}`) })
  } catch (error) {
    const output = `${(error as { stdout?: string }).stdout ?? ''}${(error as { stderr?: string }).stderr ?? ''}`
    steps.push({ name: 'seed', ok: false, log: truncateLog(output || String(error)) })
    throw new InstallError('اجرای داده اولیه (seed) ناموفق بود. جزئیات را در لاگ گام دوم ببینید.', steps)
  }

  // راستی‌آزمایی نهایی: نصب واقعاً کامل شده؟
  const state = await getInstallState()
  if (!state.installed) {
    throw new InstallError(
      'مهاجرت و seed اجرا شد ولی حساب مدیر ساخته نشد. شماره واردشده را بررسی و دوباره تلاش کنید.',
      steps,
    )
  }

  return steps
}
