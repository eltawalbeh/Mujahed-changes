export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'VOID' | 'PAID'

export type InvoiceLine = {
  id: string
  description: string
  quantity: number
  unitPriceJod: number
  discountJod?: number
}

export type InvoiceTotals = {
  subtotalJod: number
  discountJod: number
  taxableAmountJod: number
  taxRate: number
  taxJod: number
  totalJod: number
}

export type InvoiceSnapshot = {
  id?: string
  invoiceNumber: string
  requestId: string
  reference: string
  customerType: 'B2C' | 'B2B'
  customerName?: string | null
  companyName?: string | null
  contactName?: string | null
  phone?: string | null
  email?: string | null
  paymentStatus?: string | null
  paymentMethod?: string | null
  status: InvoiceStatus
  issuedAt?: string | null
  dueAt?: string | null
  currency: 'JOD'
  lines: InvoiceLine[]
  totals: InvoiceTotals
}
