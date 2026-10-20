import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

const fieldBase =
  'w-full rounded-xl border border-surface-border bg-white px-4 text-sm text-ink transition-colors ' +
  'placeholder:text-ink-subtle focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, 'h-11', className)} {...props} />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, 'min-h-28 py-3 leading-6', className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, 'h-11 cursor-pointer pl-3', className)} {...props}>
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export function Checkbox({
  label,
  count,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; count?: number }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors hover:bg-surface-muted',
        className,
      )}
    >
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-surface-border accent-secondary"
        {...props}
      />
      <span className="flex-1">{label}</span>
      {typeof count === 'number' ? (
        <span className="text-xs tabular-nums text-ink-subtle">{count}</span>
      ) : null}
    </label>
  )
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  error?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-subtle">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
