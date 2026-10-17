import { supabase } from '@/lib/supabase'
import { toBackendError } from '@/lib/backendError'
import type {
  DashboardCustomerDetail,
  DashboardCustomerFilters,
  DashboardCustomerListItem,
  DashboardHomeData,
  DashboardListResponse,
  DashboardProductDetail,
  DashboardProductFilters,
  DashboardProductListItem,
  DashboardRequestDetail,
  DashboardRequestFilters,
  DashboardRequestListItem,
  DashboardRole,
  DashboardSitePage,
  DashboardProductImportPreview,
  DashboardProductImportResult,
  DashboardProductionAccess,
  DashboardProductionPinCreated,
  DashboardAccessProfile,
} from '@/types/dashboard'
import { defaultSiteContent, defaultSiteContentEn, type SitePageKey } from '@/content/defaultSiteContent'
import type { BulkProductRow } from '@/lib/bulkProducts'
import {
  previewCustomerDetail,
  previewCustomers,
  previewHome,
  previewProductDetail,
  previewProducts,
  previewRequestDetail,
  previewRequests,
  previewRole,
} from './dashboardPreview'

export type DashboardRuntime = {
  mode: 'secure' | 'preview' | 'unauthorized'
  role?: DashboardRole
  access?: DashboardAccessProfile
}

const isDevPreview = import.meta.env.DEV && import.meta.env.VITE_DASHBOARD_PREVIEW === 'true'

export async function getDashboardRuntime(): Promise<DashboardRuntime> {
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    const { data: access, error } = await supabase.rpc('dashboard_my_access')
    if (!error && access && typeof access === 'object') {
      const profile = access as DashboardAccessProfile
      return { mode: 'secure', role: profile.role, access: profile }
    }
  }
  if (isDevPreview) {
    return {
      mode: 'preview',
      role: previewRole,
      access: {
        userId: 'preview-user',
        email: 'preview@chef-mujahed.local',
        displayName: 'مستخدم المعاينة',
        role: previewRole,
        status: 'ACTIVE',
        mustChangePassword: false,
      },
    }
  }
  return { mode: 'unauthorized' }
}

async function secureRpc<T>(
  name: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw toBackendError(error, 'تعذر تنفيذ العملية الداخلية.')
  return data as T
}

export async function getDashboardHome(runtime: DashboardRuntime) {
  if (runtime.mode === 'preview') return previewHome
  return secureRpc<DashboardHomeData>('dashboard_home')
}

export async function listDashboardRequests(
  runtime: DashboardRuntime,
  filters: DashboardRequestFilters = {},
) {
  if (runtime.mode === 'preview') {
    const q = filters.q?.trim().toLowerCase() ?? ''
    let rows = previewRequests.filter((item) => {
      if (filters.status && item.status !== filters.status) return false
      if (filters.paymentStatus && item.payment_status !== filters.paymentStatus) return false
      if (filters.source && item.source !== filters.source) return false
      if (filters.customerType && item.customer_type !== filters.customerType) return false
      if (filters.fulfillmentType && item.fulfillment_type !== filters.fulfillmentType) return false
      return !q || [item.reference, item.customer_label].some((text) => text.toLowerCase().includes(q))
    })
    return {
      role: previewRole,
      items: rows,
      total: rows.length,
      page: 1,
      pageSize: 10,
    } satisfies DashboardListResponse<DashboardRequestListItem>
  }
  return secureRpc<DashboardListResponse<DashboardRequestListItem>>(
    'dashboard_list_requests',
    { payload: filters },
  )
}

export async function getDashboardRequest(
  runtime: DashboardRuntime,
  id: string,
) {
  if (runtime.mode === 'preview') return previewRequestDetail(id)
  return secureRpc<DashboardRequestDetail>('dashboard_get_request', {
    p_request_id: id,
  })
}

export async function updateDashboardRequestStatus(
  runtime: DashboardRuntime,
  id: string,
  status: string,
) {
  if (runtime.mode === 'preview') return previewRequestDetail(id)
  return secureRpc<DashboardRequestDetail>('dashboard_update_request_status', {
    p_request_id: id,
    p_status: status,
  })
}

