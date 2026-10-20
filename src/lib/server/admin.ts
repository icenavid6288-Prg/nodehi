/**
 * لایه سرور پنل مدیریت.
 *
 * اصل امنیتی: هر صفحه و هر API مدیریتی باید از `getStaffUser` رد شود.
 * بررسی نقش در مرورگر (مخفی‌کردن دکمه) امنیت نیست؛ مهاجم می‌تواند مستقیم
 * به مسیر درخواست بزند. بنابراین کنترل دسترسی اینجا و سمت سرور انجام می‌شود.
 */

import type { Prisma, User } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/server/auth/session'
import { isStaffRole } from '@/lib/server/auth/users'
import { getNumberSetting } from '@/lib/server/settings'

/**
 * نقش‌های مدیریتی و سطح دسترسی‌شان — برای توضیح در رابط کاربری.
 *
 * برچسب‌ها در `lib/roles.ts` تعریف شده‌اند چون کامپوننت‌های مرورگری هم به آن‌ها
 * نیاز دارند و نباید مجبور شوند ماژولی که Prisma را وارد می‌کند بکشند.
 * اینجا فقط برای سازگاری مسیرهای موجود بازصادر می‌شود.
 */
export { ROLE_LABELS as STAFF_ROLE_LABELS } from '@/lib/roles'

/**
 * کاربر کارمند جاری، یا null.
 * فقط نقش‌های admin/operator/accountant پذیرفته می‌شوند.
 */
export async function getStaffUser(): Promise<User | null> {
  const user = await getCurrentUser()
  if (!user) return null
  if (!user.isActive) return null
  if (!isStaffRole(user.role)) return null
  return user
}

/** آیا این نقش اجازه ویرایش/تغییر وضعیت دارد؟ (حسابدار فقط گزارش می‌بیند) */
export function canMutate(role: string): boolean {
  return role === 'admin' || role === 'operator'
}

/** آیا این نقش اجازه مدیریت کمپین و کاربران را دارد؟ */
export function isAdminRole(role: string): boolean {
  return role === 'admin'
}

/**
 * برچسب فارسی کنش‌های حسابرسی.
 * مقدارهای ماشین‌خوان در دیتابیس می‌مانند (`order.status_changed`) و ترجمه
 * فقط هنگام نمایش انجام می‌شود؛ اگر برچسب را ذخیره می‌کردیم، تغییر متن نیازمند
 * migration داده بود.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'order.created': 'ثبت سفارش',
  'order.status_changed': 'تغییر وضعیت سفارش',
  'order.tracking_updated': 'ثبت کد رهگیری',
  'order.shipping_changed': 'تغییر روش ارسال',
  'order.note_updated': 'ویرایش یادداشت سفارش',
  'review.moderated': 'بازبینی نظر',
  'product.created': 'افزودن کالا',
  'product.updated': 'ویرایش کالا',
  'product.activated': 'فعال‌سازی کالا',
  'product.deactivated': 'غیرفعال‌سازی کالا (حذف نرم)',
  'product.deleted': 'حذف قطعی کالا',
  'coupon.created': 'ساخت کد تخفیف',
  'coupon.updated': 'ویرایش کد تخفیف',
  'coupon.activated': 'فعال‌سازی کد تخفیف',
  'coupon.deactivated': 'غیرفعال‌سازی کد تخفیف',
  'user.status_changed': 'تغییر وضعیت کاربر',
  'user.role_changed': 'تغییر نقش کاربر',
  'user.loyalty_changed': 'تغییر امتیاز باشگاه مشتریان',
  'contact.status_changed': 'تغییر وضعیت پیام تماس',
  'stock_alert.notified': 'اطلاع‌رسانی موجودی',
  'stock_alert.reopened': 'بازگرداندن هشدار به صف',
}

/** برچسب خوانا برای یک کنش حسابرسی؛ در نبود ترجمه، خودِ مقدار ماشین‌خوان نشان داده می‌شود */
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}

/** برچسب فارسی نوع موجودیت‌ها در لاگ حسابرسی */
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  Product: 'کالا',
  Order: 'سفارش',
  Coupon: 'کد تخفیف',
  Review: 'نظر',
  User: 'کاربر',
  ContactMessage: 'پیام تماس',
  StockAlert: 'هشدار موجودی',
}

export type AuditLogWithActor = Prisma.AuditLogGetPayload<{
  include: { actor: { select: { id: true; phone: true; firstName: true; lastName: true; role: true } } }
}>

/**
 * خواندن لاگ حسابرسی.
 * این جدول نوشته می‌شد ولی هیچ‌جا نمایش داده نمی‌شد؛ یعنی ادعای «همه تغییرها
 * ثبت می‌شود» قابل راستی‌آزمایی نبود. این تابع همان داده را برای پنل می‌آورد.
 */
