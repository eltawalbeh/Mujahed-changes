import { Link } from 'react-router-dom'
import type { Product } from '@/types/product'

export default function B2BProductCard({ product }: { product: Product }) {
  return (
    <article className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-[0_2px_4px_rgba(0,0,0,.06)]">
      <Link to={`/business/product/${product.slug}`} className="block">
        <div className="grid h-[180px] place-items-center bg-[var(--color-bg)]">
          <span className="text-3xl text-[var(--color-text-muted)]" aria-hidden="true">♨</span>
        </div>
        <div className="space-y-2 p-4 text-right">
          <h2 className="text-base font-semibold text-[var(--color-text)]">{product.name}</h2>
          <p className="line-clamp-2 text-[13px] text-[#78716c]">
            {product.shortDescription || 'وصف مختصر لطلب الجملة'}
          </p>
          <p className="text-[13px] text-[var(--color-accent)]">متاح للطلب</p>
          <span className="flex h-9 items-center justify-center rounded-lg bg-[var(--color-text)] text-sm font-medium text-[var(--color-on-primary)]">
            عرض المنتج
          </span>
        </div>
      </Link>
    </article>
  )
}
