import { retryAutomationEvent } from '@/lib/server/automation'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { clientIp, jsonError, jsonOk } from '@/lib/server/http'
import { writeAuditLog } from '@/lib/server/orders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ارسال دوباره یک رویداد اتوماسیون.
 * POST /api/admin/automation/:id/retry
 *
 * بدنه ذخیره‌شده عیناً دوباره فرستاده می‌شود، پس امضا و شناسه رویداد همان
 * قبلی می‌ماند و سمت n8n پردازش تکراری رخ نمی‌دهد.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!isAdminRole(staff.role)) {
    return jsonError(403, {
      code: 'insufficient_role',
      message: 'ارسال دوباره رویداد تنها برای مدیر کل مجاز است.',
    })
  }

  const result = await retryAutomationEvent(params.id)
  if (!result) {
    return jsonError(404, { code: 'not_found', message: 'رویداد یافت نشد.' })
  }

  await writeAuditLog({
    actorId: staff.id,
    action: 'automation.retried',
    entity: 'AutomationEvent',
    entityId: params.id,
    metadata: { status: result.status },
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent'),
  })

  return jsonOk({
    status: result.status,
    responseStatus: result.responseStatus ?? null,
    error: result.error ?? null,
  })
}
