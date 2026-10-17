import type { CustomerType } from '@/types/request'

export type CustomerProfileDraft = {
  id?: string; customerType: CustomerType; name: string; companyName: string
  phone: string; email: string; businessName: string; address: string
  billingAddress: string; taxNumber: string; paymentTerms: string; contactNotes: string
  defaultDiscountType: 'NONE' | 'PERCENT' | 'FIXED'; defaultDiscountValue: string
}
export const emptyCustomerProfile = (type: CustomerType): CustomerProfileDraft => ({
  customerType:type,name:'',companyName:'',phone:'',email:'',businessName:'',address:'',
  billingAddress:'',taxNumber:'',paymentTerms:'',contactNotes:'',
  defaultDiscountType:'NONE',defaultDiscountValue:'0',
})
export function fromCustomerProfile(customer: Record<string,any>): CustomerProfileDraft {
  return {
    id:customer.id,customerType:customer.customer_type??'B2C',
    name:customer.name??'',companyName:customer.company_name??'',
    phone:customer.phone??'',email:customer.email??'',businessName:customer.business_name??'',
    address:customer.address??'',billingAddress:customer.billing_address??'',
    taxNumber:customer.tax_number??'',paymentTerms:customer.payment_terms??'',
    contactNotes:customer.contact_notes??'',
    defaultDiscountType:customer.default_discount_type??(Number(customer.default_discount_percent)>0?'PERCENT':'NONE'),
    defaultDiscountValue:String(customer.default_discount_value??customer.default_discount_percent??0),
  }
}
export function validateCustomerProfile(d:CustomerProfileDraft):string {
  if(d.customerType==='B2B'&&!d.companyName.trim())return 'اسم الشركة مطلوب.'
  if(d.customerType==='B2C'&&!d.name.trim())return 'اسم العميل مطلوب.'
  const v=Number(d.defaultDiscountValue)
  if(!Number.isFinite(v)||v<0||(d.defaultDiscountType==='PERCENT'&&v>100))return 'قيمة الخصم غير صالحة.'
  return ''
}
export function customerPayload(d:CustomerProfileDraft) {
  return {...d,defaultDiscountValue:d.defaultDiscountType==='NONE'?0:Number(d.defaultDiscountValue)}
}
export default function CustomerProfileEditor({draft,onChange}:{draft:CustomerProfileDraft;onChange:(draft:CustomerProfileDraft)=>void}) {
  const field=(label:string,key:keyof CustomerProfileDraft,extra?:{type?:string;required?:boolean;help?:string;placeholder?:string})=><label key={key} className="block text-sm"><span className="mb-1.5 block font-medium">{label}</span>
    <input type={extra?.type??'text'} required={extra?.required} aria-describedby={extra?.help?'help-'+key:undefined} placeholder={extra?.placeholder} value={String(draft[key]??'')}
      onChange={e=>onChange({...draft,[key]:e.target.value})}
      className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]" />{extra?.help?<span id={'help-'+key} className="mt-1.5 block text-xs leading-5 text-[var(--color-text-muted)]">{extra.help}</span>:null}</label>
  return <div dir="rtl" className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      {draft.customerType==='B2B'?field('اسم الشركة *','companyName',{required:true}):null}
      {field(draft.customerType==='B2B'?'جهة التواصل':'اسم العميل *','name',{required:draft.customerType==='B2C'})}
      {field('رقم الهاتف','phone',{type:'tel'})}
      {field('البريد الإلكتروني','email',{type:'email'})}
      {draft.customerType==='B2C'?field('اسم المحل / الحساب التجاري (اختياري)','businessName'):null}
      {field('العنوان','address')}
      {draft.customerType==='B2B'?field('عنوان الفواتير','billingAddress'):null}
      {draft.customerType==='B2B'?field('الرقم الضريبي','taxNumber'):null}
      {draft.customerType==='B2B'?field('شروط الدفع','paymentTerms',{placeholder:'مثال: عند التسليم أو خلال 7 أيام',help:'اكتب اتفاق التحصيل مع الشركة: عند الاستلام، مسبقًا، خلال 7 أو 30 يومًا، أو حساب شهري. هذه ملاحظة مرجعية للموظفين، ولا تفعّل تحصيلًا أو فاتورة تلقائيًا.'}):null}
    </div>
    <fieldset className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <legend className="px-2 text-sm font-bold">الخصم الدائم للحساب</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm"><span className="mb-1.5 block">نوع الخصم</span>
          <select value={draft.defaultDiscountType} onChange={e=>onChange({...draft,defaultDiscountType:e.target.value as CustomerProfileDraft['defaultDiscountType'],defaultDiscountValue:'0'})}
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3">
            <option value="NONE">بدون خصم</option><option value="PERCENT">نسبة مئوية %</option><option value="FIXED">مبلغ ثابت JOD</option>
          </select></label>
        <label className="block text-sm"><span className="mb-1.5 block">قيمة الخصم</span>
          <input type="number" min="0" max={draft.defaultDiscountType==='PERCENT'?100:undefined} step="0.001"
            disabled={draft.defaultDiscountType==='NONE'} value={draft.defaultDiscountValue}
            onChange={e=>onChange({...draft,defaultDiscountValue:e.target.value})}
            className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 disabled:opacity-60"/></label>
      </div>
      <p className="mt-3 text-xs text-[var(--color-text-muted)]">يُحسب مرة واحدة على مبلغ المنتجات المتبقي بعد خصومات البنود، ولا يغيّر الفواتير القديمة.</p>
    </fieldset>
    <label className="block text-sm"><span className="mb-1.5 block font-medium">ملاحظات الحساب الداخلية</span>
      <textarea rows={3} value={draft.contactNotes} maxLength={3000} onChange={e=>onChange({...draft,contactNotes:e.target.value})}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white p-3"/></label>
  </div>
}
