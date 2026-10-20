/**
 * نقش‌های کاربری و برچسب فارسی‌شان.
 *
 * این ماژول عمداً هیچ وابستگی‌ای ندارد (نه Prisma، نه Next) تا هم لایه سرور و
 * هم کامپوننت‌های مرورگری بتوانند از همان فهرست بخوانند. اگر نقش‌ها را در دو
 * جا تعریف می‌کردیم، دیر یا زود از هم جدا می‌افتادند.
 */

/** نقش‌های ممکن؛ مقدارها همان چیزی است که در ستون `User.role` ذخیره می‌شود */
export type UserRole = 'customer' | 'operator' | 'accountant' | 'admin'

/** فهرست نقش‌ها برای فیلتر و انتخابگر */
export const ALL_ROLES: UserRole[] = ['customer', 'operator', 'accountant', 'admin']

/**
 * نقش‌هایی که به پنل مدیریت دسترسی دارند.
 * حسابدار فقط می‌بیند؛ اپراتور و مدیر کل تغییر می‌دهند.
 */
export const STAFF_ROLES: UserRole[] = ['operator', 'accountant', 'admin']

/** برچسب فارسی نقش‌ها برای نمایش در رابط کاربری */
export const ROLE_LABELS: Record<string, string> = {
  admin: 'مدیر کل',
  operator: 'اپراتور',
  accountant: 'حسابدار',
  customer: 'مشتری',
}

/** برچسب خوانا برای نقش ناشناخته — خودِ مقدار خام را برمی‌گرداند */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

/** آیا این مقدار یکی از نقش‌های قابل تخصیص است؟ */
export function isAssignableRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (ALL_ROLES as string[]).includes(value)
}

/** آیا این نقش به پنل مدیریت دسترسی دارد؟ */
export function isStaffRoleValue(role: string): boolean {
  return (STAFF_ROLES as string[]).includes(role)
}

/**
 * آیا این تغییر، دسترسی کاربر به پنل مدیریت را قطع می‌کند؟
 * در انتخابگر نقش برای نمایش هشدار استفاده می‌شود؛ تصمیم نهایی سمت سرور است.
 */
export function revokesStaffAccess(currentRole: string, nextRole: string): boolean {
  return isStaffRoleValue(currentRole) && !isStaffRoleValue(nextRole)
}

/** توضیح یک‌خطی هر نقش — همان چیزی که در انتخابگر نقش نشان داده می‌شود */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'دسترسی کامل: سفارش‌ها، کاربران، کمپین‌ها و مدیریت نقش‌ها',
  operator: 'مدیریت سفارش‌ها، نظرات، پیام‌ها و هشدارهای موجودی',
  accountant: 'فقط مشاهده گزارش‌ها؛ بدون امکان تغییر',
  customer: 'دسترسی به پنل کاربری خود؛ بدون ورود به پنل مدیریت',
}
