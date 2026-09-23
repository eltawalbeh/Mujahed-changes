import type { Product } from '@/types/product'
import ProductCard from './ProductCard'
import AnimateIn from '@/components/ui/AnimateIn'

export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
      {products.map((product, index) => (
        <AnimateIn key={product.id} animation="scale-in" delay={index * 80}>
          <ProductCard product={product} />
        </AnimateIn>
      ))}
    </div>
  )
}
