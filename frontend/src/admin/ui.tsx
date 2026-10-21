import type { ReactNode } from 'react'
import { toFa } from '../lib/format'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function AdminCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-surface-border bg-white shadow-card ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'success' | 'danger' | 'accent'
}) {
  const tones = {
    default: 'text-primary',
    success: 'text-success',
    danger: 'text-danger',
    accent: 'text-accent',
  }

  return (
    <AdminCard className="p-4">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${tones[tone]}`}>{toFa(value)}</div>
      {hint && <div className="mt-1 text-[11px] text-ink-subtle">{hint}</div>}
    </AdminCard>
  )
}

const statusLabels: Record<string, string> = {
  pending: 'در انتظار',
  paid: 'پرداخت‌شده',
  processing: 'در حال آماده‌سازی',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغو‌شده',
  approved: 'تأییدشده',
  rejected: 'ردشده',
  new: 'جدید',
}

const statusTones: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-success/10 text-success',
  processing: 'bg-secondary/10 text-secondary-dark',
  shipped: 'bg-blue-50 text-blue-700',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  new: 'bg-amber-50 text-amber-700',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-bold ${
        statusTones[status] ?? 'bg-surface-muted text-ink-muted'
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  )
}

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-lg border border-surface-border px-3 py-1.5 text-xs disabled:opacity-40"
      >
        قبلی
      </button>
      <span className="text-xs text-ink-muted">
        صفحه {toFa(page)} از {toFa(pageCount)}
      </span>
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className="rounded-lg border border-surface-border px-3 py-1.5 text-xs disabled:opacity-40"
      >
        بعدی
      </button>
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-surface-muted p-8 text-center text-sm text-ink-muted">{text}</div>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="rounded-xl bg-danger/10 p-3 text-xs leading-6 text-danger">{message}</p>
}

export function SuccessNote({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="rounded-xl bg-success/10 p-3 text-xs leading-6 text-success">{message}</p>
}

/** نمایش متادیتای لاگ حسابرسی به شکل جفت کلید/مقدار خوانا. */
export function AuditMetadata({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return <span className="text-ink-subtle">—</span>

  const rows: { key: string; value: string }[] = []

  const display = (value: unknown): string => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (Array.isArray(value)) return value.map(display).join('، ')
    return JSON.stringify(value)
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        rows.push({ key: `${key}.${nestedKey}`, value: display(nestedValue) })
      }
      continue
    }
    rows.push({ key, value: display(value) })
  }

  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
      {rows.map((row) => (
        <div key={row.key} className="flex gap-1">
          <dt className="text-ink-subtle">{row.key}:</dt>
          <dd className="font-medium text-ink-muted">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export const orderStatusLabels = statusLabels
