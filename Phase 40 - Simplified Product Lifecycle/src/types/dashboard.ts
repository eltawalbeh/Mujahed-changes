import type { CustomerType, FulfillmentType, PaymentMethod, PaymentStatus, RequestSource, RequestStatus } from '@/types/request'

export type DashboardRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR'

export type DashboardRequestListItem = {
  id: string
  reference: string
  customer_type: CustomerType
  source: RequestSource
  status: RequestStatus
  payment_status: PaymentStatus
  fulfillment_type: FulfillmentType
  customer_label: string
  assigned_to?: string | null
  requires_reapproval?: boolean
  submitted_at: string
  total_jod: number
}

export type DashboardCustomerListItem = {
  id: string
  customer_type: CustomerType
  name?: string | null
  company_name?: string | null
  phone?: string | null
  email?: string | null
  request_count: number
  last_request_at?: string | null
}

export type DashboardProductListItem = {
  id: string
  name_ar: string
  slug: string
  sku?: string | null
  status: string
  availability: string
  channel: string
  base_price_jod?: number | null
  public_visible: boolean
  sort_order: number
  updated_at: string
  category_id?: string | null
  category_name?: string | null
}

export type DashboardHomeData = {
  role: DashboardRole
  stats: {
    total: number
    new: number
    awaitingConfirmation: number
    approved: number
    preparing: number
    ready: number
  }
  recent: DashboardRequestListItem[]
}

export type DashboardListResponse<T> = {
  role: DashboardRole
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type DashboardRequestDetail = {
  role: DashboardRole
  request: Record<string, any>
  customer?: Record<string, any> | null
  possibleCustomers: Array<Record<string, any>>
  items: Array<Record<string, any>>
  notes: Array<Record<string, any>>
  activity: Array<Record<string, any>>
}

export type DashboardCustomerDetail = {
  role: DashboardRole
  customer: Record<string, any>
  stats: {
    total: number
    completed: number
    active: number
    cancelled: number
  }
  requests: Array<Record<string, any>>
  notes: Array<Record<string, any>>
}

export type DashboardProductDetail = {
  role: DashboardRole
  product: Record<string, any>
  units: Array<Record<string, any>>
  customization: Array<Record<string, any>>
  images: Array<Record<string, any>>
  categories: Array<Record<string, any>>
}

export type DashboardRequestFilters = {
  q?: string
  status?: string
  paymentStatus?: string
  source?: string
  customerType?: string
  fulfillmentType?: string
  page?: number
  pageSize?: number
}

export type DashboardCustomerFilters = {
  q?: string
  customerType?: string
  page?: number
  pageSize?: number
}

export type DashboardProductFilters = {
  q?: string
  channel?: string
  status?: string
  availability?: string
  page?: number
  pageSize?: number
}

export type DashboardSitePage = {
  role: DashboardRole
  pageKey: string
  content: Record<string, any>
  contentEn: Record<string, any>
  isPublished: boolean
  updatedAt: string
}

export type DashboardProductImportPreviewRow = {
  row: number
  sku: string
  nameAr: string
  channel: string
  availability: string
  action: 'CREATE' | 'UPDATE'
  productId?: string | null
  valid: boolean
  errors: string[]
}

export type DashboardProductImportPreview = {
  role: DashboardRole
  rows: DashboardProductImportPreviewRow[]
  total: number
  valid: number
  invalid: number
  creates: number
  updates: number
}

export type DashboardProductImportResult = {
  role: DashboardRole
  created: number
  updated: number
  total: number
}


export type DashboardProductionAccess = {
  role: DashboardRole
  hasActivePin: boolean
  pin?: {
    id: string
    label: string
    createdAt: string
    lastUsedAt?: string | null
  } | null
}

export type DashboardProductionPinCreated = {
  role: DashboardRole
  pin: string
  pinId: string
  label: string
  showOnce: true
}

export type DashboardUserStatus = 'ACTIVE' | 'SUSPENDED'

export type DashboardAccessProfile = {
  userId: string
  email: string
  displayName: string
  role: DashboardRole
  status: DashboardUserStatus
  mustChangePassword: boolean
  createdAt?: string | null
  lastLoginAt?: string | null
}

export type DashboardUserListItem = DashboardAccessProfile

export type DashboardUserListResponse = {
  role: DashboardRole
  items: DashboardUserListItem[]
  total: number
}

export type DashboardUserAdminResult = {
  user?: DashboardUserListItem
  temporaryPassword?: string
  showOnce?: boolean
  userId?: string
}
