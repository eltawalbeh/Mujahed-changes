import QuantityControl from '@/components/ui/QuantityControl'
import { Trash } from '@phosphor-icons/react'
import { formatJod } from '@/lib/format'
import type { RequestItem } from '@/types/request'
import { useEffect, useState } from 'react'
import { getPublicProductBySlug } from '@/data/catalog'

export default function RequestItemRow({
  item,
  onQuantityChange,
  onRemove,
  compact = false,
}: {
  item: RequestItem
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
  compact?: boolean
}) {
  const lineTotal = (item.observedBasePriceJod ?? 0) * item.quantity
  const [imageUrl,setImageUrl]=useState(item.imageUrl??'')
  const [imageBroken,setImageBroken]=useState(false)
  useEffect(()=>{
    let live=true
    setImageUrl(item.imageUrl??'');setImageBroken(false)
    if(!item.imageUrl && item.productSlug) void getPublicProductBySlug(item.productSlug).then(p=>{
      if(live)setImageUrl(p?.images?.find(image=>image.isPrimary)?.url??p?.images?.[0]?.url??'')
    }).catch(()=>{})
    return()=>{live=false}
  },[item.productSlug,item.imageUrl])

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-3">
      <div className="flex items-start gap-3">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--color-bg)] text-lg text-[var(--color-text-muted)]">
          {imageUrl&&!imageBroken?<img src={imageUrl} alt={item.productName} loading="lazy" className="size-full object-cover" onError={()=>setImageBroken(true)}/>:<span aria-hidden="true">◫</span>}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                {item.productName}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {item.unitLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={onRemove}
              aria-label={`حذف ${item.productName}`}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <Trash size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-[var(--color-text-muted)]">
              {formatJod(lineTotal)}
            </span>
            {compact ? (
              <span className="text-xs text-[var(--color-text-muted)]">
                الكمية: {item.quantity}
              </span>
            ) : (
              <QuantityControl
                value={item.quantity}
                onChange={onQuantityChange}
              />
            )}
          </div>
        </div>
      </div>

      {item.notes ? (
        <p className="mt-2 border-t border-[var(--color-border)] pt-2 text-xs leading-5 text-[var(--color-text-muted)]">
          {item.notes}
        </p>
      ) : null}
    </div>
  )
}
