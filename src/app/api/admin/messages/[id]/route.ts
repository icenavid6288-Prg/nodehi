import { prisma } from '@/lib/db'
import { canMutate, getStaffUser } from '@/lib/server/admin'
import { badRequest, jsonError, jsonOk } from '@/lib/server/http'
import { cleanText, readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = ['new', 'in_progress', 'resolved']

/**
 * تغییر وضعیت پیام تماس با ما.
 * PATCH /api/admin/messages/:id   { "status": "resolved" }
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!canMutate(staff.role)) {
    return jsonError(403, { code: 'read_only_role', message: 'نقش شما اجازه تغییر وضعیت پیام‌ها را ندارد.' })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const status = cleanText(body.status, 20)
  if (!ALLOWED.includes(status)) {
    return badRequest('وضعیت انتخابی معتبر نیست.', { status: 'وضعیت نامعتبر است.' })
  }

  const existing = await prisma.contactMessage.findUnique({ where: { id: params.id } })
  if (!existing) {
    return jsonError(404, { code: 'not_found', message: 'پیام مورد نظر یافت نشد.' })
  }

  const updated = await prisma.contactMessage.update({
    where: { id: params.id },
    data: { status },
    select: { id: true, status: true },
  })

  return jsonOk({ message: updated })
}
