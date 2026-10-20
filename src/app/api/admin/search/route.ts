import { prisma } from '@/lib/db'
import { getCatalog } from '@/lib/server/catalog'
import { ROLE_LABELS } from '@/lib/roles'
import { getStaffUser } from '@/lib/server/admin'
import { clientIp, jsonError, jsonOk, tooManyRequests } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'
import { formatPrice, normalizeSearchText, toPersianDigits } from '@/lib/utils/format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * جست‌وجوی سراسری پنل مدیریت.
 * GET /api/admin/search?q=۰۹۱۲
 *
 * چهار گروه: سفارش‌ها، کاربران، کدهای تخفیف و کالاها. هدف این است که مدیر برای
 * «یافتن سریع» مجبور نباشد حدس بزند کدام صفحه را باز کند.
 *
 * محافظت: فقط کارکنان (operator/accountant/admin). حسابدار هم می‌تواند جست‌وجو
 * کند چون چیزی را تغییر نمی‌دهد؛ این مسیر فقط «خواندن» است.
 */
export async function GET(request: Request) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }

  const url = new URL(request.url)
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 60)

  const limited = rateLimit(`admin-search:${staff.id}:${clientIp(request)}`, {
    limit: 120,
    windowMs: 60_000,
  })
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  // زیر دو نویسه، جست‌وجو عملاً همه رکوردها را برمی‌گرداند؛ بی‌فایده و پرحجم
  if (query.length < 2) {
    return jsonOk({ query, groups: [], count: 0 })
  }

  const [orders, users, coupons] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: query } },
          { customerFirstName: { contains: query } },
          { customerLastName: { contains: query } },
          { customerPhone: { contains: query } },
          { user: { phone: { contains: query } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        customerFirstName: true,
        customerLastName: true,
        user: { select: { firstName: true, lastName: true, phone: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { phone: { contains: query } },
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, phone: true, firstName: true, lastName: true, role: true },
    }),
    prisma.coupon.findMany({
      where: { code: { contains: query.toUpperCase() } },
      take: 5,
      select: { id: true, code: true, percent: true, isActive: true },
    }),
  ])

  // محصولات از دیتابیس می‌آیند و فیلترشان در JS انجام می‌شود — همان
  // نرمال‌سازی جست‌وجوی فروشگاه تا «يخچال» با «یخچال» یکی گرفته شود
  const { products } = await getCatalog()
  const needle = normalizeSearchText(query).toLowerCase()
  const matchedProducts = products
    .filter((product) =>
      `${normalizeSearchText(product.name)} ${normalizeSearchText(product.brand)}`
        .toLowerCase()
        .includes(needle),
    )
    .slice(0, 6)

  const groups = [
    {
      type: 'order',
      label: 'سفارش‌ها',
      items: orders.map((order) => ({
        href: `/admin/orders/${order.id}`,
        label: order.orderNumber,
        meta: `${customerName(order)} — ${formatPrice(order.total)}`,
      })),
    },
    {
      type: 'user',
      label: 'کاربران',
      items: users.map((user) => ({
        href: `/admin/customers/${user.id}`,
        label: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'بدون نام',
        meta: `${toPersianDigits(user.phone)} — ${ROLE_LABELS[user.role] ?? user.role}`,
      })),
    },
    {
      type: 'coupon',
      label: 'کدهای تخفیف',
      items: coupons.map((coupon) => ({
        href: '/admin/coupons',
        label: coupon.code,
        meta: `${toPersianDigits(coupon.percent)}٪ — ${coupon.isActive ? 'فعال' : 'غیرفعال'}`,
      })),
    },
    {
      type: 'product',
      label: 'کالاها',
      items: matchedProducts.map((product) => ({
        href: `/admin/content`,
        label: product.name,
        meta: `${formatPrice(product.price)} — موجودی ${toPersianDigits(product.stock)} عدد`,
      })),
    },
  ].filter((group) => group.items.length > 0)

  return jsonOk({
    query,
    groups,
    count: groups.reduce((sum, group) => sum + group.items.length, 0),
  })
}

/**
 * نام مشتری برای نمایش در نتیجهٔ جست‌وجو.
 *
 * نام پروفایل و نام ثبت‌شده روی سفارش (اسنپ‌شات زمان خرید) معمولاً یکی هستند؛
 * بدون حذف تکراری، «مدیر نودهی مدیر نودهی» در نتیجه دیده می‌شود.
 */
function customerName(order: {
  customerFirstName: string
  customerLastName: string
  user?: { firstName: string | null; lastName: string | null; phone: string } | null
}): string {
  const parts = [
    order.user?.firstName,
    order.user?.lastName,
    order.customerFirstName,
    order.customerLastName,
  ].filter((part): part is string => Boolean(part && part.trim()))

  const unique = [...new Set(parts.map((part) => part.trim()))]
  return unique.join(' ') || order.user?.phone || 'خرید مهمان'
}
