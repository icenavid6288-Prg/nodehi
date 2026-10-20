import { prisma } from '@/lib/db'
import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { parseUserUpdate } from '@/lib/server/admin-users'
import { badRequest, clientIp, jsonError, jsonOk } from '@/lib/server/http'
import { writeAuditLog } from '@/lib/server/orders'
import { readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * تغییر کاربر از پنل مدیریت.
 * PATCH /api/admin/users/:id
 *   { "role": "operator" }        ← تغییر نقش (مدیر کل | اپراتور | حسابدار | مشتری)
 *   { "isActive": false }         ← فعال/غیرفعال کردن حساب (حذف نرم)
 *   { "loyaltyPoints": 1200 }     ← اصلاح امتیاز باشگاه مشتریان
 *
 * چرا فقط «مدیر کل»؟ تغییر نقش، سطح دسترسی را عوض می‌کند؛ غیرفعال‌کردن حساب،
 * دسترسی کاربر را قطع می‌کند؛ و امتیاز باشگاه اثر مالی دارد. هر سه حساس‌اند و
 * در لاگ حسابرسی ثبت می‌شوند.
 *
 * دو محافظت مهم (در `lib/server/admin-users.ts` پیاده شده و آزمون دارد):
 *  • نمی‌توان نقش یا وضعیت حساب خود را تغییر داد؛ نتیجه‌اش قفل‌شدن مدیر است.
 *  • «آخرین مدیر کلِ فعال» نه تنزل‌پذیر است و نه غیرفعال‌شدنی، وگرنه هیچ‌کس
 *    دیگر به پنل دسترسی ندارد.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!isAdminRole(staff.role)) {
    return jsonError(403, {
      code: 'insufficient_role',
      message: 'تغییر کاربران تنها برای مدیر کل مجاز است.',
    })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target) {
    return jsonError(404, { code: 'not_found', message: 'کاربر یافت نشد.' })
  }

  // شمارش مدیران کلِ فعال، پیش از اعمال تغییر — مبنای محافظت از آخرین مدیر
  const activeAdminCount = await prisma.user.count({
    where: { role: 'admin', isActive: true },
  })

  const { fields, data, audit, requested } = parseUserUpdate(
    body,
    {
      id: target.id,
      phone: target.phone,
      role: target.role,
      isActive: target.isActive,
      loyaltyPoints: target.loyaltyPoints,
    },
    { actorId: staff.id, activeAdminCount },
  )

  if (Object.keys(fields).length > 0) return badRequest('اطلاعات ارسالی معتبر نیست.', fields)
  if (!requested) return badRequest('هیچ فیلدی برای تغییر ارسال نشده است.')
  if (audit.length === 0) return badRequest('هیچ تغییری برای ثبت وجود ندارد.')

  const updated = await prisma.user.update({
    where: { id: target.id },
    data,
    select: {
      id: true,
      role: true,
      isActive: true,
      loyaltyPoints: true,
      loyaltyTier: true,
    },
  })

  const ip = clientIp(request)
  const userAgent = request.headers.get('user-agent')
  for (const entry of audit) {
    await writeAuditLog({
      actorId: staff.id,
      action: entry.action,
      entity: 'User',
      entityId: target.id,
      metadata: entry.metadata,
      ip,
      userAgent,
    })
  }

  return jsonOk({ user: updated })
}
