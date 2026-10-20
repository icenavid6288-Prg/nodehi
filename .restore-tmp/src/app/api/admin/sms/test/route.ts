import { getStaffUser, isAdminRole } from '@/lib/server/admin'
import { badRequest, clientIp, jsonError, jsonOk } from '@/lib/server/http'
import { writeAuditLog } from '@/lib/server/orders'
import { isSmsConfigured, sendSms } from '@/lib/server/sms'
import { isIranianMobile, normalizeIranianMobile, readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ارسال پیامک آزمایشی.
 * POST /api/admin/sms/test   { "phone": "09120000000" }
 *
 * چرا لازم است؟ پیش از این، تنها راه فهمیدن درست بودن پیکربندی پیامک، درخواست
 * کد ورود با یک شماره واقعی بود. با این مسیر، مدیر می‌تواند بدون دست‌زدن به
 * حساب کسی، اتصال را بیازماید و نتیجه را در لاگ ببیند.
 *
 * نتیجه عمداً همیشه ۲۰۰ برمی‌گردد و وضعیت واقعی در بدنه است: خطای سرویس پیامک
 * خرابی درخواست نیست و باید قابل نمایش باشد، نه اینکه مثل خطای اعتبارسنجی دیده شود.
 */
export async function POST(request: Request) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!isAdminRole(staff.role)) {
    return jsonError(403, {
      code: 'insufficient_role',
      message: 'ارسال پیامک آزمایشی تنها برای مدیر کل مجاز است.',
    })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const phone = normalizeIranianMobile(body.phone)
  if (!isIranianMobile(phone)) {
    return badRequest('شماره همراه معتبر وارد کنید.', {
      phone: 'شماره باید ۱۱ رقم و با ۰۹ شروع شود.',
    })
  }

  const configured = await isSmsConfigured()
  const result = await sendSms({
    phone,
    purpose: 'test',
    body: 'پیام آزمایشی نودهی — اگر این پیام را می‌بینید، اتصال پیامک درست کار می‌کند.',
    userId: staff.id,
  })

  await writeAuditLog({
    actorId: staff.id,
    action: 'sms.test_sent',
    entity: 'SmsMessage',
    entityId: null,
    metadata: { phone, delivered: result.delivered, channel: result.channel },
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent'),
  })

  return jsonOk({
    delivered: result.delivered,
    channel: result.channel,
    provider: result.provider,
    configured,
    error: result.error ?? null,
  })
}
