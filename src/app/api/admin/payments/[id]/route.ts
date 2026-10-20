import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { updateGateway } from '@/lib/server/gateways'
import { badRequest, clientIp, jsonError, jsonOk } from '@/lib/server/http'
import { readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * به‌روزرسانی پیکربندی درگاه پرداخت.
 * PATCH /api/admin/payments/:id
 *   { "isActive": true, "isSandbox": false, "merchantId": "..." }
 *
 * `:id` می‌تواند شناسه رکورد یا `preset:<key>` باشد؛ حالت دوم یعنی ردیف هنوز
 * ساخته نشده و با همین درخواست ساخته می‌شود. این کار پنل را از «اول seed بزن»
 * بی‌نیاز می‌کند.
 *
 * فقط مدیر کل: تغییر درگاه، اثر مستقیم مالی دارد.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!isAdminRole(staff.role)) {
    return jsonError(403, {
      code: 'insufficient_role',
      message: 'تنظیم درگاه‌های پرداخت تنها برای مدیر کل مجاز است.',
    })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const result = await updateGateway(decodeURIComponent(params.id), body, {
    id: staff.id,
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent'),
  })

  if (!result.ok) {
    return badRequest('اطلاعات درگاه معتبر نیست.', result.fields)
  }

  return jsonOk({
    gateway: {
      id: result.gateway?.id,
      key: result.gateway?.key,
      label: result.gateway?.label,
      isActive: result.gateway?.isActive,
      isSandbox: result.gateway?.isSandbox,
      merchantId: result.gateway?.merchantId,
    },
  })
}
