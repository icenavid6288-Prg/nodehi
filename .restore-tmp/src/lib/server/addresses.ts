/**
 * لایه سرور آدرس‌های کاربر.
 *
 * اصل امنیتی مهم: هر عملیات با `userId` محدود می‌شود. یعنی حتی اگر کسی شناسه
 * آدرس کاربر دیگری را حدس بزند، کوئری چیزی برنمی‌گرداند و امکان تغییر آدرس
 * دیگران (IDOR) وجود ندارد. برای همین از findFirst با شرط مالکیت استفاده
 * می‌کنیم، نه findUnique روی شناسه.
 */

import type { Address } from '@prisma/client'
import { prisma } from '@/lib/db'
import { cleanText, isIranianMobile, isIranianPostalCode, normalizeIranianMobile } from '@/lib/server/validation'

/** سقف منطقی آدرس برای هر کاربر — جلوگیری از انبار کردن داده بی‌حد */
export const MAX_ADDRESSES = 10

export interface AddressInput {
  title: string
  receiver: string
  phone: string
  province: string
  city: string
  line: string
  postalCode: string | null
}

/** اعتبارسنجی و یکسان‌سازی ورودی آدرس — هم برای ساخت و هم ویرایش */
export function parseAddressInput(body: Record<string, unknown>): {
  fields: Record<string, string>
  values: AddressInput
} {
  const title = cleanText(body.title, 40) || 'خانه'
  const receiver = cleanText(body.receiver, 80)
  const phone = normalizeIranianMobile(body.phone)
  const province = cleanText(body.province, 60)
  const city = cleanText(body.city, 60)
  const line = cleanText(body.line, 300)
  const postalCode = cleanText(body.postalCode, 20) || null

  const fields: Record<string, string> = {}
  if (receiver.length < 3) fields.receiver = 'نام گیرنده را کامل وارد کنید.'
  if (!isIranianMobile(phone)) fields.phone = 'شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود.'
  if (province.length < 2) fields.province = 'استان را وارد کنید.'
  if (city.length < 2) fields.city = 'شهر را وارد کنید.'
  if (line.length < 8) fields.line = 'نشانی را کامل‌تر وارد کنید (خیابان، پلاک، واحد).'
  if (postalCode && !isIranianPostalCode(postalCode)) {
    fields.postalCode = 'کد پستی باید ۱۰ رقم باشد.'
  }

  return { fields, values: { title, receiver, phone, province, city, line, postalCode } }
}

export async function getUserAddresses(userId: string): Promise<Address[]> {
  return prisma.address.findMany({
    where: { userId },
    // پیش‌فرض همیشه بالا باشد تا در تسویه حساب اول پیشنهاد شود
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function createAddress(userId: string, values: AddressInput): Promise<Address> {
  const count = await prisma.address.count({ where: { userId } })

  return prisma.address.create({
    data: {
      ...values,
      userId,
      // اولین آدرس کاربر خودبه‌خود پیش‌فرض می‌شود؛ در غیر این صورت چیزی
      // برای پیشنهاد در تسویه حساب وجود ندارد.
      isDefault: count === 0,
    },
  })
}

/**
 * ویرایش آدرس با بررسی مالکیت.
 * خروجی null یعنی آدرس پیدا نشد یا به کاربر دیگری تعلق دارد.
 */
export async function updateAddress(
  userId: string,
  addressId: string,
  values: AddressInput,
): Promise<Address | null> {
  const owned = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!owned) return null

  return prisma.address.update({ where: { id: owned.id }, data: values })
}

/**
 * حذف آدرس.
 * اگر آدرس حذف‌شده پیش‌فرض بوده، قدیمی‌ترین آدرس باقی‌مانده جانشین آن می‌شود
 * تا کاربر بدون آدرس پیش‌فرض نماند.
 */
export async function deleteAddress(userId: string, addressId: string): Promise<boolean> {
  const owned = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!owned) return false

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: owned.id } })

    if (owned.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      })
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } })
      }
    }
  })

  return true
}

/** تعیین آدرس پیش‌فرض — در یک تراکنش تا هرگز دو پیش‌فرض هم‌زمان نداشته باشیم */
export async function setDefaultAddress(userId: string, addressId: string): Promise<boolean> {
  const owned = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!owned) return false

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: owned.id }, data: { isDefault: true } }),
  ])

  return true
}
