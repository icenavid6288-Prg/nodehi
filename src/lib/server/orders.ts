/**
 * سفارش‌ها روی دیتابیس.
 *
 * این ماژول رکوردهای Prisma را به همان شکلی نگاشت می‌کند که کامپوننت‌های
 * رابط کاربری انتظار دارند (`Order` در lib/data/orders.ts). با این کار
 * صفحات پنل کاربری بدون بازنویسی، از داده واقعی تغذیه می‌شوند.
 */

import type { Order as DbOrder, OrderItem as DbOrderItem, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { Order, OrderStatus, OrderTimelineEntry } from '@/lib/data/orders'

type OrderWithItems = DbOrder & { items: DbOrderItem[] }

/** وضعیت‌های معتبر سفارش — با مقادیر ذخیره‌شده در دیتابیس یکسان است */
const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

function toOrderStatus(value: string): OrderStatus {
  return (ORDER_STATUSES as string[]).includes(value) ? (value as OrderStatus) : 'pending'
}

/**
 * برچسب فارسی روش پرداخت.
 * در دیتابیس مقدار ماشین‌خوان ذخیره می‌شود (online/cod/installment) و ترجمه
 * فقط هنگام نمایش انجام می‌گیرد. اگر برچسب را ذخیره می‌کردیم، تغییر متن
 * نیازمند migration داده بود.
 */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  online: 'پرداخت آنلاین (زرین‌پال)',
  cod: 'پرداخت درب منزل',
  installment: 'خرید اقساطی',
}

export function paymentMethodLabel(value: string): string {
  return PAYMENT_METHOD_LABELS[value] ?? value
}

/**
 * ساخت خط زمانی سفارش از زمان‌های واقعی ثبت‌شده.
 * تاریخ‌های انجام‌نشده با «—» نمایش داده می‌شوند تا با طرح قبلی سازگار بماند.
 */
function buildTimeline(order: OrderWithItems): OrderTimelineEntry[] {
  const iso = (date: Date | null) => (date ? date.toISOString() : '—')
  const done = (date: Date | null) => date !== null

  const steps: OrderTimelineEntry[] = [
    { label: 'ثبت سفارش', date: iso(order.createdAt), done: true },
  ]

  if (order.status === 'cancelled') {
    steps.push({ label: 'لغو سفارش', date: iso(order.cancelledAt), done: done(order.cancelledAt) })
    return steps
  }

  steps.push({ label: 'تأیید پرداخت', date: iso(order.paidAt), done: done(order.paidAt) })
  steps.push({
    label: 'تحویل به شرکت حمل',
    date: iso(order.shippedAt),
    done: done(order.shippedAt),
  })
  steps.push({ label: 'تحویل به مشتری', date: iso(order.deliveredAt), done: done(order.deliveredAt) })

  return steps
}

/** نگاشت سفارش دیتابیس به شکل مصرفی رابط کاربری */
export function mapOrder(order: OrderWithItems): Order {
  return {
    id: order.orderNumber,
    createdAt: order.createdAt.toISOString().slice(0, 10),
    status: toOrderStatus(order.status),
    items: order.items.map((item) => ({
      productSlug: item.productSlug,
      name: item.productName,
      quantity: item.quantity,
      price: item.unitPrice,
    })),
    shippingCost: order.shipping,
    discount: order.discount,
    paymentMethod: paymentMethodLabel(order.paymentMethod),
    shippingMethod: order.shippingMethod,
    trackingCode: order.trackingCode,
    timeline: buildTimeline(order),
  }
}

/** سفارش‌های یک کاربر، تازه‌ترین اول */
export async function getUserOrders(userId: string): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(mapOrder)
}

/** یک سفارش با شماره سفارش و مالکیت کاربر — بررسی مالکیت در سطح رکورد */
export async function getUserOrder(userId: string, orderNumber: string): Promise<Order | null> {
  const row = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: { items: true },
  })
  return row ? mapOrder(row) : null
}

/**
 * نتیجه پیگیری مهمان (بدون ورود به حساب).
 *
 * چرا هم شماره سفارش و هم شماره همراه لازم است؟ شماره سفارش ۶ رقمی است و
 * تنها با آن، هر کسی می‌توانست سفارش دیگران را ببیند. ترکیب این دو، یک
 * راز مشترک بین خریدار و فروشگاه می‌سازد.
 */
export interface TrackedOrder {
  orderNumber: string
  status: OrderStatus
  createdAt: string
  trackingCode: string | null
  timeline: OrderTimelineEntry[]
  total: number
  itemCount: number
  shippingCity: string
  shippingProvince: string
  shippingMethod: string
  paymentMethod: string
}

