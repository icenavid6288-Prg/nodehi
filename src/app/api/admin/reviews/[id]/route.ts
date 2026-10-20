import { prisma } from '@/lib/db'
import { canMutate, getStaffUser } from '@/lib/server/admin'
import { badRequest, clientIp, jsonError, jsonOk } from '@/lib/server/http'
import { writeAuditLog } from '@/lib/server/orders'
import { cleanText, readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = ['pending', 'approved', 'rejected']

/**
 * تأیید یا رد نظر کاربر.
 * PATCH /api/admin/reviews/:id   { "status": "approved" }
 *
 * نظرات پیش از تأیید روی سایت نمایش داده نمی‌شوند، پس این مسیر تنها راه
 * ورود محتوای کاربر به صفحه محصول است و باید محافظت‌شده باشد.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!canMutate(staff.role)) {
    return jsonError(403, { code: 'read_only_role', message: 'نقش شما اجازه بازبینی نظرات را ندارد.' })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const status = cleanText(body.status, 20)
  if (!ALLOWED.includes(status)) {
    return badRequest('وضعیت انتخابی معتبر نیست.', { status: 'وضعیت نامعتبر است.' })
  }

  const existing = await prisma.review.findUnique({ where: { id: params.id } })
  if (!existing) {
    return jsonError(404, { code: 'not_found', message: 'نظر مورد نظر یافت نشد.' })
  }

  const updated = await prisma.review.update({
    where: { id: params.id },
    data: { status },
    select: { id: true, status: true },
  })

  await writeAuditLog({
    actorId: staff.id,
    action: 'review.moderated',
    entity: 'Review',
    entityId: params.id,
    metadata: { from: existing.status, to: status, productSlug: existing.productSlug },
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent'),
  })

  return jsonOk({ review: updated })
}
