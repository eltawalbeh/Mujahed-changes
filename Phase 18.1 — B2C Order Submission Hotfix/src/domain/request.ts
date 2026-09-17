import type {
  B2BCompanyDraft,
  B2CCustomerDraft,
  CanonicalB2BRequestDraft,
  CanonicalB2CRequestDraft,
  FulfillmentDraft,
  RequestItem,
} from '@/types/request'

export type AddRequestItemInput = Omit<RequestItem, 'id' | 'addedAt'>

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function fallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function createClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return fallbackUuid()
}

function stableObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableObject)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stableObject(nested)]),
    )
  }
  return value
}

export function requestItemConfigurationKey(
  item: Pick<
    RequestItem,
    'productId' | 'unitId' | 'customUnit' | 'customization' | 'notes'
  >,
) {
  return JSON.stringify({
    productId: item.productId,
    unitId: item.unitId ?? '',
    customUnit: item.customUnit?.trim() ?? '',
    customization: stableObject(item.customization ?? {}),
    notes: item.notes?.trim() ?? '',
  })
}

export function sameRequestItemConfiguration(
  current: RequestItem,
  incoming: AddRequestItemInput,
) {
  return requestItemConfigurationKey(current) === requestItemConfigurationKey(incoming)
}

export function requestItemCount(items: RequestItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0)
}

export function b2cObservedSubtotal(items: RequestItem[]) {
  return items.reduce(
    (total, item) => total + (item.observedBasePriceJod ?? 0) * item.quantity,
    0,
  )
}

export function sanitizeFulfillment(
  fulfillment: FulfillmentDraft,
): FulfillmentDraft {
  return {
    type: fulfillment.type,
    address:
      fulfillment.type === 'DELIVERY'
        ? fulfillment.address?.trim() || undefined
        : undefined,
    locationNotes: fulfillment.locationNotes?.trim() || undefined,
    preferredDate: fulfillment.preferredDate || undefined,
    preferredTime: fulfillment.preferredTime || undefined,
  }
}

export function buildCanonicalB2CDraft(input: {
  clientSubmissionId: string
  customer: B2CCustomerDraft
  fulfillment: FulfillmentDraft
  generalNotes: string
  items: RequestItem[]
}): CanonicalB2CRequestDraft {
  return {
    customerType: 'B2C',
    source: 'WEBSITE',
    clientSubmissionId: input.clientSubmissionId,
    customer: {
      name: input.customer.name.trim(),
      phone: input.customer.phone.trim(),
      email: input.customer.email?.trim() || undefined,
    },
    fulfillment: sanitizeFulfillment(input.fulfillment),
    generalNotes: input.generalNotes.trim() || undefined,
    items: input.items,
  }
}

export function buildCanonicalB2BDraft(input: {
  clientSubmissionId: string
  company: B2BCompanyDraft
  fulfillment: FulfillmentDraft
  generalNotes: string
  items: RequestItem[]
}): CanonicalB2BRequestDraft {
  return {
    customerType: 'B2B',
    source: 'WEBSITE',
    clientSubmissionId: input.clientSubmissionId,
    company: {
      companyName: input.company.companyName.trim(),
      contactName: input.company.contactName.trim(),
      phone: input.company.phone.trim(),
      email: input.company.email?.trim() || undefined,
    },
    fulfillment: sanitizeFulfillment(input.fulfillment),
    generalNotes: input.generalNotes.trim() || undefined,
    items: input.items,
  }
}

export function validateCanonicalDraft(
  draft: CanonicalB2CRequestDraft | CanonicalB2BRequestDraft,
) {
  if (!isUuid(draft.clientSubmissionId)) {
    throw new Error('Invalid client submission ID')
  }
  if (!draft.items.length) throw new Error('Request must contain at least one item')
  if (draft.items.some((item) => item.quantity < 1)) {
    throw new Error('Request item quantity must be at least 1')
  }
  if (!draft.fulfillment.preferredDate) {
    throw new Error('Preferred date is required')
  }
  if (draft.fulfillment.type === 'DELIVERY' && !draft.fulfillment.address) {
    throw new Error('Delivery address is required')
  }

  if (draft.customerType === 'B2C') {
    if (draft.customer.name.length < 2 || draft.customer.phone.length < 7) {
      throw new Error('Invalid B2C customer data')
    }
  } else if (
    draft.company.companyName.length < 2 ||
    draft.company.contactName.length < 2 ||
    draft.company.phone.length < 7
  ) {
    throw new Error('Invalid B2B company/contact data')
  }
}

export function toPublicSubmissionItems(items: RequestItem[]) {
  return items.map((item) => ({
    productId: item.productId,
    unitId: item.unitId ?? '',
    customUnit: item.customUnit?.trim() ?? '',
    quantity: item.quantity,
    customization: item.customization ?? {},
    customizationLabels: item.customizationLabels ?? [],
    notes: item.notes?.trim() ?? '',
  }))
}
