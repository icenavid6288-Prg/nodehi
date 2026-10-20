import type { Metadata } from 'next'
import { AddressManager, type AddressView } from '@/components/account/address-manager'
import { buildMetadata } from '@/lib/seo'
import { getUserAddresses, MAX_ADDRESSES } from '@/lib/server/addresses'
import { getCurrentUser } from '@/lib/server/auth/session'

export const metadata: Metadata = buildMetadata({
  title: 'آدرس‌های من',
  description: 'مدیریت آدرس‌های ارسال در حساب کاربری نودهی.',
  path: '/account/addresses',
  noIndex: true,
})

export default async function AddressesPage() {
  const user = await getCurrentUser()
  // چیدمان حساب کاربری پیش از این صفحه ورود را بررسی کرده است؛ این شرط
  // فقط برای بستن نوع (type narrowing) و دفاع دوم است.
  const rows = user ? await getUserAddresses(user.id) : []

  const addresses: AddressView[] = rows.map((address) => ({
    id: address.id,
    title: address.title,
    receiver: address.receiver,
    phone: address.phone,
    province: address.province,
    city: address.city,
    line: address.line,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
  }))

  return <AddressManager addresses={addresses} max={MAX_ADDRESSES} />
}
