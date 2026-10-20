import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST, price, toFa } from '../lib/format'

export default function Cart() {
  const { lines, subtotal, setQuantity, remove } = useCart()
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0)

  if (lines.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-surface-border bg-white p-10 shadow-card">
          <h1 className="text-xl font-extrabold">سبد خرید شما خالی است</h1>
          <p className="mt-2 text-sm text-ink-muted">برای شروع خرید، محصولات فروشگاه را ببینید.</p>
          <Link to="/shop" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
            رفتن به فروشگاه
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-extrabold">سبد خرید</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {lines.map((line) => (
            <div
              key={line.slug}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-surface-border bg-white p-4"
            >
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-muted">
                {line.image ? (
                  <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-primary/30">{line.name.slice(0, 2)}</span>
                )}
              </div>

              <div className="min-w-40 flex-1">
                <Link to={`/product/${line.slug}`} className="text-sm font-bold hover:text-primary">
                  {line.name}
                </Link>
                <div className="mt-1 text-xs text-ink-subtle">{price(line.price)} تومان</div>
              </div>

              <div className="flex items-center rounded-xl border border-surface-border">
                <button
                  type="button"
                  onClick={() => setQuantity(line.slug, line.quantity - 1)}
                  className="h-9 w-9 text-lg text-ink-muted"
                  aria-label="کاهش تعداد"
                >
                  −
                </button>
                <span className="w-9 text-center text-sm font-bold">{toFa(line.quantity)}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(line.slug, line.quantity + 1)}
                  className="h-9 w-9 text-lg text-ink-muted"
                  aria-label="افزایش تعداد"
                >
                  +
                </button>
              </div>

              <div className="w-28 text-left text-sm font-extrabold text-primary">
                {price(line.price * line.quantity)}
              </div>

              <button
                type="button"
                onClick={() => remove(line.slug)}
                className="text-xs text-danger hover:underline"
              >
                حذف
              </button>
            </div>
          ))}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-surface-border bg-white p-5 shadow-card">
            <h2 className="mb-4 text-sm font-extrabold">خلاصه سفارش</h2>

            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">مبلغ کالاها</dt>
                <dd className="font-bold">{price(subtotal)} تومان</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">هزینه ارسال</dt>
                <dd className="font-bold">{shipping === 0 ? 'رایگان' : `${price(shipping)} تومان`}</dd>
              </div>
              <div className="flex justify-between border-t border-surface-border pt-3 text-base">
                <dt className="font-bold">مبلغ قابل پرداخت</dt>
                <dd className="font-extrabold text-primary">{price(subtotal + shipping)} تومان</dd>
              </div>
            </dl>

            {remaining > 0 && (
              <p className="mt-3 rounded-xl bg-secondary/10 p-3 text-[11px] leading-5 text-secondary-dark">
                {price(remaining)} تومان تا ارسال رایگان باقی مانده است.
              </p>
            )}

            <Link
              to="/checkout"
              className="mt-5 block rounded-xl bg-primary py-3 text-center text-sm font-extrabold text-white hover:bg-primary-light"
            >
              ادامه فرآیند خرید
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
