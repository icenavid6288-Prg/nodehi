import type { Metadata } from 'next'
import { TrackForm } from '@/components/order/track-form'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'پیگیری سفارش',
  description:
    'وضعیت سفارش خود را با شماره سفارش و شماره همراه پیگیری کنید. مراحل پردازش، ارسال و کد رهگیری مرسوله نودهی.',
  path: '/track',
})

export default function TrackPage({
  searchParams,
}: {
  searchParams: { order?: string }
}) {
  const orderNumber = (searchParams.order ?? '').trim().toUpperCase()
  const initialOrderNumber = /^ND-\d{6,}$/.test(orderNumber) ? orderNumber : ''

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ name: 'پیگیری سفارش', path: '/track' }]} />

      <header className="mx-auto mt-6 max-w-2xl text-center">
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">پیگیری سفارش</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink-muted">
          شماره سفارش و شماره همراهی که هنگام خرید وارد کرده‌اید را بنویسید تا وضعیت لحظه‌ای سفارش، مراحل ارسال و
          کد رهگیری مرسوله را ببینید. نیازی به ورود به حساب نیست.
        </p>
      </header>

      <div className="mx-auto mt-6 max-w-2xl">
        <TrackForm initialOrderNumber={initialOrderNumber} />
      </div>
    </div>
  )
}
