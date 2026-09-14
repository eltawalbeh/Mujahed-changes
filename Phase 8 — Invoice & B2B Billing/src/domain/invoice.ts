import type { InvoiceLine, InvoiceTotals } from '@/types/invoice'

function money(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 1000) / 1000
}

export function calculateInvoiceTotals(
  lines: InvoiceLine[],
  taxRate = 0,
): InvoiceTotals {
  const safeTaxRate = Math.max(0, Number(taxRate) || 0)
  const subtotalJod = money(lines.reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.unitPriceJod), 0))
  const discountJod = money(lines.reduce((sum, line) => sum + Math.max(0, line.discountJod ?? 0), 0))
  const taxableAmountJod = money(Math.max(0, subtotalJod - discountJod))
  const taxJod = money(taxableAmountJod * safeTaxRate / 100)
  const totalJod = money(taxableAmountJod + taxJod)

  return { subtotalJod, discountJod, taxableAmountJod, taxRate: safeTaxRate, taxJod, totalJod }
}

export function invoiceNumberForRequest(request: Record<string, unknown>) {
  const explicit = String(request.invoice_number ?? '').trim()
  if (explicit) return explicit
  const reference = String(request.reference ?? request.id ?? '').trim()
  return reference ? `INV-${reference}` : 'INV-PENDING'
}

export function invoiceTaxRate(request: Record<string, unknown>) {
  return Math.max(0, Number(request.tax_rate ?? request.vat_rate ?? 0) || 0)
}