export async function advanceDashboardManagerOrderStatus(
  runtime:DashboardRuntime,id:string,status:string,
):Promise<DashboardRequestDetail>{
  if(runtime.mode==='preview')return previewRequestDetail(id)
  return secureRpc<DashboardRequestDetail>('dashboard_manager_advance_request',{
    p_request_id:id,p_status:status,
  })
}

export async function updateDashboardPayment(
  runtime: DashboardRuntime,
  id: string,
  status: string,
  method?: string | null,
) {
  if (runtime.mode === 'preview') return previewRequestDetail(id)
  return secureRpc<DashboardRequestDetail>('dashboard_update_payment', {
    p_request_id: id,
    p_status: status,
    p_method: method ?? null,
  })
}

export async function updateDashboardItemDiscount(
  runtime: DashboardRuntime,
  requestId: string,
  itemId: string,
  discount: number,
) {
  if (runtime.mode === 'preview') return previewRequestDetail(requestId)
  return secureRpc<DashboardRequestDetail>('dashboard_update_item_discount', {
    p_request_id: requestId,
    p_item_id: itemId,
    p_discount_amount: discount,
  })
}

export async function addDashboardRequestNote(
  runtime: DashboardRuntime,
  requestId: string,
  body: string,
) {
  if (runtime.mode === 'preview') return previewRequestDetail(requestId)
  return secureRpc<DashboardRequestDetail>('dashboard_add_request_note', {
    p_request_id: requestId,
    p_body: body,
  })
}

export async function linkDashboardRequestCustomer(
  runtime: DashboardRuntime,
  requestId: string,
  customerId: string,
) {
  if (runtime.mode === 'preview') return previewRequestDetail(requestId)
  return secureRpc<DashboardRequestDetail>('dashboard_link_request_customer', {
    p_request_id: requestId,
    p_customer_id: customerId,
  })
}

export async function listDashboardCustomers(
  runtime: DashboardRuntime,
  filters: DashboardCustomerFilters = {},
) {
  if (runtime.mode === 'preview') {
    const q = filters.q?.trim().toLowerCase() ?? ''
    const rows = previewCustomers.filter((item) => {
      if (filters.customerType && item.customer_type !== filters.customerType) return false
      if (!q) return true
      return [item.name, item.company_name, item.phone, item.email]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(q))
    })
    return {
      role: previewRole,
      items: rows,
      total: rows.length,
      page: 1,
      pageSize: 10,
    } satisfies DashboardListResponse<DashboardCustomerListItem>
  }
  return secureRpc<DashboardListResponse<DashboardCustomerListItem>>(
    'dashboard_list_customers',
    { payload: filters },
  )
}

export async function getDashboardCustomer(
  runtime: DashboardRuntime,
  id: string,
) {
  if (runtime.mode === 'preview') return previewCustomerDetail(id)
  return secureRpc<DashboardCustomerDetail>('dashboard_get_customer', {
    p_customer_id: id,
  })
}

export async function addDashboardCustomerNote(
  runtime: DashboardRuntime,
  id: string,
  body: string,
) {
  if (runtime.mode === 'preview') return previewCustomerDetail(id)
  return secureRpc<DashboardCustomerDetail>('dashboard_add_customer_note', {
    p_customer_id: id,
    p_body: body,
  })
}

export async function listDashboardProducts(
  runtime: DashboardRuntime,
  filters: DashboardProductFilters = {},
) {
  if (runtime.mode === 'preview') {
    const q = filters.q?.trim().toLowerCase() ?? ''
    const rows = previewProducts.filter((item) => {
      if (filters.channel && item.channel !== filters.channel) return false
      if (filters.status && item.status !== filters.status) return false
      if (filters.availability && item.availability !== filters.availability) return false
      return !q || [item.name_ar, item.sku]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(q))
    })
    return {
      role: previewRole,
      items: rows,
      total: rows.length,
      page: 1,
      pageSize: 10,
    } satisfies DashboardListResponse<DashboardProductListItem>
  }
  return secureRpc<DashboardListResponse<DashboardProductListItem>>(
    'dashboard_list_products',
    { payload: filters },
  )
}

export type BulkProductAction = 'SHOW' | 'HIDE' | 'CHANNEL' | 'DELETE'
export type BulkProductResult = { changed: number; action: BulkProductAction; results: Array<{id:string;action:string;channel?:string}> }

