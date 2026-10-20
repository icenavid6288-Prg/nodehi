import { prisma } from '@/lib/db'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { couponAuditAction, parseCouponUpdate } from '@/lib/server/admin-coupons'
import { badRequest, clientIp, jsonError, jsonOk } from '@/lib/server/http'
import { writeAuditLog } from '@/lib/server/orders'
import { readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ویرایش کامل کد تخفیف.
 * PATCH /api/admin/coupons/:id
 *   { "isActive": false }                            ← فعال/غیرفعال
 *   { "percent": 20, "maxUses": 500 }                ← ویرایش فیلدها
 *   { "expiresAt": "2026-12-31" }                    ← تعیین انقضا (""=بدون انقضا)
 *
 * چرا ویرایش و نه حذف؟ سابقه کمپین و شمار مصرف باید بماند. کد تخفیف حذف
 * نمی‌شود، فقط غیرفعال می‌ماند. تفسیر ورودی در `lib/server/admin-coupons.ts`
 * انجام می‌شود تا مستقل از Next و دیتابیس آزمون‌پذیر باشد.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!isAdminRole(staff.role)) {
    return jsonError(403, {
      code: 'insufficient_role',
      message: 'تغییر کد تخفیف تنها برای مدیر کل مجاز است.',
    })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const existing = await prisma.coupon.findUnique({ where: { id: params.id } })
  if (!existing) {
    return jsonError(404, { code: 'not_found', message: 'کد تخفیف یافت نشد.' })
  }

  const { fields, data, changed } = parseCouponUpdate(body, {
    label: existing.label,
    percent: existing.percent,
    minSubtotal: existing.minSubtotal,
    maxUses: existing.maxUses,
    usedCount: existing.usedCount,
    startsAt: existing.startsAt,
    expiresAt: existing.expiresAt,
    isActive: existing.isActive,
  })

  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات ارسالی معتبر نیست.', fields)
  }
  if (Object.keys(data).length === 0) {
    return badRequest('هیچ تغییری برای ثبت وجود ندارد.')
  }

  const updated = await prisma.coupon.update({
    where: { id: existing.id },
    data,
    select: {
      id: true,
      code: true,
      label: true,
      percent: true,
      minSubtotal: true,
      maxUses: true,
      usedCount: true,
      startsAt: true,
      expiresAt: true,
      isActive: true,
    },
  })

  await writeAuditLog({
    actorId: staff.id,
    action: couponAuditAction(changed),
    entity: 'Coupon',
    entityId: existing.id,
    metadata: { code: existing.code, changed },
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent'),
  })

  return jsonOk({ coupon: updated, changed })
}
