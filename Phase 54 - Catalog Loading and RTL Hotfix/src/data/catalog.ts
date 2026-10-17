import { supabase } from '@/lib/supabase'
import type {
  Product,
  ProductAvailability,
  ProductChannel,
  ProductCustomizationField,
  ProductStatus,
} from '@/types/product'
import { channelSupportsCustomerType } from '@/domain/product'

export type CatalogCategory = {
  id: string
  label: string
  slug: string
}

type ProductRow = {
  id: string
  name_ar: string
  slug: string
  sku: string | null
  status: string
  availability: string
  channel: string
  base_price_jod: number | null
  category_id: string | null
  short_description_ar: string | null
  long_description_ar: string | null
  b2b_allow_custom_unit?: boolean
  product_units?: Array<{
    id: string
    label_ar: string
    channel: string
    sort_order: number
    price_jod?: number | null
    availability?: string
    is_active?: boolean
  }>
  product_customization_fields?: Array<{
    id: string
    label_ar: string
    field_type: string
    is_required: boolean
    sort_order: number
    product_customization_options?: Array<{
      id: string
      label_ar: string
      sort_order: number
    }>
  }>
  product_images?: Array<{
    id: string
    image_url: string
    alt_ar: string | null
    is_primary: boolean
    sort_order: number
  }>
}

function mapProduct(row: ProductRow): Product {
  const customizationFields: ProductCustomizationField[] =
    row.product_customization_fields
      ?.slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((field) => ({
        id: field.id,
        label: field.label_ar,
        type: field.field_type as ProductCustomizationField['type'],
        required: field.is_required,
        options:
          field.field_type === 'text'
            ? undefined
            : field.product_customization_options
                ?.slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((option) => ({ id: option.id, label: option.label_ar })),
      })) ?? []

  return {
    id: row.id,
    name: row.name_ar,
    slug: row.slug,
    sku: row.sku ?? undefined,
    status: row.status as ProductStatus,
    availability: row.availability as ProductAvailability,
    channel: row.channel as ProductChannel,
    basePriceJod: row.base_price_jod ?? undefined,
    categoryId: row.category_id ?? undefined,
    shortDescription: row.short_description_ar ?? undefined,
    longDescription: row.long_description_ar ?? undefined,
    b2bAllowCustomUnit: row.b2b_allow_custom_unit ?? false,
    units:
      row.product_units
        ?.slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .filter((unit) => unit.is_active !== false)
        .map((unit) => ({
          id: unit.id,
          label: unit.label_ar,
          channel: unit.channel as ProductChannel,
          priceJod: unit.price_jod ?? undefined,
          availability: (unit.availability ?? 'AVAILABLE') as ProductAvailability,
        })) ?? [],
    customizationFields,
    images:
      row.product_images
        ?.slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((image) => ({
          id: image.id,
          url: image.image_url,
          alt: image.alt_ar ?? undefined,
          isPrimary: image.is_primary,
        })) ?? [],
  }
}

const productSelect = `
  id,
  name_ar,
  slug,
  sku,
  status,
  availability,
  channel,
  base_price_jod,
  category_id,
  short_description_ar,
  long_description_ar,
  b2b_allow_custom_unit,
  product_units (
    id,
    label_ar,
    channel,
    sort_order,
    price_jod,
    availability,
    is_active
  ),
  product_customization_fields (
    id,
    label_ar,
    field_type,
    is_required,
    sort_order,
    product_customization_options (
      id,
      label_ar,
      sort_order
    )
  ),
  product_images (
    id,
    image_url,
    alt_ar,
    is_primary,
    sort_order
  )
`

// Never return a stripped-down product as though its missing images/units are real.
// Fetch a small product row first, then hydrate images and selling units in parallel.
const baseSelect = 'id,name_ar,slug,sku,status,availability,channel,base_price_jod,category_id,short_description_ar,long_description_ar,b2b_allow_custom_unit'
const catalogCache = new Map<string, { expires: number; task: Promise<Product[]> }>()
const detailCache = new Map<string, { expires: number; task: Promise<Product | null> }>()

