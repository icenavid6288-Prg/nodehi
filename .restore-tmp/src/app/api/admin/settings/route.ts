import { revalidatePath } from 'next/cache'
import { canMutate, getStaffUser, isAdminRole } from '@/lib/server/admin'
import { badRequest, clientIp, jsonError, jsonOk } from '@/lib/server/http'
import {
  getSettingFields,
  isEncryptionEnabled,
  SETTING_GROUP_LABELS,
  SETTING_GROUP_ORDER,
  updateSettings,
} from '@/lib/server/settings'
import type { SettingGroup } from '@/lib/server/settings'
import { readJson } from '@/lib/server/validation'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ذخیره تنظیمات یک گروه.
 * PATCH /api/admin/settings   { "group": "sms", "values": { "sms.apiKey": "..." } }
 *
 * ── چرا سطح دسترسی گروه‌به‌گروه است؟ ──
 * متن اعلان و اطلاعات عمومی سایت کار روزمره اپراتور است، ولی کلید API پیامک و
 * کلید امضای وبهوک اعتبارنامه‌اند. پس:
 *   • general و pages → admin | operator
 *   • sms و automation و یکپارچه‌سازی‌ها → فقط admin
 *
 * پس از ذخیره، کش صفحه‌ها تازه می‌شود تا متن اعلان و محتوای صفحه اصلی بدون
 * انتشار دوباره سایت عوض شود.
 */
export async function PATCH(request: Request) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const group = String(body.group ?? '')
  if (!(SETTING_GROUP_ORDER as string[]).includes(group)) {
    return badRequest('گروه تنظیمات شناخته‌شده نیست.', { group: 'گروه نامعتبر است.' })
  }

  const credentialGroup =
    group === 'sms' ||
    group === 'automation' ||
    group === 'snappay' ||
    group === 'digikala' ||
    group === 'torob'
  if (credentialGroup ? !isAdminRole(staff.role) : !canMutate(staff.role)) {
    return jsonError(403, {
      code: 'insufficient_role',
      message: credentialGroup
        ? 'تنظیمات پیامک، اتوماسیون و یکپارچه‌سازی‌ها تنها برای مدیر کل مجاز است.'
        : 'نقش شما اجازه تغییر تنظیمات را ندارد.',
    })
  }

  const values = body.values
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return badRequest('مقادیر تنظیمات باید یک شیء باشند.', { values: 'مقدار نامعتبر است.' })
  }

  const result = await updateSettings(group as SettingGroup, values as Record<string, unknown>, {
    id: staff.id,
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent'),
  })

  if (!result.ok) {
    return badRequest(result.message ?? 'ذخیره تنظیمات ناموفق بود.', result.fields)
  }

  // صفحه‌های بازآورده‌شده، تا متن اعلان و هیرو بلافاصله دیده شود
  revalidatePath('/', 'layout')

  return jsonOk({ group, changed: result.changed ?? [] })
}

/**
 * خواندن یک گروه تنظیمات.
 * GET /api/admin/settings?group=pages
 *
 * مقدارهای حساس هرگز در پاسخ نمی‌آیند؛ فقط «مقدار دارد یا نه».
 */
export async function GET(request: Request) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }

  const group = new URL(request.url).searchParams.get('group') ?? 'general'
  if (!(SETTING_GROUP_ORDER as string[]).includes(group)) {
    return badRequest('گروه تنظیمات شناخته‌شده نیست.')
  }

  const fields = await getSettingFields(group as SettingGroup)
  const rows = await prisma.setting.count({ where: { group } })

  return jsonOk({
    group,
    label: SETTING_GROUP_LABELS[group as SettingGroup],
    rows,
    encryptionEnabled: isEncryptionEnabled(),
    fields,
  })
}
