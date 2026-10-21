import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

/**
 * خطای رندر در هر کامپوننت، کل درخت React را سفید می‌کرد.
 * این مرز خطا حداقل یک پیام قابل‌فهم و دکمهٔ بازگشت نشان می‌دهد.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // در تولید این خط را می‌توان به سرویس پایش خطا وصل کرد.
    console.error('خطای رابط کاربری:', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-xl font-extrabold">مشکلی در نمایش صفحه پیش آمد</h1>
        <p className="mt-2 text-sm text-ink-muted">
          صفحه را دوباره بارگذاری کنید؛ اگر مشکل ادامه داشت با پشتیبانی تماس بگیرید.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
        >
          بازگشت به خانه
        </button>
      </div>
    )
  }
}
