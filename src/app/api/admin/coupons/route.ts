import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { normalizeCouponCode } from '@/lib/commerce'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { badRequest, clientIp, jsonError, jsonOk } from '@/lib/server/http'
import { writeAuditLog } from '@/lib/server/orders'
import { cleanText, readJson, toPositiveInt } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ساخت کد تخفیف تازه.
 * POST /api/admin/coupons
 *
 * فقط «مدیر کل» اجازه ساخت کمپین دارد. اپراتور می‌تواند سفارش‌ها را مدیریت کند
 * اما تعریف تخفیف، اثر مستقیم مالی دارد و نیازمند سطح دسترسی بالاتر است.
 */
export async function POST(request: Request) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!isAdminRole(staff.role)) {
    return jsonError(403, {
      code: 'insufficient_role',
      message: 'ساخت کد تخفیف تنها برای مدیر کل مجاز است.',
    })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const code = normalizeCouponCode(cleanText(body.code, 40))
  const label = cleanText(body.label, 120)
  const percent = toPositiveInt(body.percent)
  const minSubtotal = toPositiveInt(body.minSubtotal)
  const maxUses = toPositiveInt(body.maxUses)

  const fields: Record<string, string> = {}
  // الگوی ساده و امن: حروف لاتین و رقم، تا در URL و پیامک مشکلی نباشد
  if (!/^[A-Z0-9]{3,20}$/.test(code)) {
    fields.code = 'کد باید ۳ تا ۲۰ نویسه لاتین یا رقم باشد.'
  }
  if (label.length < 3) fields.label = 'توضیح کد را کامل‌تر وارد کنید.'
  if (percent === null || percent > 90) fields.percent = 'درصد تخفیف باید بین ۱ تا ۹۰ باشد.'

  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات کد تخفیف کامل نیست.', fields)
  }

  try {
    const created = await prisma.coupon.create({
      data: {
        code,
        label,
        percent: percent as number,
        minSubtotal: minSubtotal,
        maxUses: maxUses,
        isActive: true,
      },
    })

    await writeAuditLog({
      actorId: staff.id,
      action: 'coupon.created',
      entity: 'Coupon',
      entityId: created.id,
      metadata: { code, percent },
      ip: clientIp(request),
      userAgent: request.headers.get('user-agent'),
    })

    return jsonOk({ coupon: { id: created.id, code: created.code } }, 201)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return badRequest('این کد تخفیف از قبل وجود دارد.', { code: 'این کد تکراری است.' })
    }
    throw error
  }
}
