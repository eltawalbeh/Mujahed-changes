export type ProductChannel = 'B2C' | 'B2B' | 'BOTH'
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
export type ProductAvailability = 'AVAILABLE' | 'UNAVAILABLE' | 'SEASONAL' | 'LIMITED'

export type ProductUnit = {
  id: string
  label: string
  channel: ProductChannel
  priceJod?: number
  availability?: ProductAvailability
}

export type ProductImage = {
  id: string
  url: string
  alt?: string
  isPrimary?: boolean
}

export type ProductCustomizationOption = {
  id: string
  label: string
}

export type ProductCustomizationField = {
  id: string
  label: string
  type: 'single' | 'multiple' | 'text'
  required?: boolean
  options?: ProductCustomizationOption[]
}

export type Product = {
  id: string
  name: string
  slug: string
  sku?: string
  status: ProductStatus
  availability: ProductAvailability
  channel: ProductChannel
  basePriceJod?: number
  units: ProductUnit[]
  shortDescription?: string
  longDescription?: string
  categoryId?: string
  customizationFields?: ProductCustomizationField[]
  images?: ProductImage[]
  b2bAllowCustomUnit?: boolean
}