/** One atomic backend operation — never loop individual product mutations from the UI. */
export async function bulkManageDashboardProducts(
  runtime: DashboardRuntime,
  productIds: string[],
  action: BulkProductAction,
  channel?: 'B2B' | 'B2C',
): Promise<BulkProductResult> {
  if (productIds.length<1 || productIds.length>50) throw new Error('اختر من 1 إلى 50 منتجًا من الصفحة الحالية.')
  if(runtime.mode==='preview') {
    const selection = new Set(productIds)
    for (const product of previewProducts) {
      if (!selection.has(product.id)) continue
      if (action==='SHOW') { product.status='ACTIVE';product.availability='AVAILABLE';product.public_visible=true }
      if (action==='HIDE') { product.status='INACTIVE';product.availability='UNAVAILABLE';product.public_visible=false }
      if (action==='CHANNEL' && channel) product.channel=channel
      if (action==='DELETE') { product.status='ARCHIVED';product.availability='UNAVAILABLE';product.public_visible=false }
    }
    return {changed:productIds.length, action,results:productIds.map(id=>({id,action}))}
  }
  return secureRpc<BulkProductResult>('dashboard_bulk_manage_products',{
    p_product_ids:productIds,p_action:action,p_channel:action==='CHANNEL'?channel:null,
  })
}

export async function getDashboardProduct(
  runtime: DashboardRuntime,
  id: string,
) {
  if (runtime.mode === 'preview') return previewProductDetail(id)
  return secureRpc<DashboardProductDetail>('dashboard_get_product', {
    p_product_id: id,
  })
}

export async function updateDashboardProductBasic(
  runtime: DashboardRuntime,
  id: string,
  payload: Record<string, unknown>,
) {
  if (runtime.mode === 'preview') return previewProductDetail(id)
  return secureRpc<DashboardProductDetail>('dashboard_update_product_basic', {
    p_product_id: id,
    payload,
  })
}

export async function saveDashboardProductUnits(
  runtime: DashboardRuntime,
  id: string,
  payload: Array<Record<string, unknown>>,
) {
  if (runtime.mode === 'preview') return previewProductDetail(id)
  return secureRpc<DashboardProductDetail>('dashboard_save_product_units', {
    p_product_id: id,
    payload,
  })
}

export async function saveDashboardProductCustomization(
  runtime: DashboardRuntime,
  id: string,
  payload: Array<Record<string, unknown>>,
) {
  if (runtime.mode === 'preview') return previewProductDetail(id)
  return secureRpc<DashboardProductDetail>(
    'dashboard_save_product_customization',
    {
      p_product_id: id,
      payload,
    },
  )
}

export async function deleteDashboardProduct(
  runtime: DashboardRuntime,
  id: string,
) {
  if (runtime.mode === 'preview') return { action: 'DELETED' as const, id }
  return secureRpc<{ action: 'DELETED' | 'ARCHIVED'; id: string; name?: string }>(
    'dashboard_delete_product',
    { p_product_id: id },
  )
}


export async function getDashboardSitePage(runtime: DashboardRuntime, pageKey: SitePageKey) {
  if (runtime.mode === 'preview') {
    return {
      role: previewRole,
      pageKey,
      content: structuredClone(defaultSiteContent[pageKey]),
      contentEn: structuredClone(defaultSiteContentEn[pageKey]),
      isPublished: true,
      updatedAt: new Date().toISOString(),
    } satisfies DashboardSitePage
  }
  return secureRpc<DashboardSitePage>('dashboard_get_site_page', { p_page_key: pageKey })
}

export async function updateDashboardSitePage(
  runtime: DashboardRuntime,
  pageKey: SitePageKey,
  content: Record<string, any>,
  contentEn: Record<string, any>,
) {
  if (runtime.mode === 'preview') {
    return {
      role: previewRole,
      pageKey,
      content,
      contentEn,
      isPublished: true,
      updatedAt: new Date().toISOString(),
    } satisfies DashboardSitePage
  }
  return secureRpc<DashboardSitePage>('dashboard_update_site_page_localized', {
    p_page_key: pageKey,
    p_content_ar: content,
    p_content_en: contentEn,
    p_is_published: true,
  })
}

