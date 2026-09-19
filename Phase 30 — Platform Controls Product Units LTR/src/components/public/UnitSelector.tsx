import type { ProductUnit } from '@/types/product'
import { cn } from '@/lib/helpers'

export default function UnitSelector({
  units,
  selectedId,
  onChange,
}: {
  units: ProductUnit[]
  selectedId: string
  onChange: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {units.map((unit) => {
        const selected = unit.id === selectedId
        return (
          <button
            key={unit.id}
            type="button"
            onClick={() => onChange(unit.id)}
            className={cn(
              'h-11 rounded-[var(--radius-sm)] border text-sm font-medium transition-colors',
              selected
                ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-on-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-text-muted)]',
            )}
          >
            <span>{unit.label}</span>{unit.priceJod != null ? <span dir="ltr" className="mr-1 text-xs opacity-80">{unit.priceJod} JOD</span> : null}
          </button>
        )
      })}
    </div>
  )
}
