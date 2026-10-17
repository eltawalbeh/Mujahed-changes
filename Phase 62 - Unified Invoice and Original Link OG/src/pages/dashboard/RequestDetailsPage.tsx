import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowsClockwise, PencilSimple, XCircle } from '@phosphor-icons/react'
import {
  addDashboardRequestNote, getDashboardRequest, linkDashboardRequestCustomer,
  updateDashboardItemDiscount, updateDashboardOrderDiscount, updateDashboardPayment,
  updateDashboardRequestStatus, markDashboardRequestPersonal,
  getDashboardInvoiceAdjustments, addDashboardInvoiceAdjustment,
} from '@/data/dashboard'
import { useDashboard } from '@/state/DashboardContext'
import { useSitePage } from '@/hooks/useSitePage'
import type { DashboardRequestDetail } from '@/types/dashboard'
import { DashboardError, DashboardLoading, DashboardRestricted } from '@/components/dashboard/DashboardStates'
import { PaymentStatusBadge, RequestStatusBadge } from '@/components/dashboard/DashboardStatusBadge'
import InvoicePanel from '@/components/dashboard/InvoicePanel'
import PaymentWorkflowPanel from '@/components/dashboard/PaymentWorkflowPanel'
import DeliveryActions from '@/components/dashboard/DeliveryActions'
import OrderDiscountEditor, { type DiscountType } from '@/components/dashboard/OrderDiscountEditor'
import ItemDiscountEditor from '@/components/dashboard/ItemDiscountEditor'
import InvoiceAdjustmentEditor from '@/components/dashboard/InvoiceAdjustmentEditor'
import type { InvoiceAdjustmentSummary } from '@/data/dashboard'
import { canLinkCustomers, canManagePricing } from '@/lib/dashboardPermissions'
import { formatJod } from '@/lib/format'
import Button from '@/components/ui/Button'
import DashboardBreadcrumbs from '@/components/dashboard/DashboardBreadcrumbs'
import { buildPaymentRequestMessage, buildWhatsAppUrl } from '@/lib/whatsapp'

