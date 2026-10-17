import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/helpers'

/**
 * Shared action tokens — same hierarchy for dashboard desktop, tablet and mobile.
 * primary: save/approve/create | secondary: editing/navigation/filters
 * subtle: low emphasis action | danger: destructive action | ghost: quiet auxiliary
 */
export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const shared =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap text-center font-semibold ' +
  'border transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out ' +
  'hover:-translate-y-px active:translate-y-0 active:scale-[.98] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-[var(--color-interactive-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-interactive-primary-hover)] hover:shadow-md',
  secondary: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[#C9A989] hover:bg-[#F5EADD]',
  subtle: 'border-[#E7D6C5] bg-[#F8F1E9] text-[#634333] hover:border-[#C9A989] hover:bg-[#EFDDCA]',
  danger: 'border-[#E9B3AB] bg-[#FFF8F6] text-[#A52E28] hover:border-[#CE5448] hover:bg-[#FCE4E0] active:bg-[#F8D6D0]',
  ghost: 'border-transparent bg-transparent text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-10 rounded-lg px-3 text-xs',
  md: 'min-h-11 rounded-xl px-4 text-sm',
  lg: 'min-h-12 rounded-xl px-5 text-sm',
  icon: 'size-11 rounded-xl p-0',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button type={type}
      className={cn(shared, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >{children}</button>
  )
}
