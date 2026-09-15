import { cn } from '@/lib/helpers'
import { useSitePage } from '@/hooks/useSitePage'

export default function BrandLogo({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const content = useSitePage<{ logoUrl?: string }>('footer')

  if (content.logoUrl) {
    return (
      <div className={cn('inline-flex items-center', className)}>
        <img
          src={content.logoUrl}
          alt="الشيف مجاهد"
          className={cn(
            'w-auto object-contain object-center',
            compact ? 'h-8 max-w-[130px]' : 'h-10 max-w-[170px]',
          )}
        />
      </div>
    )
  }

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'font-bold text-[var(--color-text)]',
          compact ? 'text-base' : 'text-xl',
        )}
      >
        الشيف مجاهد
      </span>
      <span
        className={cn(
          'inline-flex items-center justify-center bg-[var(--color-text-muted)] font-bold text-[var(--color-bg)]',
          compact ? 'size-8 rounded-lg text-sm' : 'size-10 rounded-xl text-lg',
        )}
        aria-hidden="true"
      >
        ش
      </span>
    </div>
  )
}
