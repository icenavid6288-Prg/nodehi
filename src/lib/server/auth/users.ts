/**
 * کاربران و ورود بر پایه شماره تلفن.
 *
 * در این فروشگاه «ثبت‌نام» و «ورود» یکی هستند: کاربر شماره‌اش را وارد می‌کند،
 * کد را تأیید می‌کند و اگر حساب نداشته باشد خودکار ساخته می‌شود. این رایج‌ترین
 * الگوی فروشگاه‌های ایرانی است و اصطکاک ثبت‌نام را حذف می‌کند.
 */

import type { User } from '@prisma/client'
import { prisma } from '@/lib/db'
import { tierForPoints } from '@/lib/loyalty'
import { isStaffRoleValue } from '@/lib/roles'
import { normalizeIranianMobile } from '@/lib/server/validation'
import type { AuthUser } from '@/types'

/** شکل امن کاربر برای ارسال به مرورگر — هرگز رکورد کامل Prisma فرستاده نمی‌شود */
export type PublicUser = AuthUser

/**
 * آیا این نقش به پنل مدیریت دسترسی دارد؟
 * فهرست نقش‌ها در `lib/roles.ts` است تا فقط یک منبع حقیقت وجود داشته باشد.
 */
export function isStaffRole(role: string): boolean {
  return isStaffRoleValue(role)
}

export function toPublicUser(user: User): PublicUser {
  const first = user.firstName?.trim() || ''
  const last = user.lastName?.trim() || ''
  // اگر نام ثبت نشده باشد، شماره تلفن نمایش داده می‌شود تا کارت کاربر خالی نماند
  const displayName = [first, last].filter(Boolean).join(' ') || user.phone
  return {
    id: user.id,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isAdmin: isStaffRole(user.role),
    loyaltyPoints: user.loyaltyPoints,
    // سطح از روی امتیاز محاسبه می‌شود، نه از ستون ذخیره‌شده.
    // چرا؟ ستون `loyaltyTier` یک کش است و می‌تواند از امتیاز جدا بیفتد؛
    // باگ واقعی: کاربری با صفر امتیاز، در سایدبار «طلایی» و در صفحه باشگاه
    // «برنزی» نمایش داده می‌شد. `lib/loyalty.ts` تنها منبع حقیقت است.
    loyaltyTier: tierForPoints(user.loyaltyPoints).name,
    displayName,
    // خالی می‌ماند اگر نامی ثبت نشده باشد تا رابط کاربری به‌جای حرف اول
    // شماره (مثلاً «۰») یک آیکون کاربر نمایش دهد.
    initial: first.slice(0, 1),
    createdAt: user.createdAt.toISOString(),
  }
}

/**
 * یافتن یا ساختن کاربر با شماره همراه.
 * شماره تأیید‌شده تلقی می‌شود چون این تابع تنها پس از تأیید موفق کد صدا زده می‌شود.
 */
export async function findOrCreateUserByPhone(phoneRaw: string): Promise<User> {
  const phone = normalizeIranianMobile(phoneRaw)

  const existing = await prisma.user.findUnique({ where: { phone } })
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { phoneVerifiedAt: existing.phoneVerifiedAt ?? new Date(), lastLoginAt: new Date() },
    })
  }

  return prisma.user.create({
    data: { phone, phoneVerifiedAt: new Date(), lastLoginAt: new Date(), role: 'customer' },
  })
}

/** به‌روزرسانی پروفایل کاربر با اعتبارسنجی‌شده در لایه API */
export async function updateUserProfile(
  userId: string,
  data: { firstName?: string | null; lastName?: string | null; email?: string | null },
): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data })
}
