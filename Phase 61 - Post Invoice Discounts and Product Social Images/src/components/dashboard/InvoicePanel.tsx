import { formatJod } from '@/lib/format'
import Button from '@/components/ui/Button'
import { openInvoicePrint, openInvoiceAdjustmentPrint } from '@/domain/invoicePrint'
import type { InvoiceAdjustmentSummary } from '@/data/dashboard'
import { Printer } from '@phosphor-icons/react'
import { calculateInvoiceTotals, invoiceNumberForRequest, invoiceTaxRate } from '@/domain/invoice'

type InvoicePanelProps = {
  request: Record<string, any>
  items: Array<Record<string, any>>
  adjustments?: InvoiceAdjustmentSummary
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

export default function InvoicePanel({ request, items, adjustments }: InvoicePanelProps) {
  const isB2B = request.customer_type === 'B2B'
  const taxRate = invoiceTaxRate(request)
  const lines = items.map(lineFromItem)
  const calculated = calculateInvoiceTotals(lines, taxRate)
  const subtotal = Number(request.subtotal_jod ?? request.estimated_subtotal ?? calculated.subtotalJod)
  // Phase 53 fields default to zero even for historical issued invoices: preserve legacy totals.
  const discount = Number(request.discount_total_jod)>0 ? Number(request.discount_total_jod) : Number(request.discount_amount_jod)>0 ? Number(request.discount_amount_jod) : Number(calculated.discountJod)
  const lineDiscount = Number(calculated.discountJod)
  const customerDiscount = Number(request.customer_discount_jod ?? 0)
  const orderDiscount = Number(request.order_discount_jod ?? 0)
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
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:p-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">فاتورة المبيعات <span className="text-xs font-medium text-[var(--color-text-muted)]">{isB2B?'· B2B':'· B2C'}</span></h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">رقم الفاتورة: {invoiceNumberForRequest(request)}</p>
          {issuedAt ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">تاريخ الإصدار: {new Date(String(issuedAt)).toLocaleDateString('ar-JO')}</p> : null}
        </div>
        <Button variant="secondary" onClick={()=>{if(!openInvoicePrint(request,items))window.alert('المتصفح منع فتح معاينة الطباعة. اسمح بفتح النوافذ المنبثقة للموقع ثم حاول مرة أخرى.')}}><Printer size={18} aria-hidden="true"/>طباعة / حفظ PDF</Button>
      </div>

      <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4 text-sm">
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">{isB2B ? 'الشركة' : 'العميل'}</span><strong>{customer}</strong></div>
        {isB2B && request.contact_name_snapshot ? <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">جهة التواصل</span><span>{request.contact_name_snapshot}</span></div> : null}
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">نوع الحساب</span><span>{isB2B ? 'B2B' : 'B2C'}</span></div>
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">طريقة الدفع</span><span>{paymentLabel}</span></div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-[var(--color-border)]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 bg-[var(--color-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)]">
          <span>المنتج</span><span>الكمية</span><span>الصافي</span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {lines.length ? lines.map((line) => (
            <div key={line.id} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-3 text-sm">
              <span className="min-w-0 break-words">{line.description}</span>
              <span>{line.quantity}</span>
              <strong>{formatJod(Math.max(0, line.quantity) * Math.max(0, line.unitPriceJod) - Math.max(0, line.discountJod ?? 0))}</strong>
            </div>
          )) : <p className="px-3 py-4 text-sm text-[var(--color-text-muted)]">لا توجد بنود مفصلة للعرض.</p>}
        </div>
      </div>

      <div className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">المجموع قبل الخصم</span><span>{formatJod(subtotal)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">خصومات المنتجات</span><span>{formatJod(lineDiscount)}</span></div>
        {customerDiscount > 0 ? <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">خصم العميل الدائم</span><span>- {formatJod(customerDiscount)}</span></div> : null}
        {orderDiscount > 0 ? <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">خصم إضافي على الطلب</span><span>- {formatJod(orderDiscount)}</span></div> : null}
        <div className="flex justify-between gap-4 font-semibold"><span>إجمالي الخصومات</span><span>{formatJod(discount)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">المبلغ الخاضع للضريبة</span><span>{formatJod(taxable)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">الضريبة ({taxRate}%)</span><span>{formatJod(tax)}</span></div>
        <div className="flex justify-between gap-4 border-t border-[var(--color-border)] pt-3 text-base"><strong>الإجمالي</strong><strong>{formatJod(total)}</strong></div>
      </div>

      {adjustments?.adjustments.length ? <div className="mt-5 rounded-xl border border-[#D9BA91] bg-[#FFF7EA] p-4">
        <h3 className="font-bold">تعديلات استثنائية بعد إصدار الفاتورة</h3>
        <p className="mt-1 text-xs leading-6">الفاتورة أعلاه نسخة أصلية محفوظة. التعديلات التالية منفصلة وموثقة ولا تعيد إصدار الفاتورة.</p>
        <div className="mt-3 space-y-2">
          {adjustments.adjustments.map(a=><div key={a.id} className="rounded-lg border border-[#E6D6C1] bg-white p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><strong>مذكرة #{a.revision} · {a.item_id?'خصم منتج':'خصم الطلب'}</strong><bdi dir="ltr">- {formatJod(a.amount_jod)}</bdi></div>
            <p className="mt-1 text-xs">{a.reason}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{a.actor_name} · {new Date(a.created_at).toLocaleString('ar-JO')}</p>
          </div>)}
        </div>
        <div className="mt-4 flex justify-between border-t border-[#D9BA91] pt-3 text-sm"><span>خصومات بعد الإصدار</span><strong dir="ltr">- {formatJod(adjustments.adjustments_total_jod)}</strong></div>
        <div className="mt-2 flex justify-between text-base"><strong>{request.payment_status==='PAID'?'القيمة بعد الخصم (تحتاج تسوية المبلغ المدفوع)':'الرصيد بعد الخصم'}</strong><strong dir="ltr">{formatJod(adjustments.adjusted_balance_jod)}</strong></div>
        <Button className="mt-3" variant="secondary" onClick={()=>{if(!openInvoiceAdjustmentPrint(request,adjustments))window.alert('اسمح بالنوافذ المنبثقة لطباعة مذكرة الخصم.')}}><Printer size={18}/>طباعة كشف التعديلات</Button>
        {request.payment_status==='PAID'?<p className="mt-2 text-xs text-[#78552C]">تم الدفع مسبقًا؛ الخصم لا ينفذ استردادًا تلقائيًا، ويجب تسوية الفرق ماليًا.</p>:null}
      </div>:null}
      <div className="mt-4 border-t border-[var(--color-border)] pt-4 text-xs leading-6 text-[var(--color-text-muted)]">
        {isB2B && request.payment_status === 'MONTHLY_B2B_ACCOUNT'
          ? 'هذا الطلب مرتبط بحساب شركات شهري، وتحدد شروط الاستحقاق بعد اعتماد الحساب.'
          : 'الفاتورة خاضعة للمراجعة قبل اعتمادها النهائي.'}
      </div>
    </section>
  )
}
