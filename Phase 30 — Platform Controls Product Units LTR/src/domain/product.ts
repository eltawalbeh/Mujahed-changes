import type { Product, ProductChannel, ProductUnit } from '@/types/product'
import type { CustomerType } from '@/types/request'

export function productSupportsCustomerType(
  product: Pick<Product, 'channel'>,
  customerType: CustomerType,
) {
  return product.channel === 'BOTH' || product.channel === customerType
}

export function channelSupportsCustomerType(
  channel: ProductChannel,
  customerType: CustomerType,
) {
  return channel === 'BOTH' || channel === customerType
}

export function unitsForCustomerType(
  units: ProductUnit[],
  customerType: CustomerType,
) {
  return units.filter((unit) => channelSupportsCustomerType(unit.channel, customerType) && unit.availability !== 'UNAVAILABLE')
}

export function isProductOrderable(product: Product) {
  return product.status === 'ACTIVE' && product.availability === 'AVAILABLE'
}