/** جست‌وجوی سفارش برای پیگیری مهمان — فقط با تطبیق هم‌زمان شماره سفارش و همراه */
export async function findOrderForTracking(
  orderNumber: string,
  phone: string,
): Promise<TrackedOrder | null> {
  const row = await prisma.order.findFirst({
    where: { orderNumber, customerPhone: phone },
    include: { items: true },
  })

  if (!row) return null

  return {
    orderNumber: row.orderNumber,
    status: toOrderStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    trackingCode: row.trackingCode,
    timeline: buildTimeline(row),
    total: row.total,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    shippingCity: row.shippingCity,
    shippingProvince: row.shippingProvince,
    shippingMethod: row.shippingMethod,
    paymentMethod: paymentMethodLabel(row.paymentMethod),
  }
}

/** آمار خلاصه برای پیشخوان کاربر */
export interface OrderSummary {
  totalOrders: number
  activeOrders: number
  totalSpent: number
  lastOrderAt: Date | null
}

export async function getUserOrderSummary(userId: string): Promise<OrderSummary> {
  const rows = await prisma.order.findMany({
    where: { userId, status: { not: 'cancelled' } },
    select: { status: true, total: true, createdAt: true },
  })

  const activeStatuses = ['pending', 'paid', 'processing', 'shipped']

  return {
    totalOrders: rows.length,
    activeOrders: rows.filter((row) => activeStatuses.includes(row.status)).length,
    totalSpent: rows.reduce((sum, row) => sum + row.total, 0),
    lastOrderAt: rows.reduce<Date | null>(
      (latest, row) => (!latest || row.createdAt > latest ? row.createdAt : latest),
      null,
    ),
  }
}

export interface CreateOrderInput {
  userId: string | null
  orderNumber: string
  status: string
  paymentMethod: string
  shippingMethod: string
  couponCode: string | null
  subtotal: number
  discount: number
  shipping: number
  total: number
  customer: {
    firstName: string
    lastName: string
    phone: string
    email?: string | null
    province: string
    city: string
    line: string
    postalCode?: string | null
  }
  items: { productSlug: string; productName: string; unitPrice: number; quantity: number }[]
  idempotencyKey: string | null
  note?: string | null
}

/**
 * ثبت سفارش در یک تراکنش.
 * اقلام همراه سر سفارش در همان تراکنش نوشته می‌شوند تا هرگز سفارشی بدون
 * قلم ثبت نشود (ناسازگاری داده).
 */
export async function createOrder(input: CreateOrderInput) {
  const data: Prisma.OrderCreateInput = {
    orderNumber: input.orderNumber,
    status: input.status,
    paymentMethod: input.paymentMethod,
    shippingMethod: input.shippingMethod,
    couponCode: input.couponCode,
    subtotal: input.subtotal,
    discount: input.discount,
    shipping: input.shipping,
    total: input.total,
    customerFirstName: input.customer.firstName,
    customerLastName: input.customer.lastName,
    customerPhone: input.customer.phone,
    customerEmail: input.customer.email ?? null,
    shippingProvince: input.customer.province,
    shippingCity: input.customer.city,
    shippingLine: input.customer.line,
    shippingPostalCode: input.customer.postalCode ?? null,
    idempotencyKey: input.idempotencyKey,
    note: input.note ?? null,
    ...(input.userId ? { user: { connect: { id: input.userId } } } : {}),
    items: {
      create: input.items.map((item) => ({
        productSlug: item.productSlug,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.unitPrice * item.quantity,
      })),
    },
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.order.create({ data, include: { items: true } })

    // مصرف کد تخفیف در همان تراکنش ثبت می‌شود تا سقف استفاده دور زده نشود
    if (input.couponCode) {
      await tx.coupon.updateMany({
        where: { code: input.couponCode },
        data: { usedCount: { increment: 1 } },
      })
    }

    return created
  })
}

/** تولید شماره سفارش خوانا و یکتا برای مشتری */
export async function generateOrderNumber(): Promise<string> {
  // چند تلاش برای یافتن شماره‌ای که تکراری نباشد
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `ND-${Math.floor(100000 + Math.random() * 899999)}`
    const exists = await prisma.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    })
    if (!exists) return candidate
  }
  // بازگشت قطعی: مهر زمانی، احتمال تکرار را عملاً صفر می‌کند
  return `ND-${Date.now().toString().slice(-8)}`
}

/** ثبت در لاگ حسابرسی */
export async function writeAuditLog(entry: {
  actorId?: string | null
  action: string
  entity: string
  entityId?: string | null
  metadata?: Record<string, unknown>
  ip?: string | null
  userAgent?: string | null
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        // SQLite نوع Json ندارد، پس به رشته تبدیل می‌شود
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
      },
    })
  } catch {
    // شکست در ثبت لاگ نباید عملیات اصلی را متوقف کند
  }
}
