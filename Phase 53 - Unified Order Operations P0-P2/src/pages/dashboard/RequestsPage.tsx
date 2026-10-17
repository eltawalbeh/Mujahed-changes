import {useCallback,useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {listDashboardRequests} from '@/data/dashboard'
import {useDashboard} from '@/state/DashboardContext'
import type {DashboardListResponse,DashboardRequestListItem} from '@/types/dashboard'
import {DashboardEmpty,DashboardError,DashboardLoading} from '@/components/dashboard/DashboardStates'
import {RequestStatusBadge} from '@/components/dashboard/DashboardStatusBadge'
import {REQUEST_SOURCE_LABELS,REQUEST_SOURCES} from '@/domain/constants'
import ManualRequestDialog from '@/components/dashboard/ManualRequestDialog'
import Button from '@/components/ui/Button'
import {formatJod} from '@/lib/format'

type View='all'|'NEW'|'CONTACT_REQUIRED'|'AWAITING_CONFIRMATION'|'APPROVED'|'PREPARING'|'READY'|'COMPLETED'
const views:[View,string][]=[['all','جميع الطلبات'],['NEW','جديدة'],['CONTACT_REQUIRED','مطلوب تواصل'],['AWAITING_CONFIRMATION','بانتظار التأكيد'],['APPROVED','معتمدة'],['PREPARING','قيد التجهيز'],['READY','جاهزة'],['COMPLETED','مكتملة']]
type Period='all'|'today'|'week'|'month'
const periodStart=(p:Period)=>{const d=new Date();if(p==='today')d.setHours(0,0,0,0);if(p==='week')d.setDate(d.getDate()-7);if(p==='month')d.setDate(d.getDate()-30);return d}
function nextAction(r:DashboardRequestListItem){
  if(r.status==='NEW'||r.status==='CONTACT_REQUIRED')return 'بدء المتابعة'
  if(r.status==='AWAITING_CONFIRMATION')return 'مراجعة واعتماد'
  if(r.status==='READY')return r.fulfillment_type==='COLLECTION'?'تأكيد الاستلام':'إرسال للتوصيل'
  if(r.status==='COMPLETED')return 'عرض السجل'
  return 'عرض التفاصيل'
}
export default function RequestsPage(){
  const {runtime}=useDashboard()
  const [view,setView]=useState<View>('all')
  const [period,setPeriod]=useState<Period>('all')
  const [channel,setChannel]=useState('')
  const [q,setQ]=useState('')
  const [advanced,setAdvanced]=useState(false)
  const [source,setSource]=useState('')
  const [page,setPage]=useState(1)
  const [data,setData]=useState<DashboardListResponse<DashboardRequestListItem>|null>(null)
  const [error,setError]=useState(false)
  const [manual,setManual]=useState(false)
  const load=useCallback(async()=>{
    try{setError(false);setData(await listDashboardRequests(runtime,{
      q,customerType:channel,source,status:view==='all'?'':view,page,pageSize:50,
    }))}catch{setError(true)}
  },[runtime,q,channel,source,view,page])
  useEffect(()=>{const t=window.setTimeout(()=>void load(),200);return()=>window.clearTimeout(t)},[load])
  useEffect(()=>{const id=window.setInterval(()=>{if(!document.hidden)void load()},30000);return()=>window.clearInterval(id)},[load])
  const updateView=(v:View)=>{setView(v);setPage(1)}
  const reset=()=>{setPage(1);setPeriod('all');setView('all');setChannel('');setSource('');setQ('')}
  if(error&&!data)return <DashboardError onRetry={()=>void load()}/>
  if(!data)return <DashboardLoading/>
  const items=data.items.filter(r=>period==='all'||new Date(r.submitted_at)>=periodStart(period))
  const totalPages=Math.max(1,Math.ceil(data.total/data.pageSize))
  return <main dir="rtl" className="space-y-5 p-4 lg:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">صندوق الطلبات</h1><p className="text-sm text-[var(--color-text-muted)]">اعرف المطلوب من كل طلب بدون الدخول في تفاصيله.</p></div>
      <div className="flex gap-2"><Button variant="secondary" onClick={()=>void load()}>تحديث</Button><Button onClick={()=>setManual(true)}>إضافة طلب</Button></div></div>
    <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div role="tablist" aria-label="حالات الطلب" className="flex gap-2 overflow-x-auto pb-2">{views.map(([v,label])=><button key={v} role="tab" aria-selected={view===v} onClick={()=>updateView(v)}
        className={'shrink-0 rounded-xl px-3 py-2 text-sm '+(view===v?'bg-[var(--color-text)] font-bold text-white':'bg-[var(--color-bg)] text-[var(--color-text-muted)]')}>{label}</button>)}</div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input aria-label="بحث عن طلب" value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="بحث برقم الطلب، اسم العميل أو الهاتف" className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3"/>
        <select aria-label="نوع العميل" value={channel} onChange={e=>{setChannel(e.target.value);setPage(1)}} className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3"><option value="">B2C + B2B</option><option value="B2C">B2C</option><option value="B2B">B2B</option></select>
        <button type="button" aria-expanded={advanced} onClick={()=>setAdvanced(!advanced)} className="h-11 rounded-xl border border-[var(--color-border)] px-4 text-sm">فلاتر إضافية</button>
      </div>
      {advanced?<div className="flex flex-wrap gap-2"><select aria-label="مصدر الطلب" value={source} onChange={e=>{setSource(e.target.value);setPage(1)}} className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3"><option value="">كل المصادر</option>{REQUEST_SOURCES.map(s=><option value={s} key={s}>{REQUEST_SOURCE_LABELS[s]}</option>)}</select>
        {([['all','كل الأوقات'],['today','اليوم'],['week','7 أيام'],['month','30 يوم']] as const).map(([p,label])=><button key={p} type="button" onClick={()=>setPeriod(p)} className={'rounded-xl px-3 text-sm '+(period===p?'bg-[var(--color-text)] text-white':'bg-[var(--color-bg)]')}>{label}</button>)}
        <Button size="sm" variant="ghost" onClick={reset}>مسح الفلاتر</Button></div>:null}
    </section>
    {error?<p role="alert" className="text-sm text-red-700">تعذر تحديث القائمة. يتم عرض آخر بيانات محمّلة.</p>:null}
    <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]"><p>{data.total} طلب مطابق للفلاتر الأساسية · {items.length} ظاهر بهذه الصفحة</p><p>تحديث تلقائي كل 30 ثانية</p></div>
    {!items.length?<DashboardEmpty title="لا توجد طلبات" description="غيّر الفلتر أو راجع صفحة أخرى." action={{label:'عرض كل الطلبات',onClick:reset}}/>:
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="hidden grid-cols-[1fr_1.2fr_1fr_110px_150px] gap-4 bg-[var(--color-bg)] px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] lg:grid"><span>الطلب</span><span>العميل</span><span>الحالة والموعد</span><span>الإجمالي</span><span>الإجراء التالي</span></div>
      {items.map(r=><Link to={'/dashboard/requests/'+r.id} key={r.id} className="block border-t border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-bg)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] lg:grid lg:grid-cols-[1fr_1.2fr_1fr_110px_150px] lg:items-center lg:gap-4">
        <div className="flex items-center justify-between gap-2 lg:block"><div><strong dir="ltr" className="text-sm">{r.reference}</strong><p className="mt-1 text-xs text-[var(--color-text-muted)]">{r.customer_type} · {r.fulfillment_type==='DELIVERY'?'توصيل':'استلام'}</p></div><div className="lg:hidden"><RequestStatusBadge status={r.status}/></div></div>
        <p className="mt-2 text-sm font-semibold lg:mt-0">{r.customer_label}</p>
        <div className="mt-2 hidden lg:block"><RequestStatusBadge status={r.status}/><p className="mt-1 text-xs text-[var(--color-text-muted)]">{new Date(r.submitted_at).toLocaleDateString('ar-JO')}</p></div>
        <p dir="ltr" className="mt-2 text-right text-sm font-semibold lg:mt-0">{formatJod(Number(r.total_jod||0))}</p>
        <p className="mt-3 inline-block rounded-lg bg-[var(--color-text)] px-3 py-2 text-xs font-semibold text-white lg:mt-0 lg:text-center">{nextAction(r)} ←</p>
      </Link>)}
    </div>}
    <nav aria-label="الصفحات" className="flex items-center justify-center gap-3">
      <Button size="sm" variant="secondary" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>السابق</Button>
      <span className="text-sm">{page} / {totalPages}</span>
      <Button size="sm" variant="secondary" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>التالي</Button>
    </nav>
    {manual?<ManualRequestDialog onClose={()=>setManual(false)} onCreated={()=>void load()}/>:null}
  </main>
}
