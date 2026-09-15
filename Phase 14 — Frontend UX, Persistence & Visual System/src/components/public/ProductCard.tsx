import { Link } from 'react-router-dom'
import type { Product } from '@/types/product'
import Badge from '@/components/ui/Badge'
import { formatJod } from '@/lib/format'

export default function ProductCard({ product }: { product: Product }) {
  const price = product.basePriceJod == null ? null : formatJod(product.basePriceJod)

  return (
    <article className="group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative h-[120px] overflow-hidden bg-[var(--color-placeholder)] md:h-auto md:aspect-[31/20]">
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid grid-cols-8 opacity-50">
              {Array.from({ length: 64 }).map((_, index) => (
                <span
                  key={index}
                  className={
                    index % 2 === Math.floor(index / 8) % 2
                      ? 'size-5 bg-white'
                      : 'size-5 bg-[var(--color-placeholder-strong)]'
                  }
                />
              ))}
            </div>
          </div>

          {product.availability === 'AVAILABLE' ? (
            <Badge tone="success" className="absolute right-3 top-3">
              <span className="size-1.5 rounded-full bg-[var(--color-success-text)]" />
              متاح
            </Badge>
          ) : null}
        </div>

        <div className="min-h-[171px] px-3 py-3 md:min-h-[170px] md:p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-bold text-[var(--color-text)] md:text-lg">
              {product.name}
            </h3>
            {price ? (
              <span className="whitespace-nowrap text-sm font-bold text-[var(--color-text-muted)] md:text-base">
                {price}
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-muted)] md:mt-2 md:text-[13px] md:leading-6">
            {product.shortDescription ?? 'وصف مختصر للمنتج'}
          </p>
        </div>
      </Link>
    </article>
  )
}