type Tab = 'work' | 'billing' | 'history'
function Section({title,children,highlight=false}:{title:string;children:ReactNode;highlight?:boolean}) {
  return <section className={'rounded-2xl border p-4 md:p-6 '+(highlight?'border-[#D4AC68] bg-[#FFF7E7] shadow-[0_8px_24px_rgba(130,92,36,.10)]':'border-[var(--color-border)] bg-[var(--color-surface)]')}><h2 className="text-base font-bold">{title}</h2><div className="mt-4">{children}</div></section>
}
function Fact({label,value}:{label:string;value:ReactNode}) {
  return <div><span className="block text-xs text-[var(--color-text-muted)]">{label}</span><div className="mt-1 text-sm font-semibold">{value||'—'}</div></div>
}
export default function RequestDetailsPage() {
  const { id='' } = useParams()
  const { runtime, role } = useDashboard()
  const [data,setData] = useState<DashboardRequestDetail|null>(null)
  const [loadingError,setLoadingError]=useState(false)
  const [restricted,setRestricted]=useState(false)
  const [saving,setSaving]=useState(false)
  const [adjustmentSummary,setAdjustmentSummary]=useState<InvoiceAdjustmentSummary|null>(null)
  const [adjustmentError,setAdjustmentError]=useState('')
  const [feedback,setFeedback]=useState('')
  const [note,setNote]=useState('')
  const [tab,setTab]=useState<Tab>('work')
  const tabsRef=useRef<HTMLDivElement>(null)
  const contact=useSitePage<{paymentInstructions?:string}>('contact')
  const load=useCallback(async()=>{try{setLoadingError(false);setData(await getDashboardRequest(runtime,id))}catch{setLoadingError(true)}},[runtime,id])
  useEffect(()=>{void load()},[load])
  useEffect(()=>{
    let active=true
    setAdjustmentSummary(null);setAdjustmentError('')
    if(data?.request.invoice_issued_at)void getDashboardInvoiceAdjustments(runtime,id)
      .then(s=>{if(active)setAdjustmentSummary(s)})
      .catch(e=>{if(active)setAdjustmentError(String(e?.message??'تعذر تحميل سجل تعديلات الفاتورة'))})
    return()=>{active=false}
  },[runtime,id,data?.request.invoice_issued_at])
  const total=useMemo(()=>Number(data?.request.final_total_jod || data?.request.estimated_subtotal || 0),[data])
  const mutate=async (operation:()=>Promise<DashboardRequestDetail>, successMessage='تم حفظ التغييرات بنجاح')=>{
    setSaving(true);setFeedback('')
    try {const next=await operation();setData(next);setFeedback(successMessage)}
    catch(err:any){const message=String(err?.message??'تعذر حفظ التغييرات');if(message.toLowerCase().includes('permission'))setRestricted(true);setFeedback(message);throw err}
    finally{setSaving(false)}
  }
  if(loadingError)return <DashboardError onRetry={()=>void load()}/>
  if(restricted)return <DashboardRestricted/>
  if(!data)return <DashboardLoading/>
  const request=data.request
  const b2b=request.customer_type==='B2B'
  const name=(b2b?request.company_name_snapshot:request.customer_name_snapshot)||request.customer_name_snapshot||'—'
  const pending=['NEW','CONTACT_REQUIRED','AWAITING_CONFIRMATION'].includes(request.status)
  const invoiceIssued=Boolean(request.invoice_issued_at)
  const pricingRoleAllowed=canManagePricing(role)
  const editable=pricingRoleAllowed&&!invoiceIssued&&['NEW','CONTACT_REQUIRED','AWAITING_CONFIRMATION'].includes(request.status)
  const discountLockReason=invoiceIssued?'الفاتورة صدرت بالفعل ولا يمكن تغيير مبالغها. طبّق الخصومات على الطلبات الجديدة قبل تأكيد الدفع والاعتماد.':!pricingRoleAllowed?'تعديل الخصومات متاح للمدير ومدير النظام فقط.':'هذا الطلب مقفل للتسعير حسب حالته الحالية.'
  const currentDiscount=Number(request.discount_total_jod??request.discount_amount_jod??0)
  const addInvoiceAdjustment=async(type:'PERCENT'|'FIXED',value:number,reason:string,itemId?:string)=>{
    setSaving(true);setFeedback('')
    try {
      const result=await addDashboardInvoiceAdjustment(runtime,id,type,value,reason,itemId)
      setAdjustmentSummary(result)
      setFeedback('تم اعتماد الخصم وإظهاره كسطر جديد في الفاتورة. السبب محفوظ في السجل الداخلي.')
      await load()
    }catch(e:any){const msg=String(e?.message??'تعذر تسجيل مذكرة الخصم');setFeedback(msg);throw e}
    finally{setSaving(false)}
  }
  const openBilling=()=>{
    setTab('billing')
    // Intentional navigation to the pricing section (ordinary tab switches do not scroll).
    tabsRef.current?.scrollIntoView({ behavior:'smooth', block:'start' })
    document.getElementById('request-billing-tab')?.focus({ preventScroll:true })
  }
  const convertToPersonal=()=>{
    if (!window.confirm('تحويل هذا الطلب من شركة B2B إلى طلب شخصي B2C؟ تأكد من نوع الطلب قبل المتابعة.')) return
    void mutate(
      ()=>markDashboardRequestPersonal(runtime,id),
      'تم تحويل الطلب إلى طلب شخصي (B2C) بنجاح.'
    ).catch(()=>{})
  }
  const sendPaymentMessage=()=>{
    if(!request.customer_phone_snapshot||!contact.paymentInstructions?.trim()){setFeedback('رقم الهاتف أو تعليمات الدفع غير متوفرة. راجع معلومات التواصل في المحتوى.');return}
    const msg=buildPaymentRequestMessage({reference:request.reference,customerName:name,totalJod:total,instructions:contact.paymentInstructions.trim()})
    window.open(buildWhatsAppUrl(msg,request.customer_phone_snapshot),'_blank','noopener,noreferrer')
  }
  return <main dir="rtl" className="mx-auto max-w-[1280px] space-y-5 p-4 pb-28 lg:p-8">
    <DashboardBreadcrumbs items={[{label:'الطلبات',to:'/dashboard/requests'},{label:request.reference}]}/>
    <header className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex flex-wrap items-center gap-2"><h1 className="flex flex-wrap items-baseline gap-2 text-xl font-bold md:text-2xl"><span>طلب رقم</span><bdi dir="ltr">#{request.reference}</bdi></h1><span className="rounded-lg bg-[var(--color-bg)] px-2 py-1 text-xs">{b2b?'B2B · شركات':'B2C · أفراد'}</span></div>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{name} · {request.fulfillment_type==='DELIVERY'?'توصيل':'استلام'} · {request.preferred_date||'الموعد غير محدد'} {request.preferred_time?.slice(0,5)||''}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2"><RequestStatusBadge status={request.status}/><PaymentStatusBadge status={request.payment_status}/>{request.requires_reapproval?<span className="text-sm text-amber-700">يتطلب مراجعة جديدة</span>:null}</div>
        </div>
        <div className="text-right"><span className="block text-xs text-[var(--color-text-muted)]">الإجمالي الحالي</span><strong dir="ltr" className="block text-2xl">{formatJod(total)}</strong></div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4">
        {(request.status==='NEW'||request.status==='CONTACT_REQUIRED')?<Button disabled={saving} onClick={()=>void mutate(()=>updateDashboardRequestStatus(runtime,id,'AWAITING_CONFIRMATION')).catch(()=>{})}>بدء متابعة الطلب</Button>:null}
        <DeliveryActions status={request.status} fulfillmentType={request.fulfillment_type} busy={saving} onChange={s=>void mutate(()=>updateDashboardRequestStatus(runtime,id,s)).catch(()=>{})}/>
        <a href={buildWhatsAppUrl('مرحباً، بخصوص طلبكم رقم '+request.reference,request.customer_phone_snapshot||'')} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-[var(--color-border)] bg-[#25D366] px-4 text-sm font-semibold text-[#102C1D] transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-[#1EBC59] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#087E34] active:translate-y-0 active:bg-[#159B47]">واتساب العميل</a>
        {request.status!=='CANCELLED'&&request.status!=='COMPLETED'?<Button variant="danger" disabled={saving} onClick={()=>{if(window.confirm('هل تريد إلغاء هذا الطلب؟'))void mutate(()=>updateDashboardRequestStatus(runtime,id,'CANCELLED')).catch(()=>{})}}><XCircle size={18} aria-hidden="true"/>إلغاء الطلب</Button>:null}
      </div>
    </header>
    {feedback?<p role="status" aria-live="polite" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">{feedback}</p>:null}
    <div ref={tabsRef} role="tablist" aria-label="أقسام الطلب" className="flex scroll-mt-24 gap-2 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      {([['work','متابعة الطلب'],['billing','التسعير والفاتورة'],['history','الملاحظات والسجل']] as const).map(([key,label])=><button id={'request-'+key+'-tab'} key={key} type="button" role="tab" aria-selected={tab===key} onClick={()=>setTab(key)} className={'shrink-0 border-b-2 px-3 py-3 text-sm '+(tab===key?'border-[var(--color-text)] font-bold':'border-transparent text-[var(--color-text-muted)]')}>{label}</button>)}
    </div>
    <div className="min-h-[850px] md:min-h-[1000px]">
    {tab==='work'?<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
      <div className="space-y-5">
        <Section title={b2b?'الشركة وجهة التواصل':'العميل'}>
          <div className="grid gap-4 sm:grid-cols-3"><Fact label="الاسم" value={name}/><Fact label="الهاتف" value={request.customer_phone_snapshot}/><Fact label="البريد الإلكتروني" value={request.customer_email_snapshot}/></div>
          {data.customer?<p className="mt-4 text-xs text-emerald-700">عميل مسجل في النظام · <Link className="underline" to={'/dashboard/customers/'+data.customer.id}>عرض ملف العميل</Link></p>:null}
          {data.possibleCustomers.length>0?<div className="mt-4 rounded-xl bg-[var(--color-bg)] p-3"><strong className="text-sm">عميل مسجل محتمل</strong>
            {data.possibleCustomers.slice(0,3).map(c=><div key={c.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm"><span>{c.company_name||c.name} · {c.match_reason}</span>{canLinkCustomers(role)?<Button size="sm" variant="secondary" disabled={saving} onClick={()=>void mutate(()=>linkDashboardRequestCustomer(runtime,id,c.id)).catch(()=>{})}>ربط السجل</Button>:null}</div>)}
          </div>:null}
          {b2b&&request.source==='WEBSITE'?<div className="mt-2"><Button variant="secondary" disabled={saving} onClick={convertToPersonal}><ArrowsClockwise size={18} aria-hidden="true"/>{saving?'جاري التحديث...':'تحويل إلى طلب شخصي'}</Button></div>:null}
        </Section>
        <Section title={'المنتجات · '+data.items.length}>
          <div className="divide-y divide-[var(--color-border)]">
            {data.items.map(item=><div className="flex items-start justify-between gap-3 py-3" key={item.id}><div><strong className="text-sm">{item.product_name_snapshot}</strong><p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.unit_label_snapshot} · ×{item.quantity}</p>
              {item.customization_label_snapshot?.length?<p className="mt-1 text-xs">{item.customization_label_snapshot.join('، ')}</p>:null}
              {item.notes?<p className="mt-1 text-xs text-[var(--color-text-muted)]">ملاحظة: {item.notes}</p>:null}</div>
              <span dir="ltr" className="shrink-0 text-sm font-bold">{formatJod(Number(item.final_line_total_jod || Math.max(0,Number(item.observed_base_price_jod||0)*Number(item.quantity||0)-Number(item.discount_amount_jod||0))))}</span></div>)}
          </div>
        </Section>
        <Section title="التوصيل / الاستلام"><div className="grid gap-4 sm:grid-cols-3"><Fact label="النوع" value={request.fulfillment_type==='DELIVERY'?'توصيل':'استلام'}/><Fact label="الموعد المطلوب" value={String(request.preferred_date||'—')+' · '+String(request.preferred_time||'')}/><Fact label="العنوان" value={request.delivery_address}/></div>{request.general_notes?<p className="mt-4 rounded-xl bg-[var(--color-bg)] p-3 text-sm">ملاحظات العميل: {request.general_notes}</p>:null}</Section>
      </div>
      <div className="space-y-5">
        <Section title="الخطوة التالية" highlight>
          {pending?<><p className="mb-4 text-sm text-[var(--color-text-muted)]">أكد التفاصيل مع العميل، ثم اختر طريقة الدفع لاعتماد الطلب وإرساله للمطبخ.</p>
            {request.status==='NEW'||request.status==='CONTACT_REQUIRED'?<p className="rounded-lg bg-[var(--color-bg)] p-3 text-sm">ابدأ متابعة الطلب أولاً لتفعيل خيارات الاعتماد.</p>:null}
            <PaymentWorkflowPanel request={request} busy={saving} onSave={async(status,method)=>{await mutate(()=>updateDashboardPayment(runtime,id,status,method))}}/>
            <Button className="mt-3 w-full" variant="secondary" onClick={sendPaymentMessage}>إرسال تعليمات الدفع عبر واتساب</Button>
          </>:<p className="text-sm text-[var(--color-text-muted)]">{request.status==='APPROVED'?'الطلب معتمد وجاهز للتحضير.':'تابع حالة الإنتاج أو التسليم من الإجراءات أعلى الصفحة.'}</p>}
        </Section>
        <Section title="ملخص السعر">
          <div className="space-y-2 text-sm"><div className="flex justify-between"><span>{formatJod(Number(request.estimated_subtotal??0))}</span><span>المنتجات</span></div>
          <div className="flex justify-between"><span>- {formatJod(currentDiscount)}</span><span>الخصومات</span></div>
          <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-bold"><span>{formatJod(total)}</span><span>الإجمالي</span></div></div>
          <div className="mt-3"><Button variant="secondary" onClick={openBilling}><PencilSimple size={18} aria-hidden="true"/>تعديل الخصومات وعرض الفاتورة</Button></div>
        </Section>
      </div>
    </div>:null}
    {tab==='billing'?<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-5">
        <Section title="التسعير والخصومات">
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">خصم العميل الدائم: {formatJod(Number(request.customer_discount_jod??0))} {data.customer?'· من ملف العميل':'· اربط العميل لتطبيق خصمه'}</p>
          {invoiceIssued?<>
            <div className="mb-4 rounded-xl border border-[#E8D3AD] bg-[#FFF7E8] p-3 text-sm leading-6 text-[#6D472B]">
              الفاتورة الأصلية صادرة ومقفلة. {pricingRoleAllowed?'يمكنك إضافة خصم مع سبب إجباري؛ سيظهر كسطر في الفاتورة، وتبقى بيانات الإصدار الأصلية محفوظة في السجل.':'تعديل ما بعد الإصدار متاح فقط للمدير ومدير النظام.'}
            </div>
            {adjustmentError?<p role="alert" className="mb-3 text-sm text-red-700">{adjustmentError}</p>:null}
            {pricingRoleAllowed&&adjustmentSummary?<InvoiceAdjustmentEditor summary={adjustmentSummary} busy={saving} onSave={addInvoiceAdjustment}/>:null}
          </>:<>
            {!editable?<div role="status" className="mb-4 rounded-xl border border-[#E8D3AD] bg-[#FFF7E8] p-3 text-sm">{discountLockReason}</div>:null}
            <OrderDiscountEditor request={request} editable={editable} busy={saving} disabledReason={discountLockReason}
              onSave={(type:DiscountType,value,reason)=>mutate(()=>updateDashboardOrderDiscount(runtime,id,type,value,reason))}/>
          </>}
        </Section>
        <Section title={invoiceIssued?'خصومات استثنائية على المنتجات':'خصومات المنتجات'}>
          {invoiceIssued?<>
            <p className="mb-3 text-xs leading-6 text-[var(--color-text-muted)]">خصومات المنتجات تظهر ضمن سطر «خصم إضافي» في الفاتورة، وتبقى أسبابها محفوظة داخليًا.</p>
            {pricingRoleAllowed&&adjustmentSummary?<div className="space-y-3">
              {data.items.map(item=><InvoiceAdjustmentEditor key={item.id} item={item} summary={adjustmentSummary} busy={saving} onSave={addInvoiceAdjustment}/>)}
            </div>:<p className="text-sm text-[var(--color-text-muted)]">{pricingRoleAllowed?'جاري تحميل سجل الخصومات...':'صلاحية الإضافة للمدير ومدير النظام فقط.'}</p>}
          </>:<>
            {!editable?<p className="mb-3 text-xs text-[var(--color-text-muted)]">{discountLockReason}</p>:null}
            <div className="space-y-1">{data.items.map(item=><ItemDiscountEditor key={item.id} item={item} editable={editable} busy={saving}
              onSave={amount=>mutate(()=>updateDashboardItemDiscount(runtime,id,item.id,amount),'تم حفظ خصم المنتج وتحديث الإجمالي')}/>)}</div>
          </>}
        </Section>
      </div>
      <div className="space-y-5">
        <Section title="الدفع"><PaymentWorkflowPanel request={request} busy={saving} onSave={async(s,m)=>{await mutate(()=>updateDashboardPayment(runtime,id,s,m))}}/></Section>
        {request.invoice_issued_at?<InvoicePanel request={request} items={data.items} adjustments={adjustmentSummary??undefined}/>:<Section title="الفاتورة"><p className="text-sm text-[var(--color-text-muted)]">تصدر الفاتورة بعد اعتماد الدفع والطلب. يمكن تعديل الخصومات قبل ذلك فقط.</p></Section>}
      </div>
    </div>:null}
    {tab==='history'?<div className="grid items-start gap-5 md:grid-cols-2"><Section title="ملاحظات داخلية">
      <div className="space-y-2">{data.notes.map(n=><div key={n.id} className="rounded-xl bg-[var(--color-bg)] p-3 text-sm">{n.body}</div>)}</div>
      <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="إضافة ملاحظة" className="mt-3 w-full rounded-xl border border-[var(--color-border)] p-3 text-sm"/>
      <Button disabled={!note.trim()||saving} onClick={()=>void mutate(async()=>{const r=await addDashboardRequestNote(runtime,id,note);setNote('');return r}).catch(()=>{})}>حفظ الملاحظة</Button>
    </Section><Section title="سجل النشاط"><div className="space-y-3">{data.activity.map(a=><div key={a.id} className="border-b border-[var(--color-border)] pb-3 text-sm"><p>{a.description}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{new Date(a.created_at).toLocaleString('ar-JO')}</p></div>)}</div></Section>
      {adjustmentSummary?.adjustments.length?<Section title="سجل الخصومات الاستثنائية · داخلي">
        <p className="mb-3 text-xs leading-6 text-[var(--color-text-muted)]">هذا السجل مخصص للإدارة فقط، ولا يظهر في الفاتورة أو ملف PDF المرسل للعميل.</p>
        <div className="space-y-3">
          {adjustmentSummary.adjustments.map(a=><div key={a.id} className="rounded-xl border border-[var(--color-border)] p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>خصم #{a.revision} · {a.item_id?'على منتج':'على الطلب'}</strong>
              <bdi dir="ltr" className="font-bold">- {formatJod(a.amount_jod)}</bdi>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{a.reason}</p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">{a.actor_name} · {a.actor_role} · {new Date(a.created_at).toLocaleString('ar-JO')}</p>
          </div>)}
        </div>
      </Section>:null}
    </div>:null}
    </div>
  </main>
}
