const fs=require('node:fs')
const path=require('node:path')
const { invoicePrintHtml }=require('/tmp/chefmujahed-invoice-print.cjs')
const common={id:'test-only',reference:'CM-QA-2026-001',invoice_number:'INV-QA-001',customer_type:'B2C',customer_name_snapshot:'زبون تجريبي',customer_phone_snapshot:'0790000000',invoice_issued_at:'2026-10-17T10:00:00Z',payment_status:'PAID',payment_method:'CLIQ',discount_amount_jod:1.5,discount_total_jod:1.5,customer_discount_jod:0,order_discount_jod:0,tax_rate:0}
const fixtures=[
  {name:'short',count:8},
  {name:'long',count:42},
  {name:'business',count:10,b2b:true},
  {name:'adjusted',count:1,b2b:true},
]
for(const f of fixtures){
 const isAdjusted=f.name==='adjusted'
 const items=Array.from({length:f.count},(_,i)=>({id:'i'+i,product_name_snapshot:'منتج مخبوزات رقم '+(i+1),unit_label_snapshot:'علبة',quantity:1,observed_base_price_jod:3,discount_amount_jod:isAdjusted?0:(i===0?1.5:0)}))
 const subtotal=f.count*3
 const request={...common,customer_type:f.b2b?'B2B':'B2C',company_name_snapshot:f.b2b?'شركة الاختبار للمخبوزات':null,payment_status:f.b2b?'MONTHLY_B2B_ACCOUNT':'PAID',estimated_subtotal:subtotal,final_total_jod:isAdjusted?subtotal:subtotal-1.5}
 const adjustment=isAdjusted?{adjustments_total_jod:1,adjusted_balance_jod:2,adjustments:[{amount_jod:1,reason:'PRIVATE: do not expose reason to customer',actor_name:'PRIVATE ADMIN'}]}:undefined
 const html=invoicePrintHtml(request,items,adjustment)
 if(!html.includes('size:A4 portrait')||!html.includes('break-inside:avoid'))throw Error('Missing A4 or pagination guards')
 if(!html.includes('JOD '+(subtotal-1.5).toFixed(3)))throw Error('Wrong total')
 if(f.b2b&&!html.includes('غير مدفوع'))throw Error('Monthly account is incorrectly paid')
 if(isAdjusted){
   if(!html.includes('خصم إضافي')||!html.includes('JOD 2.000'))throw Error('Customer invoice lacks inline adjustment + final amount')
   if(html.includes('PRIVATE:')||html.includes('PRIVATE ADMIN'))throw Error('Private reason or staff name leaked onto customer invoice')
   if(html.includes('كشف تعديلات')||html.includes('طباعة كشف'))throw Error('Second discount statement leaked into customer invoice')
 }
 if(html.includes('<script>alert'))throw Error('Unescaped injected text')
 fs.writeFileSync('/tmp/cm-invoice-'+f.name+'.html',html,'utf8')
 console.log('QA fixture',f.name,'items',f.count,'bytes',html.length)
}
