/**
 * نشست ورود بر پایه کوکی امن.
 *
 * طراحی: توکن خام (۳۲ بایت تصادفی) فقط در کوکی مرورگر می‌نشیند و در دیتابیس
 * تنها هش SHA-256 آن ذخیره می‌شود. مزیت: اگر نسخه پشتیبان دیتابیس لو برود،
 * مهاجم نمی‌تواند از هش‌ها کوکی معتبر بسازد.
 *
 * کوکی با httpOnly تنظیم می‌شود تا جاوااسکریپت (و در نتیجه XSS) به آن
 * دسترسی نداشته باشد، و در تولید secure است تا فقط روی HTTPS فرستاده شود.
 */

import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import type { User } from '@prisma/client'
import { isDbNotReadyError, prisma } from '@/lib/db'

/** نام کوکی نشست */
export const SESSION_COOKIE = 'nodehi_session'

/** هش توکن نشست */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function sessionDays(): number {
  const parsed = Number(process.env.AUTH_SESSION_DAYS ?? 30)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30
}

export interface SessionContext {
  userAgent?: string | null
  ip?: string | null
}

/** ساخت نشست تازه و نشاندن کوکی. فقط از Route Handler یا Server Action صدا زده شود. */
export async function createSession(userId: string, context: SessionContext = {}) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + sessionDays() * 86_400_000)

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent: context.userAgent?.slice(0, 300) ?? null,
      ip: context.ip ?? null,
    },
  })

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })

  return { token, expiresAt }
}

/** خواندن کاربر جاری از کوکی نشست. در Server Components و Route Handlers قابل استفاده است. */
export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session
    .findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    })
    .catch((error: unknown) => {
      // دیتابیس هنوز نصب نشده — نشستی هم نمی‌تواند وجود داشته باشد
      if (isDbNotReadyError(error)) return null
      throw error
    })

  if (!session) return null

  // نشست منقضی باید پاک شود تا جدول بی‌دلیل رشد نکند
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }

  if (!session.user.isActive) return null

  return session.user
}

/** بستن نشست جاری: حذف رکورد دیتابیس و پاک‌کردن کوکی */
export async function destroyCurrentSession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined)
  }
  cookies().delete(SESSION_COOKIE)
}

/** بستن همه نشست‌های یک کاربر — برای «خروج از همه دستگاه‌ها» */
export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } })
  cookies().delete(SESSION_COOKIE)
}
