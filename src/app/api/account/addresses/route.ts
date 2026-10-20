import { getCurrentUser } from '@/lib/server/auth/session'
import {
  createAddress,
  getUserAddresses,
  MAX_ADDRESSES,
  parseAddressInput,
} from '@/lib/server/addresses'
import { badRequest, jsonError, jsonOk } from '@/lib/server/http'
import { readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** فهرست آدرس‌های کاربر جاری */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return jsonError(401, { code: 'unauthorized', message: 'برای مشاهده آدرس‌ها وارد شوید.' })
  }

  const addresses = await getUserAddresses(user.id)
  return jsonOk({ addresses })
}

/** افزودن آدرس تازه */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return jsonError(401, { code: 'unauthorized', message: 'برای ثبت آدرس وارد شوید.' })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const { fields, values } = parseAddressInput(body)
  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات آدرس کامل نیست.', fields)
  }

  const existing = await getUserAddresses(user.id)
  if (existing.length >= MAX_ADDRESSES) {
    return jsonError(409, {
      code: 'address_limit',
      message: `حداکثر ${MAX_ADDRESSES} آدرس می‌توانید ذخیره کنید. برای افزودن آدرس تازه، یکی را حذف کنید.`,
    })
  }

  const address = await createAddress(user.id, values)
  return jsonOk({ address }, 201)
}
