import { formatJod } from '@/lib/format'
import { calculateInvoiceTotals, invoiceNumberForRequest, invoiceTaxRate } from '@/domain/invoice'

type InvoicePanelProps = {
  request: Record<string, any>
  items: Array<Record<string, any>>
}

function lineFromItem(item: Record<string, any>) {
  return {
    id: String(item.id ?? item.product_id ?? item.product_name_snapshot ?? ''),
    description: String(item.product_name_snapshot ?? item.product_name ?? 'بند في الطلب'),
    quantity: Number(item.quantity ?? 0),
    unitPriceJod: Number(item.observed_base_price_jod ?? item.unit_price_jod ?? 0),
    discountJod: Number(item.discount_amount_jod ?? 0),
  }
}

export default function InvoicePanel({ request, items }: InvoicePanelProps) {
  const isB2B = request.customer_type === 'B2B'
  const taxRate = invoiceTaxRate(request)
  const lines = items.map(lineFromItem)
  const calculated = calculateInvoiceTotals(lines, taxRate)
  const subtotal = Number(request.subtotal_jod ?? request.estimated_subtotal ?? calculated.subtotalJod)
  const discount = Number(request.discount_total_jod ?? calculated.discountJod)
  const taxable = Number(request.taxable_amount_jod ?? Math.max(0, subtotal - discount))
  const tax = Number(request.tax_amount_jod ?? (taxable * taxRate / 100))
  const total = Number(request.final_total_jod ?? request.total_jod ?? taxable + tax)
  const paymentLabel = request.payment_status === 'MONTHLY_B2B_ACCOUNT'
    ? 'حساب شركات شهري'
    : request.payment_status === 'CASH_ON_DELIVERY'
      ? 'الدفع عند الاستلام'
      : request.payment_status === 'PAID'
        ? 'مدفوع'
        : 'غير مسجل'
  const customer = request.company_name_snapshot || request.customer_name_snapshot || '—'
  const issuedAt = request.invoice_issued_at || request.issued_at

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:p-6 print:rounded-none print:border-0 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-bold">الفاتورة</h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">رقم الفاتورة: {invoiceNumberForRequest(request)}</p>
          {issuedAt ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">تاريخ الإصدار: {new Date(String(issuedAt)).toLocaleDateString('ar-JO')}</p> : null}
        </div>
        <button type="button" onClick={() => window.print()} className="min-h-11 rounded-lg border border-[var(--color-border)] px-3 text-sm font-semibold outline-none transition-colors hover:bg-[var(--color-bg)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 print:hidden">طباعة / PDF</button>
      </div>

      <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4 text-sm">
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">{isB2B ? 'الشركة' : 'العميل'}</span><strong>{customer}</strong></div>
        {isB2B && request.contact_name_snapshot ? <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">جهة التواصل</span><span>{request.contact_name_snapshot}</span></div> : null}
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">نوع الحساب</span><span>{isB2B ? 'B2B' : 'B2C'}</span></div>
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">طريقة الدفع</span><span>{paymentLabel}</span></div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-[var(--color-border)]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
          <span>البند</span><span>الكمية</span><span>المبلغ</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {lines.length ? lines.map((line) => (
            <div key={line.id} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-3 text-sm">
              <span className="min-w-0">{line.description}</span>
              <span>{line.quantity}</span>
              <strong>{formatJod(Math.max(0, line.quantity) * Math.max(0, line.unitPriceJod) - Math.max(0, line.discountJod ?? 0))}</strong>
            </div>
          )) : <p className="px-3 py-4 text-sm text-[var(--color-text-muted)]">لا توجد بنود مفصلة للعرض.</p>}
        </div>
      </div>

      <div className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">المجموع قبل الخصم</span><span>{formatJod(subtotal)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">الخصم</span><span>{formatJod(discount)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">المبلغ الخاضع للضريبة</span><span>{formatJod(taxable)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">الضريبة ({taxRate}%)</span><span>{formatJod(tax)}</span></div>
        <div className="flex justify-between gap-4 border-t border-[var(--color-border)] pt-3 text-base"><strong>الإجمالي</strong><strong>{formatJod(total)}</strong></div>
      </div>

      <div className="mt-4 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-text-muted)]">
        {isB2B && request.payment_status === 'MONTHLY_B2B_ACCOUNT'
          ? 'هذا الطلب مرتبط بحساب شركات شهري، وتحدد شروط الاستحقاق بعد اعتماد الحساب.'
          : 'الفاتورة خاضعة للمراجعة قبل اعتمادها النهائي.'}
      </div>
    </section>
  )
}
