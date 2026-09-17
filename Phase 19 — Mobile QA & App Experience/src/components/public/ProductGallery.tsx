import { useEffect, useMemo, useState } from 'react'
import type { ProductImage } from '@/types/product'

export default function ProductGallery({ images = [] }: { images?: ProductImage[] }) {
  const gallery = useMemo(() => images.filter((image) => image.url?.trim()), [images])
  const [active, setActive] = useState(0)
  useEffect(() => setActive(0), [gallery.length])
  const image = gallery[active] ?? gallery[0]

  if (!image) return <div className="grid h-[260px] place-items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 text-center text-sm text-[var(--color-text-muted)] md:h-[400px]">لم تتم إضافة صورة لهذا المنتج بعد.</div>

  return <div><div className="h-[260px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-placeholder)] md:h-[400px]"><img src={image.url} alt={image.alt || ''} className="h-full w-full object-cover" /></div>{gallery.length > 1 ? <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{gallery.map((item, index) => <button key={item.id || item.url} type="button" aria-label={`عرض الصورة ${index + 1}`} aria-pressed={index === active} onClick={() => setActive(index)} className={`size-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border-2 md:size-20 ${index === active ? 'border-[var(--color-accent)]' : 'border-transparent'}`}><img src={item.url} alt="" className="h-full w-full object-cover" /></button>)}</div> : null}</div>
}
