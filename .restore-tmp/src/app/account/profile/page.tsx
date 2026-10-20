import type { Metadata } from 'next'
import { ProfileForm } from '@/components/account/profile-form'
import { buildMetadata } from '@/lib/seo'
import { getCurrentUser } from '@/lib/server/auth/session'
import { toPublicUser } from '@/lib/server/auth/users'

export const metadata: Metadata = buildMetadata({
  title: 'اطلاعات حساب',
  description: 'ویرایش نام، ایمیل و اطلاعات تماس حساب کاربری نودهی.',
  path: '/account/profile',
  noIndex: true,
})

export default async function ProfilePage() {
  // دسترسی پیش از این در layout بررسی شده؛ اینجا فقط برای خواندن نوع لازم است
  const user = await getCurrentUser()
  if (!user) return null

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-extrabold text-ink">اطلاعات حساب</h1>
      <ProfileForm user={toPublicUser(user)} />
    </div>
  )
}
