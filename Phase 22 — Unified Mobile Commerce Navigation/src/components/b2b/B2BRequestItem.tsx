import QuantityControl from '@/components/ui/QuantityControl'
import { Trash } from '@phosphor-icons/react'
import type { RequestItem } from '@/types/request'

export default function B2BRequestItem({
  item,
  onQuantityChange,
  onRemove,
  readOnly = false,
}: {
  item: RequestItem
  onQuantityChange?: (quantity: number) => void
  onRemove?: () => void
  readOnly?: boolean
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-3">
      <div className="flex items-start gap-3" dir="ltr">
        <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-[var(--color-bg)]">♨</div>
        <div dir="rtl" className="min-w-0 flex-1 text-right">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">{item.productName}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.unitLabel}</p>
              {item.customizationLabels?.length ? (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.customizationLabels.join(' · ')}</p>
              ) : null}
            </div>
            {!readOnly && onRemove ? (
              <button type="button" onClick={onRemove} aria-label={`حذف ${item.productName}`} className="grid size-9 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"><Trash size={18} aria-hidden="true" /></button>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">الكمية: {item.quantity}</span>
            {!readOnly && onQuantityChange ? <QuantityControl value={item.quantity} onChange={onQuantityChange} /> : null}
          </div>
        </div>
      </div>
      {item.notes ? <p className="mt-3 border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-text-muted)]">{item.notes}</p> : null}
    </div>
  )
}
