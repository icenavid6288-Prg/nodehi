import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-extrabold sm:text-3xl">درباره نودهی</h1>
        <p className="mt-4 text-sm leading-8 text-ink-muted">
          نودهی یک فروشگاه اینترنتی تخصصی در حوزه لوازم خانگی است؛ از یخچال و ماشین لباسشویی تا تلویزیون و
          کولر گازی. هدف ما ساده است: خرید لوازم خانگی باید مطمئن، شفاف و بدون ریسک باشد.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { title: 'ضمانت اصالت کالا', text: 'همه کالاها اورجینال و دارای گارانتی رسمی هستند.' },
            { title: 'ارسال سریع', text: 'سفارش‌های تهران و کرج در همان روز ارسال می‌شوند.' },
            { title: 'پشتیبانی واقعی', text: 'کارشناسان ما پیش و پس از خرید همراه شما هستند.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-surface-border bg-white p-5">
              <h2 className="text-sm font-extrabold">{item.title}</h2>
              <p className="mt-2 text-xs leading-6 text-ink-muted">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-surface-border bg-white p-6">
          <h2 className="text-lg font-extrabold">چرا نودهی؟</h2>
          <p className="mt-3 text-sm leading-8 text-ink-muted">
            انتخاب لوازم خانگی تصمیم بزرگی است؛ به همین دلیل در نودهی کنار هر کالا مشخصات فنی کامل، راهنمای
            انتخاب و مقایسه مدل‌ها را قرار می‌دهیم تا بدون سردرگمی تصمیم بگیرید. قیمت‌ها شفاف است و هزینه‌های
            پنهان نداریم.
          </p>
          <Link to="/shop" className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
            مشاهده کالاها
          </Link>
        </div>
      </div>
    </div>
  )
}
