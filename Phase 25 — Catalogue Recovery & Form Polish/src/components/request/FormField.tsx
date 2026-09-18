import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export function FormField({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}) {
  const errorId = error ? `${props.name ?? props.id ?? 'field'}-error` : undefined

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[var(--color-text)]">
        {label}
      </span>
      <input
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={[
          'h-11 min-w-0 max-w-full rounded-[var(--radius-sm)] border bg-white px-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/60 focus:ring-2 focus:ring-[var(--color-accent)]/30',
          props.type === 'date' || props.type === 'time' ? 'appearance-none text-right [direction:ltr]' : '',
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-[var(--color-border)] focus:border-[var(--color-text-muted)]',
        ].join(' ')}
      />
      {error ? (
        <span id={errorId} role="alert" className="mt-1.5 block text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  )
}

export function TextAreaField({
  label,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
}) {
  const errorId = error ? `${props.name ?? props.id ?? 'textarea'}-error` : undefined

  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-sm font-semibold text-[var(--color-text)]">
          {label}
        </span>
      ) : null}
      <textarea
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={[
          'w-full resize-none rounded-[var(--radius-sm)] border bg-white px-3 py-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/60 focus:ring-2 focus:ring-[var(--color-accent)]/30',
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-[var(--color-border)] focus:border-[var(--color-text-muted)]',
        ].join(' ')}
      />
      {error ? (
        <span id={errorId} role="alert" className="mt-1.5 block text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  )
}
