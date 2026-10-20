import { prisma } from '@/lib/db'
import { canMutate, getStaffUser } from '@/lib/server/admin'
import { badRequest, clientIp, jsonError, jsonOk } from '@/lib/server/http'
import { writeAuditLog } from '@/lib/server/orders'
import { readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * علامت‌گذاری هشدار موجودی به‌عنوان اطلاع‌رسانی‌شده.
 * PATCH /api/admin/stock-alerts/:id   { "notified": true }
 *
 * این جدول فقط صف اطلاع‌رسانی است؛ ارسال واقعی پیامک/ایمیل از مسیر اتوماسیون
 * انجام می‌شود. ثبت اینجا یعنی «کاربر خبر داده شد» تا دوباره پیام نرود.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!canMutate(staff.role)) {
    return jsonError(403, { code: 'read_only_role', message: 'نقش شما اجازه تغییر این صف را ندارد.' })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')
  if (typeof body.notified !== 'boolean') {
    return badRequest('مقدار notified باید منطقی (true/false) باشد.')
  }

  const existing = await prisma.stockAlert.findUnique({ where: { id: params.id } })
  if (!existing) {
    return jsonError(404, { code: 'not_found', message: 'درخواست اطلاع‌رسانی یافت نشد.' })
  }

  const updated = await prisma.stockAlert.update({
    where: { id: params.id },
    data: { notifiedAt: body.notified ? (existing.notifiedAt ?? new Date()) : null },
    select: { id: true, notifiedAt: true },
  })

  await writeAuditLog({
    actorId: staff.id,
    action: body.notified ? 'stock_alert.notified' : 'stock_alert.reopened',
    entity: 'StockAlert',
    entityId: params.id,
    metadata: { productSlug: existing.productSlug },
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent'),
  })

  return jsonOk({ stockAlert: updated })
}