/** Advisory SKU (never reserved): final SKU is assigned atomically by Supabase. */
export async function previewNextProductSku(runtime: DashboardRuntime, channel: 'B2C'|'B2B'): Promise<string> {
  if(runtime.mode==='preview') return 'CM-' + channel + '-0001'
  return secureRpc<string>('dashboard_preview_next_product_sku',{p_channel:channel})
}

export async function createDashboardProduct(
  runtime: DashboardRuntime,
  payload: Record<string, unknown>,
) {
  if (runtime.mode === 'preview') {
    const result = structuredClone(previewProductDetail('preview-product-1'))
    result.product = {
      ...result.product,
      id: 'preview-new-product',
      name_ar: String(payload.nameAr ?? 'منتج جديد'),
      sku: 'CM-' + String(payload.channel ?? 'B2C') + '-0001',
      channel: String(payload.channel ?? 'B2C'),
      status: String(payload.availability ?? 'AVAILABLE') === 'AVAILABLE' ? 'ACTIVE' : 'INACTIVE',
      availability: String(payload.availability ?? 'AVAILABLE'),
    }
    return result
  }
  return secureRpc<DashboardProductDetail>('dashboard_create_product', { payload })
}

export async function previewDashboardProductImport(
  runtime: DashboardRuntime,
  rows: BulkProductRow[],
) {
  if (runtime.mode === 'preview') {
    const previewRows = rows.map((row, index) => {
      const errors: string[] = []
      // Blank SKU means new product: Supabase allocates it on import.
      if (!row.nameAr?.trim()) errors.push('اسم المنتج مطلوب')
      if (!['B2C', 'B2B'].includes(String(row.channel).toUpperCase())) errors.push('اختر قناة واحدة: B2C أو B2B')
      if (!['AVAILABLE', 'UNAVAILABLE'].includes(String(row.availability ?? 'AVAILABLE').toUpperCase())) errors.push('التوفر يجب أن يكون متاحاً أو غير متاح')
      return {
        row: index + 1,
        sku: row.sku?.trim().toUpperCase() || 'تلقائي عند الاستيراد',
        nameAr: row.nameAr?.trim() ?? '',
        channel: String(row.channel ?? '').toUpperCase(),
        availability: String(row.availability ?? 'AVAILABLE').toUpperCase(),
        action: 'CREATE' as const,
        productId: null,
        valid: errors.length === 0,
        errors,
      }
    })
    return {
      role: previewRole,
      rows: previewRows,
      total: previewRows.length,
      valid: previewRows.filter((row) => row.valid).length,
      invalid: previewRows.filter((row) => !row.valid).length,
      creates: previewRows.filter((row) => row.valid).length,
      updates: 0,
    } satisfies DashboardProductImportPreview
  }
  return secureRpc<DashboardProductImportPreview>('dashboard_preview_product_import', {
    payload: { rows },
  })
}

export async function importDashboardProducts(
  runtime: DashboardRuntime,
  rows: BulkProductRow[],
) {
  if (runtime.mode === 'preview') {
    return {
      role: previewRole,
      created: rows.length,
      updated: 0,
      total: rows.length,
      createdProducts: rows.map((row,index)=>({nameAr:row.nameAr,channel:row.channel,sku:'CM-'+row.channel+'-'+String(index+1).padStart(4,'0')})),
    } satisfies DashboardProductImportResult
  }
  return secureRpc<DashboardProductImportResult>('dashboard_import_products', {
    payload: { rows },
  })
}


export async function getDashboardProductionAccess(runtime: DashboardRuntime) {
  if (runtime.mode === 'preview') {
    return {
      role: previewRole,
      hasActivePin: false,
      pin: null,
    } satisfies DashboardProductionAccess
  }
  return secureRpc<DashboardProductionAccess>('dashboard_get_production_access')
}

export async function createDashboardProductionPin(
  runtime: DashboardRuntime,
  label = 'محطة الإنتاج',
) {
  if (runtime.mode === 'preview') {
    return {
      role: previewRole,
      pin: '••••••',
      pinId: 'preview-production-pin',
      label,
      showOnce: true,
    } satisfies DashboardProductionPinCreated
  }
  return secureRpc<DashboardProductionPinCreated>('dashboard_create_production_pin', {
    p_label: label,
  })
}

