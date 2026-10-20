import Link from 'next/link'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

type Variant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'link'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-light shadow-sm',
  accent: 'bg-accent text-accent-foreground hover:bg-accent-dark shadow-sm',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-dark hover:text-white shadow-sm',
  outline: 'border border-surface-border bg-white text-ink hover:border-primary hover:text-primary',
  ghost: 'text-ink hover:bg-surface-muted',
  link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-5 text-sm rounded-xl gap-2',
  lg: 'h-12 px-7 text-base rounded-xl gap-2',
  icon: 'h-11 w-11 rounded-xl justify-center',
}

const base =
  'inline-flex items-center justify-center font-medium transition-colors duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  ),
)
Button.displayName = 'Button'

export interface ButtonLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  variant?: Variant
  size?: Size
}

/** همان دکمه، اما به‌صورت لینک — برای بهره‌مندی از prefetch نکست */
export function ButtonLink({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonLinkProps) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />
}
