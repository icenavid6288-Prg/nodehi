import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from '../../components/icons'
import { toFa } from '../../lib/format'

export const inputClass =
  'h-10 w-full rounded-xl border border-surface-border bg-white px-3 text-sm outline-none transition focus:border-secondary'

export const textareaClass =
  'w-full rounded-xl border border-surface-border bg-white p-3 text-sm leading-6 outline-none transition focus:border-secondary'

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  processing: 'در حال آماده‌سازی',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغو‌شده',
}

/** وضعیت‌های مقصد مجاز؛ هم‌راستا با AdminOrderController. */
export const ORDER_NEXT_STATUSES: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'پرداخت در محل',
  online: 'پرداخت آنلاین',
  installment: 'اقساطی',
}

const statusTones: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-secondary/10 text-secondary-dark',
  processing: 'bg-sky-50 text-sky-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-danger/10 text-danger',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-danger/10 text-danger',
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-bold ${statusTones[status] ?? 'bg-surface-muted text-ink-muted'}`}>
      {label ?? ORDER_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold">{title}</h1>
        {description && <p className="mt-1 text-xs leading-6 text-ink-muted">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

export function AdminCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-surface-border bg-white ${className}`}>{children}</div>
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="rounded-xl bg-danger/10 p-3 text-xs leading-6 text-danger">{message}</p>
}

export function Notice({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="rounded-xl bg-secondary/10 p-3 text-xs leading-6 text-secondary-dark">{message}</p>
}

export function EmptyState({ message }: { message: string }) {
  return <p className="p-8 text-center text-sm text-ink-muted">{message}</p>
}

export function Pagination({
  page,
  pageCount,
  total,
  onChange,
}: {
  page: number
  pageCount: number
  total: number
  onChange: (page: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-border px-4 py-3 text-xs text-ink-muted">
      <span>{toFa(total)} مورد</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-surface-border px-3 py-1.5 disabled:opacity-40"
        >
          قبلی
        </button>
        <span>
          صفحهٔ {toFa(page)} از {toFa(pageCount)}
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-surface-border px-3 py-1.5 disabled:opacity-40"
        >
          بعدی
        </button>
      </div>
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-primary-dark/40 p-4 py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full rounded-2xl bg-white shadow-float ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-sm font-extrabold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-bold text-ink-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-subtle">{hint}</span>}
    </label>
  )
}
