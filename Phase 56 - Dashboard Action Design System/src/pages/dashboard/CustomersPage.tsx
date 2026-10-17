import { useCallback,useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from '@phosphor-icons/react'
import { listDashboardCustomers,saveDashboardCustomer } from '@/data/dashboard'
import { useDashboard } from '@/state/DashboardContext'
import type { DashboardCustomerListItem,DashboardListResponse } from '@/types/dashboard'
import { DashboardEmpty,DashboardLoading,DashboardError } from '@/components/dashboard/DashboardStates'
import Button from '@/components/ui/Button'
import CustomerProfileEditor, {emptyCustomerProfile,customerPayload,validateCustomerProfile,type CustomerProfileDraft} from '@/components/dashboard/CustomerProfileEditor'

export default function CustomersPage() {
  const {runtime,role}=useDashboard()
  const [type,setType]=useState<'B2B'|'B2C'>('B2B')
  const [q,setQ]=useState('')
  const [data,setData]=useState<DashboardListResponse<DashboardCustomerListItem>|null>(null)
  const [error,setError]=useState('')
  const [open,setOpen]=useState(false)
  const [draft,setDraft]=useState<CustomerProfileDraft>(emptyCustomerProfile('B2B'))
  const [saving,setSaving]=useState(false)
  const [formError,setFormError]=useState('')
  const load=useCallback(async()=>{try{setError('');setData(await listDashboardCustomers(runtime,{q,customerType:type,pageSize:100}))}catch{setError('تعذر تحميل العملاء.')}},[runtime,q,type])
  useEffect(()=>{const t=window.setTimeout(()=>void load(),200);return()=>window.clearTimeout(t)},[load])
  const create=async()=>{
    const e=validateCustomerProfile(draft);if(e){setFormError(e);return}
    try{setSaving(true);setFormError('');await saveDashboardCustomer(runtime,customerPayload(draft));setOpen(false);await load()}
    catch(err:any){setFormError(String(err?.message??'تعذر حفظ العميل.'))}finally{setSaving(false)}
  }
  if(error&&!data)return <DashboardError onRetry={()=>void load()}/>
  if(!data)return <DashboardLoading/>
  return <main dir="rtl" className="space-y-5 p-4 lg:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">العملاء والشركات</h1><p className="text-sm text-[var(--color-text-muted)]">ملفات الحسابات، خصومات دائمة وطلبات سابقة.</p></div>
      {role!=='SUPERVISOR'?<Button onClick={()=>{setDraft(emptyCustomerProfile(type));setFormError('');setOpen(true)}}>إضافة {type==='B2B'?'شركة':'عميل'}</Button>:null}</div>
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div role="tablist" className="mb-3 flex gap-2">{(['B2B','B2C'] as const).map(v=><button key={v} role="tab" aria-selected={type===v} onClick={()=>setType(v)}
        className={'min-h-11 cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] '+(type===v?'border-[var(--color-text)] bg-[var(--color-text)] font-bold text-white':'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[#C9A989] hover:bg-[#F5EADD]')}>{v==='B2B'?'الشركات B2B':'الأفراد B2C'}</button>)}</div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث بالاسم أو الهاتف أو الشركة" aria-label="البحث عن عميل"
        className="h-11 w-full rounded-xl border border-[var(--color-border)] px-3 outline-none"/></div>
    {error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}
    {!data.items.length?<DashboardEmpty title="لا يوجد عملاء" description="لا توجد حسابات تطابق البحث الحالي."/>:
      <div className="grid gap-3 lg:grid-cols-2">{data.items.map(c=><Link key={c.id} to={'/dashboard/customers/'+c.id}
        className="block cursor-pointer rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-[background-color,border-color,box-shadow] hover:border-[#C9A989] hover:bg-[#FFFCF7] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
        <div className="flex items-start justify-between gap-2"><div><h2 className="font-bold">{c.company_name||c.name||'—'}</h2><p dir="ltr" className="mt-1 text-right text-xs text-[var(--color-text-muted)]">{c.phone||'لا يوجد رقم هاتف'}</p></div>
          <span className="rounded-lg bg-[var(--color-bg)] px-2 py-1 text-xs">{c.customer_type}</span></div>
        <div className="mt-4 flex justify-between border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]"><span>{c.request_count} طلب</span><span>{c.last_request_at?'آخر طلب: '+new Date(c.last_request_at).toLocaleDateString('ar-JO'):'لا توجد طلبات'}</span></div>
      </Link>)}</div>}
    {open?<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <form onSubmit={e=>{e.preventDefault();void create()}} role="dialog" aria-modal="true" aria-label="إضافة حساب" className="flex max-h-[95dvh] w-full max-w-3xl flex-col rounded-t-3xl bg-[var(--color-surface)] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4"><h2 className="text-lg font-bold">إضافة {type==='B2B'?'شركة':'عميل'}</h2><Button variant="secondary" size="icon" onClick={()=>setOpen(false)} aria-label="إغلاق نافذة إضافة العميل" title="إغلاق"><X size={20}/></Button></div>
        <div className="overflow-y-auto p-4 md:p-6"><CustomerProfileEditor draft={draft} onChange={setDraft}/>{formError?<p role="alert" className="mt-3 text-sm text-red-700">{formError}</p>:null}</div>
        <div className="flex gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4"><Button type="submit" disabled={saving}>{saving?'جاري الحفظ...':'حفظ العميل'}</Button><Button type="button" variant="ghost" onClick={()=>setOpen(false)}>إلغاء</Button></div>
      </form></div>:null}
  </main>
}