export async function getAuditLogs(
  options: { entity?: string; entityId?: string; actorId?: string; take?: number } = {},
): Promise<AuditLogWithActor[]> {
  return prisma.auditLog.findMany({
    where: {
      ...(options.entity ? { entity: options.entity } : {}),
      ...(options.entityId ? { entityId: options.entityId } : {}),
      ...(options.actorId ? { actorId: options.actorId } : {}),
    },
    include: {
      actor: { select: { id: true, phone: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: options.take ?? 80,
  })
}

/** نمایش خوانای نام بازیگر یک کنش حسابرسی */
export function auditActorName(actor: AuditLogWithActor['actor']): string {
  if (!actor) return 'سیستم'
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(' ')
  return name || actor.phone
}

export interface OrderStatusCount {
  status: string
  count: number
}

export interface TopProduct {
  productSlug: string
  productName: string
  quantity: number
  revenue: number
}

export interface DashboardStats {
  revenue: number
  orderCount: number
  averageOrderValue: number
  customers: number
  newCustomers30d: number
  statusCounts: OrderStatusCount[]
  topProducts: TopProduct[]
  pendingReviews: number
  newMessages: number
  activeStockAlerts: number
  couponUses: number
}

/** همه آمار داشبورد در یک جا و با موازی‌سازی درخواست‌ها */
export async function getDashboardStats(): Promise<DashboardStats> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000)

  const [
    revenueAgg,
    orderCount,
    customers,
    newCustomers30d,
    statusGroups,
    itemGroups,
    pendingReviews,
    newMessages,
    activeStockAlerts,
    couponAgg,
  ] = await Promise.all([
    // سفارش‌های لغوشده در درآمد حساب نمی‌شوند
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: 'cancelled' } } }),
    prisma.order.count({ where: { status: { not: 'cancelled' } } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.orderItem.groupBy({
      by: ['productSlug', 'productName'],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.review.count({ where: { status: 'pending' } }),
    prisma.contactMessage.count({ where: { status: 'new' } }),
    prisma.stockAlert.count({ where: { notifiedAt: null } }),
    prisma.coupon.aggregate({ _sum: { usedCount: true } }),
  ])

  const revenue = revenueAgg._sum.total ?? 0

  return {
    revenue,
    orderCount,
    averageOrderValue: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
    customers,
    newCustomers30d,
    statusCounts: statusGroups.map((group) => ({
      status: group.status,
      count: group._count._all,
    })),
    topProducts: itemGroups.map((group) => ({
      productSlug: group.productSlug,
      productName: group.productName,
      quantity: group._sum.quantity ?? 0,
      revenue: group._sum.lineTotal ?? 0,
    })),
    pendingReviews,
    newMessages,
    activeStockAlerts,
    couponUses: couponAgg._sum.usedCount ?? 0,
  }
}

// ─────────────────────────────────────────────────────────────────
// تحلیل داشبورد
// ─────────────────────────────────────────────────────────────────

/** یک روز از سری زمانی؛ `date` به شکل YYYY-MM-DD برای کلید و برچسب است */
export interface DailyPoint {
  date: string
  revenue: number
  orders: number
}

export interface DashboardTrend {
  /** ۳۰ روز آخر، از قدیم به جدید */
  days: DailyPoint[]
  currentRevenue: number
  previousRevenue: number
  currentOrders: number
  previousOrders: number
  currentCustomers: number
  previousCustomers: number
  /** بیشترین درآمد یک روز — مقیاس نمودار */
  maxRevenue: number
}

/**
 * سری زمانی ۳۰ روز اخیر به‌همراه دورهٔ ۳۰ روزهٔ پیش از آن برای مقایسه.
 *
 * چرا در JS و نه با `groupBy` دیتابیس؟ SQLite تابع گروه‌بندی بر پایهٔ روز ندارد و
 * نوشتن SQL خام، انتقال آیندهٔ اسکیما به PostgreSQL را شکننده می‌کند. حجم سفارش‌ها
 * در ۶۰ روز برای این کار کوچک است و مجموع‌ها همان چیزی است که در پایین محاسبه می‌شود.
 */
export async function getDashboardTrend(): Promise<DashboardTrend> {
  const dayMs = 86_400_000
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const currentStart = new Date(startOfToday.getTime() - 29 * dayMs)
  const previousStart = new Date(currentStart.getTime() - 30 * dayMs)

  const [orders, currentCustomers, previousCustomers] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: previousStart }, status: { not: 'cancelled' } },
      select: { createdAt: true, total: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: currentStart } } }),
    prisma.user.count({ where: { createdAt: { gte: previousStart, lt: currentStart } } }),
  ])

  // ۳۰ سطل روزانه، از قدیم به جدید — روزهای بی‌سفارش هم صفر می‌مانند تا نمودار
  // حذفشان نکند (حذف روز خالی، دامنهٔ زمانی را دروغین فشرده می‌کند)
  const buckets = new Map<string, DailyPoint>()
  for (let index = 0; index < 30; index += 1) {
    const date = new Date(currentStart.getTime() + index * dayMs)
    const key = dayKey(date)
    buckets.set(key, { date: key, revenue: 0, orders: 0 })
  }

  let currentRevenue = 0
  let previousRevenue = 0
  let previousOrders = 0

  for (const order of orders) {
    if (order.createdAt < currentStart) {
      previousRevenue += order.total
      previousOrders += 1
      continue
    }
    const bucket = buckets.get(dayKey(order.createdAt))
    if (!bucket) continue
    bucket.revenue += order.total
    bucket.orders += 1
    currentRevenue += order.total
  }

  const days = [...buckets.values()]
  const maxRevenue = days.reduce((max, day) => Math.max(max, day.revenue), 0)
  const peak = days.find((day) => day.revenue === maxRevenue && maxRevenue > 0) ?? null
  const currentOrders = days.reduce((sum, day) => sum + day.orders, 0)

  return {
    days,
    currentRevenue,
    previousRevenue,
    currentOrders,
    previousOrders,
    currentCustomers,
    previousCustomers,
    maxRevenue,
  }
}

