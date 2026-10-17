import { useCallback,useEffect,useState,type FormEvent } from 'react'
import { Link,useParams } from 'react-router-dom'
import { addDashboardCustomerNote,getDashboardCustomer,saveDashboardCustomer } from '@/data/dashboard'
import { useDashboard } from '@/state/DashboardContext'
import type { DashboardCustomerDetail } from '@/types/dashboard'
import { DashboardLoading,DashboardError } from '@/components/dashboard/DashboardStates'
import { RequestStatusBadge } from '@/components/dashboard/DashboardStatusBadge'
import { formatJod } from '@/lib/format'
import Button from '@/components/ui/Button'
import DashboardBreadcrumbs from '@/components/dashboard/DashboardBreadcrumbs'
import { X } from '@phosphor-icons/react'
import CustomerProfileEditor, {fromCustomerProfile,customerPayload,validateCustomerProfile,type CustomerProfileDraft} from '@/components/dashboard/CustomerProfileEditor'

export default function CustomerDetailsPage(){
  const {id=''}=useParams()
  const {runtime,role}=useDashboard()
  const [data,setData]=useState<DashboardCustomerDetail|null>(null)
  const [failed,setFailed]=useState(false)
  const [editing,setEditing]=useState(false)
  const [draft,setDraft]=useState<CustomerProfileDraft|null>(null)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [note,setNote]=useState('')
  const load=useCallback(async()=>{try{setFailed(false);setData(await getDashboardCustomer(runtime,id))}catch{setFailed(true)}},[runtime,id])
  useEffect(()=>{void load()},[load])
  if(failed)return <DashboardError onRetry={()=>void load()}/>
  if(!data)return <DashboardLoading/>
  const customer=data.customer
  const label=customer.company_name||customer.name||'—'
  const discountType=customer.default_discount_type??(Number(customer.default_discount_percent)>0?'PERCENT':'NONE')
  const discountValue=customer.default_discount_value??customer.default_discount_percent??0
  const save=async(e:FormEvent)=>{
    e.preventDefault();if(!draft)return
    const bad=validateCustomerProfile(draft);if(bad){setError(bad);return}
    try{setSaving(true);setError('');await saveDashboardCustomer(runtime,customerPayload(draft));setEditing(false);setNotice('تم حفظ ملف العميل');await load()}
    catch(err:any){setError(String(err?.message??'تعذر حفظ البيانات'))}finally{setSaving(false)}
  }
  return <main dir="rtl" className="mx-auto max-w-[1200px] space-y-5 p-4 lg:p-8">
    <DashboardBreadcrumbs items={[{label:'العملاء والشركات',to:'/dashboard/customers'},{label}]}/>
    <header className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">{label}</h1><p className="mt-2 text-sm text-[var(--color-text-muted)]">{customer.customer_type==='B2B'?'حساب شركة B2B':'حساب أفراد B2C'} · {customer.phone||'بدون هاتف'}</p></div>
        {role!=='SUPERVISOR'?<Button variant="secondary" onClick={()=>{setDraft(fromCustomerProfile(customer));setError('');setEditing(true)}}>تعديل الملف والخصم</Button>:null}</div>
      <div className="mt-5 grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-4">
        <div><p className="text-xs text-[var(--color-text-muted)]">الطلبات</p><strong className="text-2xl">{data.stats.total}</strong></div>
        <div><p className="text-xs text-[var(--color-text-muted)]">مكتملة</p><strong className="text-2xl">{data.stats.completed}</strong></div>
        <div><p className="text-xs text-[var(--color-text-muted)]">قيد التنفيذ</p><strong className="text-2xl">{data.stats.active}</strong></div>
        <div><p className="text-xs text-[var(--color-text-muted)]">الخصم الدائم</p><strong className="text-lg">{discountType==='NONE'?'لا يوجد':String(discountValue)+(discountType==='PERCENT'?'%':' د.أ')}</strong></div>
      </div>
    </header>
    {notice?<p role="status" className="rounded-xl bg-[var(--color-surface)] p-3 text-sm">{notice}</p>:null}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-bold">بيانات الحساب</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">{([
            ['الاسم / جهة التواصل',customer.name],['الشركة / النشاط',customer.company_name||customer.business_name],
            ['الهاتف',customer.phone],['البريد الإلكتروني',customer.email],
            ['العنوان',customer.address],['عنوان الفواتير',customer.billing_address],
            ['الرقم الضريبي',customer.tax_number],['شروط الدفع',customer.payment_terms],
          ] as [string,any][]).filter(([,v])=>v).map(([k,v])=><div key={k}><dt className="text-xs text-[var(--color-text-muted)]">{k}</dt><dd className="mt-1 text-sm font-semibold">{v}</dd></div>)}</dl>
          {customer.contact_notes?<p className="mt-4 rounded-xl bg-[var(--color-bg)] p-3 text-sm">{customer.contact_notes}</p>:null}
        </section>
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-bold">الطلبات السابقة</h2><div className="mt-3 divide-y divide-[var(--color-border)]">
          {data.requests.length?data.requests.map(r=><Link key={r.id} to={'/dashboard/requests/'+r.id} className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-[var(--color-bg)]">
            <div><strong>{r.reference}</strong><p className="mt-1 text-xs text-[var(--color-text-muted)]">{new Date(r.submitted_at).toLocaleDateString('ar-JO')}</p></div>
            <div className="flex items-center gap-3"><RequestStatusBadge status={r.status}/><strong dir="ltr">{formatJod(Number(r.total_jod||0))}</strong></div>
          </Link>):<p className="py-4 text-sm text-[var(--color-text-muted)]">لا توجد طلبات بعد.</p>}</div></section>
      </div>
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-bold">الملاحظات الداخلية</h2>
        <div className="mt-3 space-y-2">{data.notes.map(n=><p className="rounded-xl bg-[var(--color-bg)] p-3 text-sm" key={n.id}>{n.body}</p>)}</div>
        <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="إضافة ملاحظة جديدة" className="mt-3 w-full rounded-xl border border-[var(--color-border)] p-3 text-sm"/>
        <Button variant="secondary" disabled={saving||!note.trim()} onClick={async()=>{try{setSaving(true);setData(await addDashboardCustomerNote(runtime,id,note));setNote('')}catch{setNotice('تعذر حفظ الملاحظة')}finally{setSaving(false)}}}>حفظ الملاحظة</Button>
      </section>
    </div>
    {editing&&draft?<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <form onSubmit={save} role="dialog" aria-modal="true" aria-label="تعديل العميل" className="flex max-h-[95dvh] w-full max-w-3xl flex-col rounded-t-3xl bg-[var(--color-surface)] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4"><h2 className="text-lg font-bold">تعديل {label}</h2><Button variant="secondary" size="icon" onClick={()=>setEditing(false)} aria-label="إغلاق نافذة تعديل العميل" title="إغلاق"><X size={20}/></Button></div>
        <div className="overflow-y-auto p-4 md:p-6"><CustomerProfileEditor draft={draft} onChange={setDraft}/>{error?<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>:null}</div>
        <div className="flex gap-2 border-t border-[var(--color-border)] p-4"><Button type="submit" disabled={saving}>{saving?'جاري الحفظ...':'حفظ التغييرات'}</Button><Button type="button" variant="ghost" onClick={()=>setEditing(false)}>إلغاء</Button></div>
      </form></div>:null}
  </main>
}
