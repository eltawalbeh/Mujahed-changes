export type CustomerType = 'B2C' | 'B2B'
export type RequestSource = 'WEBSITE' | 'WHATSAPP' | 'INSTAGRAM' | 'PHONE' | 'WALK_IN' | 'OTHER'
export type FulfillmentType = 'DELIVERY' | 'COLLECTION'

export type RequestStatus =
  | 'NEW'
  | 'CONTACT_REQUIRED'
  | 'AWAITING_CONFIRMATION'
  | 'APPROVED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED'

export type PaymentStatus =
  | 'NOT_RECORDED'
  | 'PENDING'
  | 'PAID'
  | 'CASH_ON_DELIVERY'
  | 'MONTHLY_B2B_ACCOUNT'

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CLIQ'
  | 'MOBILE_WALLET'
  | 'B2B_MONTHLY_ACCOUNT'

export type RequestItem = {
  id: string
  productId: string
  productSlug: string
  productName: string
  quantity: number
  unitId?: string
  unitLabel: string
  imageUrl?: string
  customUnit?: string
  observedBasePriceJod?: number
  customization?: Record<string, string | string[]>
  customizationLabels?: string[]
  notes?: string
  addedAt: string
}

export type B2CCustomerDraft = {
  name: string
  phone: string
  email?: string
}

export type B2BCompanyDraft = {
  companyName: string
  contactName: string
  phone: string
  email?: string
}

export type FulfillmentDraft = {
  type: FulfillmentType
  address?: string
  locationNotes?: string
  preferredDate?: string
  preferredTime?: string
}

type CanonicalRequestDraftBase = {
  customerType: CustomerType
  source: RequestSource
  clientSubmissionId: string
  fulfillment: FulfillmentDraft
  generalNotes?: string
  items: RequestItem[]
}

export type CanonicalB2CRequestDraft = CanonicalRequestDraftBase & {
  customerType: 'B2C'
  customer: B2CCustomerDraft
}

export type CanonicalB2BRequestDraft = CanonicalRequestDraftBase & {
  customerType: 'B2B'
  company: B2BCompanyDraft
}

export type CanonicalRequestDraft =
  | CanonicalB2CRequestDraft
  | CanonicalB2BRequestDraft

export type B2CSubmissionResult = {
  id: string
  reference: string
  duplicate: boolean
  estimatedSubtotal: number
  status: 'NEW'
}

export type B2BSubmissionResult = {
  id: string
  reference: string
  duplicate: boolean
  status: 'NEW'
}