/** کلید روز میلادی به شکل YYYY-MM-DD — مبنای سطل‌بندی، نه نمایش */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export interface RecentOrderRow {
  id: string
  orderNumber: string
  total: number
  status: string
  createdAt: Date
  customerName: string
  itemCount: number
}

/** تازه‌ترین سفارش‌ها برای میز کار داشبورد */
export async function getRecentOrders(take = 6): Promise<RecentOrderRow[]> {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      items: { select: { quantity: true } },
      user: { select: { firstName: true, lastName: true, phone: true } },
    },
  })

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
    customerName:
      [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') ||
      [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') ||
      order.user?.phone ||
      order.customerPhone ||
      'خرید مهمان',
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
  }))
}

export interface LowStockRow {
  slug: string
  name: string
  stock: number
  brand: string
  price: number
}

export interface LowStockReport {
  threshold: number
  outOfStock: number
  items: LowStockRow[]
}

/**
 * کالاهای نزدیک به اتمام.
 *
 * کاتالوگ در دیتابیس است و این گزارش از همان منبع می‌خواند؛ «آستانه هشدار
 * موجودی کم» هم از تنظیمات پنل می‌آید.
 */
export async function getLowStockReport(): Promise<LowStockReport> {
  // واردکردن تنبل (lazy) تا وابستگی حلقوی با ماژول کاتالوگ ساخته نشود
  const { getCatalog } = await import('@/lib/server/catalog')
  const { products } = await getCatalog()
  const threshold = await getNumberSetting('site.lowStockThreshold', 3)

  const items = products
    .filter((product) => product.stock <= threshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8)
    .map((product) => ({
      slug: product.slug,
      name: product.name,
      stock: product.stock,
      brand: product.brand,
      price: product.price,
    }))

  return {
    threshold,
    outOfStock: products.filter((product) => product.stock <= 0).length,
    items,
  }
}

export interface AdminNavCounts {
  pendingReviews: number
  newMessages: number
  activeStockAlerts: number
  unpaidOnlineOrders: number
  /** کالاهای غیرفعال — «حذف نرم»شده که از فروشگاه بیرون‌اند */
  inactiveProducts: number
}

/** شمارش سبک برای نشان‌های کنار منو — بدون کوئری سنگین داشبورد */
export async function getAdminNavCounts(): Promise<AdminNavCounts> {
  const [pendingReviews, newMessages, activeStockAlerts, unpaidOnlineOrders, inactiveProducts] =
    await Promise.all([
      prisma.review.count({ where: { status: 'pending' } }),
      prisma.contactMessage.count({ where: { status: 'new' } }),
      prisma.stockAlert.count({ where: { notifiedAt: null } }),
      prisma.order.count({ where: { status: 'pending', paymentMethod: 'online' } }),
      prisma.product.count({ where: { isActive: false } }),
    ])

  return { pendingReviews, newMessages, activeStockAlerts, unpaidOnlineOrders, inactiveProducts }
}

/** تغییر وضعیت سفارش با ثبت در لاگ حسابرسی */
export async function changeOrderStatus(
  orderId: string,
  status: string,
): Promise<{ ok: boolean; message?: string }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return { ok: false, message: 'سفارش یافت نشد.' }

  // مهرهای زمانی بر اساس وضعیت جدید ست می‌شوند تا خط زمانی سفارش درست بماند
  const now = new Date()
  const timestamps: Record<string, Partial<Record<'paidAt' | 'shippedAt' | 'deliveredAt' | 'cancelledAt', Date>>> = {
    paid: { paidAt: order.paidAt ?? now },
    processing: { paidAt: order.paidAt ?? now },
    shipped: { shippedAt: order.shippedAt ?? now },
    delivered: { shippedAt: order.shippedAt ?? now, deliveredAt: now },
    cancelled: { cancelledAt: now },
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status, ...(timestamps[status] ?? {}) },
  })

  return { ok: true }
}