export async function revokeDashboardProductionPin(
  runtime: DashboardRuntime,
  pinId: string,
) {
  if (runtime.mode === 'preview') return { revoked: true, pinId }
  return secureRpc<{ revoked: true; pinId: string }>('dashboard_revoke_production_pin', {
    p_pin_id: pinId,
  })
}


export async function saveDashboardCustomer(runtime: DashboardRuntime, payload: Record<string, unknown>) {
  if (runtime.mode === 'preview') throw new Error('لا يمكن حفظ العميل في وضع المعاينة.')
  return secureRpc<DashboardCustomerDetail>('dashboard_save_customer', { payload })
}

export async function createDashboardManualRequest(runtime: DashboardRuntime, payload: Record<string, unknown>) {
  if (runtime.mode === 'preview') throw new Error('لا يمكن إنشاء طلب في وضع المعاينة.')
  return secureRpc<DashboardRequestDetail>('dashboard_create_manual_request', { payload })
}


export type DashboardBrandSettings = { logoUrl: string | null; updatedAt?: string }
export async function getDashboardBrandSettings(runtime: DashboardRuntime) { if (runtime.mode === 'preview') return { logoUrl: null } satisfies DashboardBrandSettings; return secureRpc<DashboardBrandSettings>('dashboard_get_brand_settings') }
export async function updateDashboardBrandSettings(runtime: DashboardRuntime, logoUrl: string) { if (runtime.mode === 'preview') return { logoUrl } satisfies DashboardBrandSettings; return secureRpc<DashboardBrandSettings>('dashboard_update_brand_settings', { p_logo_url: logoUrl }) }


export async function markDashboardRequestPersonal(runtime: DashboardRuntime, id: string) {
  if (runtime.mode === 'preview') throw new Error('لا يمكن إعادة تصنيف الطلب في وضع المعاينة.')
  return secureRpc<DashboardRequestDetail>('dashboard_mark_request_personal', { p_request_id: id })
}

export async function updateDashboardOrderDiscount(
  runtime: DashboardRuntime,
  requestId: string,
  type: 'NONE' | 'PERCENT' | 'FIXED',
  value: number,
  reason: string,
) {
  if (runtime.mode === 'preview') return previewRequestDetail(requestId)
  return secureRpc<DashboardRequestDetail>('dashboard_set_order_discount', {
    p_request_id: requestId,
    p_discount_type: type,
    p_discount_value: value,
    p_reason: reason.trim() || null,
  })
}


export type InvoiceAdjustment = {
  id:string; request_id:string; item_id:string|null; revision:number;
  discount_type:'PERCENT'|'FIXED'; discount_value:number; amount_jod:number;
  reason:string; actor_id:string; actor_role:string; actor_name:string;
  created_at:string; balance_after_jod:number; invoice_number:string|null;
}
export type InvoiceAdjustmentSummary = {
  original_total_jod:number; adjustments_total_jod:number; adjusted_balance_jod:number;
  invoice_issued:boolean; payment_status:string; adjustments:InvoiceAdjustment[];
}
export async function getDashboardInvoiceAdjustments(runtime:DashboardRuntime,requestId:string):Promise<InvoiceAdjustmentSummary>{
  if(runtime.mode==='preview') return {original_total_jod:0,adjustments_total_jod:0,adjusted_balance_jod:0,invoice_issued:false,payment_status:'NOT_RECORDED',adjustments:[]}
  return secureRpc<InvoiceAdjustmentSummary>('dashboard_get_invoice_adjustments',{p_request_id:requestId})
}
export async function addDashboardInvoiceAdjustment(
  runtime:DashboardRuntime,requestId:string,type:'PERCENT'|'FIXED',value:number,reason:string,itemId?:string,
):Promise<InvoiceAdjustmentSummary>{
  if(runtime.mode==='preview')throw new Error('سجّل الدخول إلى الإدارة لحفظ خصم استثنائي.')
  return secureRpc<InvoiceAdjustmentSummary>('dashboard_add_invoice_discount_adjustment',{
    p_request_id:requestId,p_discount_type:type,p_discount_value:value,p_reason:reason,
    p_item_id:itemId??null,
  })
}
