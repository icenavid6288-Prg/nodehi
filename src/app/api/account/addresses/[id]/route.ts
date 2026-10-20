import {
  deleteAddress,
  parseAddressInput,
  setDefaultAddress,
  updateAddress,
} from '@/lib/server/addresses'
import { getCurrentUser } from '@/lib/server/auth/session'
import { badRequest, jsonError, jsonOk } from '@/lib/server/http'
import { readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ویرایش آدرس، تعیین آدرس پیش‌فرض.
 * PATCH /api/account/addresses/:id
 *   { title, receiver, phone, province, city, line, postalCode }  → ویرایش
 *   { isDefault: true }                                           → پیش‌فرض
 *
 * مالکیت آدرس پیش از هر تغییری بررسی می‌شود، پس شناسه آدرس کاربر دیگر
 * کار نمی‌کند.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) {
    return jsonError(401, { code: 'unauthorized', message: 'برای تغییر آدرس وارد شوید.' })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  // حالت «تعیین پیش‌فرض» یک عملیات سبک است و نیازی به اعتبارسنجی کامل ندارد
  if (body.isDefault === true) {
    const done = await setDefaultAddress(user.id, params.id)
    if (!done) {
      return jsonError(404, { code: 'not_found', message: 'آدرس مورد نظر یافت نشد.' })
    }
    return jsonOk({ ok: true })
  }

  const { fields, values } = parseAddressInput(body)
  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات آدرس کامل نیست.', fields)
  }

  const address = await updateAddress(user.id, params.id, values)
  if (!address) {
    return jsonError(404, { code: 'not_found', message: 'آدرس مورد نظر یافت نشد.' })
  }

  return jsonOk({ address })
}

/** حذف آدرس کاربر */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) {
    return jsonError(401, { code: 'unauthorized', message: 'برای حذف آدرس وارد شوید.' })
  }

  const removed = await deleteAddress(user.id, params.id)
  if (!removed) {
    return jsonError(404, { code: 'not_found', message: 'آدرس مورد نظر یافت نشد.' })
  }

  return jsonOk({ ok: true })
}
