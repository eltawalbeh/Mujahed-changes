import { invoiceNumberForRequest, invoiceTaxRate, customerInvoiceAdjustment, type CustomerInvoiceAdjustments } from '@/domain/invoice'

type RequestData = Record<string,any>
type LineData = Record<string,any>

const escaped=(value:unknown)=>String(value??'').replace(/[&<>"']/g,character=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[character]||character))
const num=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)?n:0}
const currency=(n:unknown)=>'JOD '+num(n).toFixed(3)
const money=(n:number)=>Math.max(0,Math.round(n*1000)/1000)
const date=(d:unknown)=>{if(!d)return '—';const parsed=new Date(String(d));return Number.isNaN(parsed.getTime())?'—':new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Amman'}).format(parsed)}
const e=(v:unknown)=>escaped(v)||'—'
const paymentText:Record<string,string>={
  PAID:'مدفوع',CASH_ON_DELIVERY:'الدفع عند الاستلام',MONTHLY_B2B_ACCOUNT:'على حساب الشركة — غير مدفوع',PENDING:'قيد الدفع',NOT_RECORDED:'غير مسجل',
}
const methodText:Record<string,string>={CASH:'نقدًا',BANK_TRANSFER:'حوالة بنكية',CLIQ:'CliQ',MOBILE_WALLET:'محفظة إلكترونية',B2B_MONTHLY_ACCOUNT:'حساب الشركة'}

export function invoicePrintHtml(request:RequestData,items:LineData[],adjustments?:CustomerInvoiceAdjustments):string {
  const subtotal=num(request.subtotal_jod??request.estimated_subtotal)
  const lineDiscount=money(items.reduce((total,x)=>total+num(x.discount_amount_jod),0))
  const customerDiscount=num(request.customer_discount_jod)
  const orderDiscount=num(request.order_discount_jod)
  // Historical issued invoices predate the Phase 53 field: use legacy booked discounts.
  const totalDiscount=num(request.discount_total_jod)>0?num(request.discount_total_jod):num(request.discount_amount_jod)>0?num(request.discount_amount_jod):lineDiscount
  const taxable=num(request.taxable_amount_jod??Math.max(0,subtotal-totalDiscount))
  const rate=invoiceTaxRate(request)
  const tax=num(request.tax_amount_jod??(taxable*rate/100))
  const total=num(request.final_total_jod??request.total_jod??taxable+tax)
  const adjusted=customerInvoiceAdjustment(total,adjustments)
  const isB2B=request.customer_type==='B2B'
  const issuedAt=request.invoice_issued_at??request.issued_at
  const reference=request.reference??request.id??'—'
  const rows=items.map((item,i)=>{
    const qty=num(item.quantity)
    const price=num(item.observed_base_price_jod??item.unit_price_jod)
    const off=num(item.discount_amount_jod)
    const net=money(qty*price-off)
    return `<tr><td class="name"><span class="index">${i+1}.</span> ${e(item.product_name_snapshot??item.product_name)}
      ${item.unit_label_snapshot?`<small>${e(item.unit_label_snapshot)}</small>`:''}</td>
      <td class="num">${qty}</td><td class="money">${currency(price)}</td>
      <td class="money">${off>0?'- '+currency(off):'—'}</td><td class="money strong">${currency(net)}</td></tr>`
  }).join('')
  const line=(label:string,v:string,cls='')=>`<div class="total-row ${cls}"><span>${label}</span><strong dir="ltr">${v}</strong></div>`
  const customer=request.company_name_snapshot||request.customer_name_snapshot
  const printedStatus=request.invoice_issued_at?'فاتورة صادرة':'مسودة — غير صادرة'
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>Invoice ${e(invoiceNumberForRequest(request))}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
@page{size:A4 portrait;margin:11mm}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:white;color:#241c18;font:11.5px/1.35 Arial,Tahoma,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:186mm;margin:0 auto;background:white}
.header{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;border-bottom:2px solid #33251e;padding-bottom:9px}
.brand{font-size:23px;font-weight:800;letter-spacing:-.3px}.brand-en{font-size:11px;letter-spacing:1.5px;color:#806657}
.subtitle{font-size:11px;color:#766558;margin-top:4px}.ident{text-align:left;direction:ltr}.ident h1{font-size:20px;margin:0 0 4px}.ident p{margin:2px 0;color:#6a574c;font-size:11px}
.label{color:#81695b;font-size:10px;margin-bottom:3px}.value{font-size:12px;font-weight:700;overflow-wrap:anywhere}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0 12px}
.meta-card{border:1px solid #e9dcd1;border-radius:8px;padding:8px 10px;min-width:0}
.meta-card h3{font-size:11px;margin:0 0 6px;color:#6f5546}.detail{margin:3px 0}.detail .label{display:inline-block;min-width:90px;margin:0}
table{width:100%;border-collapse:collapse;table-layout:fixed;direction:rtl}
thead{display:table-header-group;background:#f3ebe4}th{font-size:11px;font-weight:700;text-align:right;padding:6px 7px;border-bottom:1px solid #d8c5b4}
td{padding:6px 7px;border-bottom:1px solid #f0e6dc;vertical-align:top}
.name{width:38%;overflow-wrap:anywhere}.name small{display:block;color:#8b7060;font-size:10px;margin-top:2px;padding-right:13px}.index{color:#927b6b}
.num{text-align:center;width:9%;white-space:nowrap}.money{text-align:left;direction:ltr;white-space:nowrap;width:17.7%;font-size:11px}.strong{font-weight:700}
tr{break-inside:avoid;page-break-inside:avoid}
.summary{width:48%;min-width:250px;margin:10px 0 0 auto;break-inside:avoid;page-break-inside:avoid}
.total-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:3px 0}.total-row strong{white-space:nowrap}.total-row.grand{font-size:16px;border-top:2px solid #35251d;margin-top:6px;padding-top:8px}
.note{margin-top:12px;border-top:1px solid #e8ded6;padding-top:9px;font-size:10px;color:#715c4f;break-inside:avoid}
.footer{margin-top:8px;text-align:center;font-size:10px;color:#8a7366}
.no-print{margin:12px 0;padding:12px;background:#f5ede4;display:flex;justify-content:space-between;align-items:center;gap:8px;border-radius:8px}
.no-print button{cursor:pointer;background:#33251e;color:#fff;border:0;border-radius:7px;padding:10px 20px}
@media print{.page{max-width:none}.no-print{display:none!important}html,body{width:100%;height:auto;overflow:visible}.meta-card,.header,.total-row.grand{break-inside:avoid}}
@media screen{body{background:#ebe3da;padding:20px}.page{padding:22px;box-shadow:0 6px 22px #0001}}
</style></head><body><div class="page">
<div class="no-print"><span>معاينة الطباعة · اختر Save as PDF لحفظ الملف</span><button onclick="window.print()">طباعة / PDF</button></div>
<header class="header"><div><div class="brand">الشيف مجاهد</div><div class="brand-en">CHEF MUJAHED</div><div class="subtitle">إربد، المملكة الأردنية الهاشمية</div></div>
<div class="ident"><h1>INVOICE</h1><p dir="ltr">${e(invoiceNumberForRequest(request))}</p><p>${printedStatus}</p><p>JOD</p></div></header>
<section class="meta"><div class="meta-card"><h3>معلومات الفاتورة</h3>
<div class="detail"><span class="label">رقم الطلب</span><bdi class="value" dir="ltr">${e(reference)}</bdi></div>
<div class="detail"><span class="label">تاريخ الإصدار</span><bdi class="value" dir="ltr">${e(date(issuedAt))}</bdi></div>
<div class="detail"><span class="label">حالة الدفع</span><span class="value">${e(paymentText[request.payment_status]||'غير مسجل')}</span></div>
${request.payment_method?`<div class="detail"><span class="label">وسيلة الدفع</span><span class="value">${e(methodText[request.payment_method]||request.payment_method)}</span></div>`:''}
</div><div class="meta-card"><h3>${isB2B?'بيانات الشركة':'بيانات العميل'}</h3>
<div class="detail"><span class="label">${isB2B?'الشركة':'الاسم'}</span><span class="value">${e(customer)}</span></div>
${isB2B&&request.contact_name_snapshot?`<div class="detail"><span class="label">جهة الاتصال</span><span class="value">${e(request.contact_name_snapshot)}</span></div>`:''}
${request.customer_phone_snapshot?`<div class="detail"><span class="label">الهاتف</span><bdi class="value" dir="ltr">${e(request.customer_phone_snapshot)}</bdi></div>`:''}
${request.customer_email_snapshot?`<div class="detail"><span class="label">البريد</span><bdi class="value" dir="ltr">${e(request.customer_email_snapshot)}</bdi></div>`:''}
</div></section>
<table><thead><tr><th class="name">المنتج / الوصف</th><th class="num">الكمية</th><th class="money">سعر الوحدة</th><th class="money">خصم المنتج</th><th class="money">الإجمالي</th></tr></thead>
<tbody>${rows||'<tr><td colspan="5">لا توجد منتجات</td></tr>'}</tbody></table>
<section class="summary">
${line('المجموع قبل الخصومات',currency(subtotal))}
${line('خصومات المنتجات',lineDiscount?'- '+currency(lineDiscount):currency(0))}
${customerDiscount>0?line('الخصم الدائم','- '+currency(customerDiscount)):''}
${orderDiscount>0?line('الخصم الإضافي','- '+currency(orderDiscount)):''}
${line('إجمالي الخصومات','- '+currency(totalDiscount))}
${tax>0||rate>0?line('الضريبة ('+rate+'%)',currency(tax)):''}
${adjusted.hasAdjustment?line('الإجمالي قبل الخصم الإضافي',currency(total)):''}
${adjusted.hasAdjustment?line('خصم إضافي','- '+currency(adjusted.discount)):''}
${line(adjusted.hasAdjustment?'الإجمالي النهائي':'الإجمالي المستحق',currency(adjusted.finalTotal),'grand')}
</section>
<div class="note">${request.payment_status==='MONTHLY_B2B_ACCOUNT'?'هذا الطلب على حساب الشركة، والمبلغ غير مسدد حتى يُسجّل التحصيل.':request.payment_status==='PAID'?'تم تسجيل المبلغ كمستلم.':'تُراجع حالة الدفع مع العميل حسب الاتفاق.'}</div>
<div class="footer">Chef Mujahed · Irbid, Jordan · ${e(invoiceNumberForRequest(request))}</div>
</div></body></html>`
}

export function openInvoicePrint(request:RequestData,items:LineData[],adjustments?:CustomerInvoiceAdjustments):boolean {
  const popup=window.open('','_blank','width=960,height=880')
  if(!popup)return false
  popup.document.open()
  popup.document.write(invoicePrintHtml(request,items,adjustments))
  popup.document.close()
  popup.focus()
  return true
}
