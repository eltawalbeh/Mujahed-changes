import type { FulfillmentType } from '@/types/request'
import { cn } from '@/lib/helpers'

export default function FulfillmentToggle({
  value,
  onChange,
}: {
  value: FulfillmentType
  onChange: (value: FulfillmentType) => void
}) {
  const options: Array<{ value: FulfillmentType; label: string }> = [
    { value: 'DELIVERY', label: 'توصيل للمنزل' },
    { value: 'COLLECTION', label: 'استلام من المطبخ' },
  ]

  return (
    <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-xl border border-transparent bg-[var(--color-bg)] p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-11 min-w-0 rounded-[10px] px-2 text-sm transition-[background-color,box-shadow,color] duration-200',
              active
                ? 'bg-[var(--color-surface)] font-bold text-[var(--color-text)] shadow-[0_2px_3px_rgba(29,23,20,.07)]'
                : 'font-medium text-[var(--color-text-muted)]',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