function cached<T>(cache: Map<string, { expires: number; task: Promise<T> }>, key: string, ttl: number, get: () => Promise<T>): Promise<T> {
  const current = cache.get(key)
  if (current && current.expires > Date.now()) return current.task
  const task = get()
  cache.set(key, { expires: Date.now() + ttl, task })
  void task.catch(() => { if (cache.get(key)?.task === task) cache.delete(key) })
  return task
}

async function hydrateProducts(rows: ProductRow[], withCustomization = false): Promise<Product[]> {
  if (!rows.length) return []
  const ids = rows.map((row) => row.id)
  const imageQuery = supabase.from('product_images')
    .select('product_id,id,image_url,alt_ar,is_primary,sort_order')
    .in('product_id', ids).eq('is_active', true)
  const unitQuery = supabase.from('product_units')
    .select('product_id,id,label_ar,channel,sort_order,price_jod,availability,is_active')
    .in('product_id', ids).eq('is_active', true)
  const [images, units, fields] = await Promise.all([
    imageQuery,
    unitQuery,
    withCustomization
      ? supabase.from('product_customization_fields')
          .select('product_id,id,label_ar,field_type,is_required,sort_order,product_customization_options(id,label_ar,sort_order,is_active)')
          .in('product_id', ids).eq('is_active', true)
      : Promise.resolve({data: [], error: null}),
  ])
  if (images.error) throw images.error
  if (units.error) throw units.error
  if (fields.error) throw fields.error

  const allImages = images.data ?? []
  const allUnits = units.data ?? []
  const allFields = fields.data ?? []
  return rows.map((row) => mapProduct({
    ...row,
    product_images: allImages.filter((image) => image.product_id === row.id),
    product_units: allUnits.filter((unit) => unit.product_id === row.id),
    product_customization_fields: allFields.filter((field) => field.product_id === row.id).map((field) => ({
      ...field,
      product_customization_options: (field.product_customization_options ?? []).filter((option) => option.is_active !== false),
    })),
  } as ProductRow))
}

export async function getPublicCategories(): Promise<CatalogCategory[]> {
  try {
    const {data, error} = await supabase.from('categories')
      .select('id,name_ar,slug,sort_order').eq('is_active', true).order('sort_order', {ascending: true})
    if (error) throw error
    return (data ?? []).map((item) => ({ id:item.id, label:item.name_ar, slug:item.slug }))
  } catch {
    // Category chips are optional: an error must not block the product list.
    return []
  }
}

async function getProductsForChannels(channels: ProductChannel[], categoryId?: string): Promise<Product[]> {
  const key = 'listing:' + channels.join(',') + ':' + (categoryId ?? '')
  return cached(catalogCache, key, 25_000, async () => {
    let query = supabase.from('products').select(baseSelect)
      .eq('public_visible', true).eq('status', 'ACTIVE').eq('availability', 'AVAILABLE')
      .in('channel',channels).order('sort_order',{ascending:true})
    if(categoryId) query = query.eq('category_id', categoryId)
    const {data,error}=await query
    if(error) throw error
    return hydrateProducts((data ?? []) as ProductRow[])
  })
}
async function getProductBySlugForChannels(slug:string,channels:ProductChannel[]):Promise<Product|null> {
  const key='detail:' + channels.join(',') + ':' + slug
  return cached(detailCache,key,25_000,async()=>{
    const {data,error}=await supabase.from('products').select(baseSelect)
      .eq('slug',slug).eq('public_visible',true).eq('status','ACTIVE')
      .eq('availability','AVAILABLE').in('channel',channels).maybeSingle()
    if(error)throw error
    if(!data)return null
    const products=await hydrateProducts([data as ProductRow],true)
    return products[0] ?? null
  })
}
export function getPublicProducts(categoryId?:string) {return getProductsForChannels(['B2C','BOTH'],categoryId)}
export function getPublicProductBySlug(slug:string) {return getProductBySlugForChannels(slug,['B2C','BOTH'])}
export function getB2BProducts(categoryId?:string) {return getProductsForChannels(['B2B','BOTH'],categoryId)}
export function getB2BProductBySlug(slug:string) {return getProductBySlugForChannels(slug,['B2B','BOTH'])}
