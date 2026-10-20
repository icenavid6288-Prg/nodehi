import { canMutate, changeOrderStatus, getStaffUser } from '@/lib/server/admin'
import { dispatchAutomationEvent } from '@/lib/server/automation'
import { parseOrderUpdate } from '@/lib/server/admin-orders'
import { writeAuditLog } from '@/lib/server/orders'
import { badRequest, clientIp, jsonError, jsonOk } from '@/lib/server/http'
import { readJson } from '@/lib/server/validation'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * تغییر اطلاعات سفارش توسط کارمند.
 * PATCH /api/admin/orders/:id
 *   { "status": "shipped" }                     ← تغییر وضعیت
 *   { "trackingCode": "1234567890" }            ← ثبت کد رهگیری (رشته خالی = پاک‌کردن)
 *   { "note": "با مشتری هماهنگ شد" }            ← یادداشت داخلی
 *   { "shippingMethod": "تیپاکس — سراسر کشور" }  ← تغییر روش ارسال
 *
 * چند فیلد را می‌توان در یک درخواست فرستاد؛ برای هر تغییرِ واقعی یک رکورد
 * جدا در لاگ حسابرسی ثبت می‌شود تا ردِ «چه کسی چه چیزی را عوض کرد» گم نشود.
 *
 * تفسیر ورودی در `lib/server/admin-orders.ts` انجام می‌شود تا مستقل از Next و
 * دیتابیس قابل آزمون باشد.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!canMutate(staff.role)) {
    return jsonError(403, {
      code: 'read_only_role',
      message: 'نقش شما اجازه تغییر سفارش‌ها را ندارد.',
    })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const order = await prisma.order.findUnique({ where: { id: params.id } })
  if (!order) {
    return jsonError(404, { code: 'not_found', message: 'سفارش یافت نشد.' })
  }

  const { fields, changes, requested } = parseOrderUpdate(body, {
    status: order.status,
    trackingCode: order.trackingCode,
    note: order.note,
    shippingMethod: order.shippingMethod,
  })

  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات ارسالی معتبر نیست.', fields)
  }
  if (!requested) {
    return badRequest('هیچ فیلدی برای تغییر ارسال نشده است.')
  }

  const ip = clientIp(request)
  const userAgent = request.headers.get('user-agent')

  // تغییر وضعیت از مسیر مشترک می‌گذرد تا مهرهای زمانی (paidAt/shippedAt/…) درست ست شوند
  if (changes.status !== undefined) {
    const result = await changeOrderStatus(order.id, changes.status)
    if (!result.ok) {
      return jsonError(404, { code: 'not_found', message: result.message ?? 'سفارش یافت نشد.' })
    }
    await writeAuditLog({
      actorId: staff.id,
      action: 'order.status_changed',
      entity: 'Order',
      entityId: order.id,
      metadata: { from: order.status, to: changes.status, orderNumber: order.orderNumber },
      ip,
      userAgent,
    })

    // اطلاع‌رسانی به اتوماسیون: پیامک «سفارش شما ارسال شد» و کارهای انبار از
    // همین رویداد در n8n ساخته می‌شود. روشن/خاموش بودنش در پنل تنظیم می‌شود.
    void dispatchAutomationEvent({
      event: 'order.status_changed',
      occurredAt: new Date().toISOString(),
      data: {
        orderId: order.orderNumber,
        from: order.status,
        to: changes.status,
        customerPhone: order.customerPhone,
        trackingCode: changes.trackingCode ?? order.trackingCode,
      },
    })
  }

  if (changes.trackingCode !== undefined) {
    await prisma.order.update({
      where: { id: order.id },
      data: { trackingCode: changes.trackingCode },
    })
    await writeAuditLog({
      actorId: staff.id,
      action: 'order.tracking_updated',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        from: order.trackingCode,
        to: changes.trackingCode,
        orderNumber: order.orderNumber,
      },
      ip,
      userAgent,
    })
  }

  if (changes.note !== undefined) {
    await prisma.order.update({ where: { id: order.id }, data: { note: changes.note } })
    await writeAuditLog({
      actorId: staff.id,
      action: 'order.note_updated',
      entity: 'Order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber },
      ip,
      userAgent,
    })
  }

  if (changes.shippingMethod !== undefined) {
    await prisma.order.update({
      where: { id: order.id },
      data: { shippingMethod: changes.shippingMethod },
    })
    await writeAuditLog({
      actorId: staff.id,
      action: 'order.shipping_changed',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        from: order.shippingMethod,
        to: changes.shippingMethod,
        orderNumber: order.orderNumber,
      },
      ip,
      userAgent,
    })
  }

  const updated = await prisma.order.findUnique({
    where: { id: order.id },
    select: {
      orderNumber: true,
      status: true,
      trackingCode: true,
      note: true,
      shippingMethod: true,
    },
  })

  return jsonOk({ order: updated, changed: Object.keys(changes) })
}
