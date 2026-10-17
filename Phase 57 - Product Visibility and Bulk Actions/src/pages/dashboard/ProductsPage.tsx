import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, EyeSlash, PencilSimple, Trash, X, Plus } from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import { bulkManageDashboardProducts, getDashboardProduct, listDashboardProducts, type BulkProductAction } from '@/data/dashboard'
import { useDashboard } from '@/state/DashboardContext'
import type { DashboardListResponse, DashboardProductDetail, DashboardProductListItem } from '@/types/dashboard'
import type { DashboardRuntime } from '@/data/dashboard'
import { DashboardEmpty, DashboardError, DashboardLoading } from '@/components/dashboard/DashboardStates'
import { DashboardTable, DashboardTd, DashboardTr } from '@/components/dashboard/DashboardTable'
import { formatJod } from '@/lib/format'
import { canCreateOrImportProducts } from '@/lib/dashboardPermissions'
import ProductCreateDrawer from '@/components/dashboard/ProductCreateDrawer'
import ProductEditPage from '@/pages/dashboard/ProductEditPage'

type VisibilityFilter = '' | 'AVAILABLE' | 'UNAVAILABLE'
type PendingAction = {ids:string[];action:BulkProductAction;channel?:'B2B'|'B2C'}
const isPublished=(p:DashboardProductListItem)=>p.status==='ACTIVE' && p.availability==='AVAILABLE' && p.public_visible===true
const isMutable=(p:DashboardProductListItem)=>p.status!=='ARCHIVED'
const actionText=(a:PendingAction)=>a.action==='SHOW'?'إظهار':a.action==='HIDE'?'إخفاء':a.action==='DELETE'?'حذف/أرشفة':a.channel==='B2C'?'تحويل إلى B2C':'تحويل إلى B2B'

export default function ProductsPage(){
  const {runtime,role}=useDashboard()
  const [data,setData]=useState<DashboardListResponse<DashboardProductListItem>|null>(null)
  const [q,setQ]=useState('')
  const [channel,setChannel]=useState('')
  const [status,setStatus]=useState('')
  const [availability,setAvailability]=useState<VisibilityFilter>('')
  const [error,setError]=useState(false)
  const [createOpen,setCreateOpen]=useState(false)
  const [selected,setSelected]=useState<DashboardProductListItem|null>(null)
  const [editingId,setEditingId]=useState('')
  const [pending,setPending]=useState<PendingAction|null>(null)
  const [checked,setChecked]=useState<string[]>([])
  const [action,setAction]=useState<BulkProductAction>('HIDE')
  const [target,setTarget]=useState<'B2B'|'B2C'>('B2B')
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState<{type:'success'|'error';text:string}|null>(null)
  const canAdmin=runtime.mode==='preview'||canCreateOrImportProducts(role)
  const load=useCallback(async()=>{
    try {setError(false);setData(await listDashboardProducts(runtime,{q,channel,status,availability,pageSize:50}))}
    catch {setError(true)}
  },[runtime,q,channel,status,availability])
  useEffect(()=>{const id=setTimeout(()=>void load(),180);return()=>clearTimeout(id)},[load])
  useEffect(()=>{setChecked([])},[q,channel,status,availability])
  const items=data?.items??[]
  const selectable=useMemo(()=>items.filter(isMutable),[items])
  const allSelected=selectable.length>0 && selectable.every(item=>checked.includes(item.id))
  const toggleChecked=(id:string)=>setChecked(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id])
  const chooseAll=()=>setChecked(allSelected?[]:selectable.map(item=>item.id))
  const run=async(a:PendingAction)=>{
    if(busy)return
    try{
      setBusy(true);setNotice(null)
      const result=await bulkManageDashboardProducts(runtime,a.ids,a.action,a.channel)
      setChecked([]);setPending(null)
      await load()
      setNotice({type:'success',text:`تم تنفيذ «${actionText(a)}» على ${result.changed} منتج بنجاح.`})
    }catch(e:any){
      setPending(null)
      setNotice({type:'error',text:String(e?.message||'تعذر تنفيذ العملية. لم يتم تغيير المنتجات؛ راجع الإعدادات وحاول مجددًا.')})
    }finally{setBusy(false)}
  }
  const request=(a:PendingAction)=>{
    if(!a.ids.length||busy)return
    // Only deletion requires a second confirmation. Other actions already require pressing the action button.
    if(a.action==='DELETE')setPending(a)
    else void run(a)
  }
  if(error&&!data)return <DashboardError onRetry={()=>void load()}/>
  if(!data)return <DashboardLoading/>
  return <main dir="rtl" className="space-y-5 p-4 pb-36 lg:p-8 lg:pb-32">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold">إدارة المنتجات</h1><p className="mt-1 text-sm text-[var(--color-text-muted)]">تحكم في ظهور المنتجات أو حدّد عدة منتجات لتعديلها دفعة واحدة.</p></div>
      {canAdmin?<div className="flex flex-wrap gap-2">
        <Link to="/dashboard/products/import" className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold transition-colors hover:bg-[#F5EADD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">استيراد Bulk</Link>
        <Button onClick={()=>setCreateOpen(true)}><Plus size={18}/>إضافة منتج</Button>
      </div>:null}
    </header>
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(3,170px)]">
        <input aria-label="البحث عن منتج" value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث باسم المنتج أو SKU" className="h-11 min-w-0 rounded-xl border border-[var(--color-border)] bg-white px-3 outline-none"/>
        <Filter label="قناة البيع" value={channel} onChange={setChannel} options={[["",'كل القنوات'],['B2C','B2C'],['B2B','B2B']]}/>
        <Filter label="حالة المنتج" value={status} onChange={setStatus} options={[["",'كل المنتجات'],['ARCHIVED','المؤرشفة']]}/>
        <Filter label="الظهور" value={availability} onChange={v=>setAvailability(v as VisibilityFilter)} options={[["",'ظاهر ومخفي'],['AVAILABLE','ظاهر على الموقع'],['UNAVAILABLE','مخفي عن الموقع']]}/>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
        <Button variant="secondary" size="sm" onClick={()=>{setQ('');setChannel('');setStatus('');setAvailability('')}}><X size={16}/>مسح الفلاتر</Button>
        <p className="text-xs text-[var(--color-text-muted)]">التحكم بالظهور منفصل عن إعداد عبوات المنتج. {data.total} منتج</p>
      </div>
    </section>
    {notice?<p role="status" aria-live="polite" className={'rounded-xl border p-3 text-sm '+(notice.type==='success'?'border-green-200 bg-green-50 text-green-800':'border-red-200 bg-red-50 text-red-800')}>{notice.text}</p>:null}
    {selectable.length>0?<div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-[#F5EADD]">
        <input type="checkbox" className="size-5 accent-[#2E1E17]" checked={allSelected} onChange={chooseAll} aria-label="تحديد كل المنتجات المعروضة"/>
        تحديد كل المعروض ({selectable.length})
      </label>
      <span className="text-sm text-[var(--color-text-muted)]">{checked.length? `${checked.length} منتج محدد`: 'اختر منتجًا واحدًا أو أكثر للإجراءات الجماعية'}</span>
    </div>:null}
    {!items.length?<DashboardEmpty title="لا توجد منتجات" description="لا توجد منتجات تطابق عوامل التصفية."/>:<>
      <div className="space-y-3 md:hidden">{items.map(product=><article key={product.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">{isMutable(product)?<input type="checkbox" className="size-5 shrink-0 accent-[#2E1E17]" aria-label={'تحديد '+product.name_ar} checked={checked.includes(product.id)} onChange={()=>toggleChecked(product.id)}/>:null}
            <div className="min-w-0"><button type="button" className="block max-w-full truncate text-right font-bold underline-offset-4 hover:underline" onClick={()=>setSelected(product)}>{product.name_ar}</button>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{product.sku||'بدون SKU'} · {product.channel}</p></div></div>
          <VisibilityStatus shown={isPublished(product)} archived={!isMutable(product)}/>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
          <strong dir="ltr" className="text-sm">{product.base_price_jod!=null?formatJod(Number(product.base_price_jod)):'—'}</strong>
          <div className="flex items-center gap-2">
            {isMutable(product)?<VisibilityButton shown={isPublished(product)} busy={busy} name={product.name_ar} onClick={()=>request({ids:[product.id],action:isPublished(product)?'HIDE':'SHOW'})}/>:null}
            <Button size="icon" variant="secondary" title="تعديل المنتج" aria-label={'تعديل '+product.name_ar} onClick={()=>setEditingId(product.id)}><PencilSimple size={18}/></Button>
            {canAdmin&&isMutable(product)?<Button size="icon" variant="danger" title="حذف المنتج" aria-label={'حذف '+product.name_ar} onClick={()=>request({ids:[product.id],action:'DELETE'})}><Trash size={18}/></Button>:null}
          </div>
        </div>
      </article>)}</div>
      <div className="hidden md:block">
        <DashboardTable minWidth={840} headers={['تحديد','المنتج','التصنيف','السعر الأساسي','القناة','الظهور على الموقع','الإجراءات']}>
          {items.map(product=><DashboardTr key={product.id}>
            <DashboardTd>{isMutable(product)?<input type="checkbox" checked={checked.includes(product.id)} aria-label={'تحديد '+product.name_ar} onChange={()=>toggleChecked(product.id)} className="size-5 cursor-pointer accent-[#2E1E17]"/>:null}</DashboardTd>
            <DashboardTd><button type="button" onClick={()=>setSelected(product)} className="cursor-pointer text-right font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">{product.name_ar}</button><p className="mt-1 text-xs text-[var(--color-text-muted)]">{product.sku||'بدون SKU'}</p></DashboardTd>
            <DashboardTd>{product.category_name||'—'}</DashboardTd>
            <DashboardTd><bdi dir="ltr">{product.base_price_jod!=null?formatJod(Number(product.base_price_jod)):'—'}</bdi></DashboardTd>
            <DashboardTd>{product.channel}</DashboardTd>
            <DashboardTd><VisibilityStatus shown={isPublished(product)} archived={!isMutable(product)}/></DashboardTd>
            <DashboardTd><div className="flex items-center gap-2">
              {isMutable(product)?<VisibilityButton shown={isPublished(product)} busy={busy} name={product.name_ar} onClick={()=>request({ids:[product.id],action:isPublished(product)?'HIDE':'SHOW'})}/>:null}
              <Button size="icon" variant="secondary" title="تعديل" aria-label={'تعديل '+product.name_ar} onClick={()=>setEditingId(product.id)}><PencilSimple size={18}/></Button>
              {canAdmin&&isMutable(product)?<Button size="icon" variant="danger" title="حذف" aria-label={'حذف '+product.name_ar} onClick={()=>request({ids:[product.id],action:'DELETE'})}><Trash size={18}/></Button>:null}
            </div></DashboardTd>
          </DashboardTr>)}
        </DashboardTable>
      </div>
    </>}
    {checked.length>0?<div role="region" aria-label="الإجراءات الجماعية" className="fixed inset-x-3 bottom-3 z-30 rounded-2xl lg:left-8 lg:right-[280px] border border-[#CEB08F] bg-[#FFF9F1] p-3 shadow-[0_8px_35px_rgba(49,31,16,.16)] sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <strong className="whitespace-nowrap text-sm">{checked.length} منتج محدد</strong>
        <select aria-label="اختر الإجراء الجماعي" value={action} onChange={e=>setAction(e.target.value as BulkProductAction)} className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm sm:max-w-[240px]">
          <option value="HIDE">إخفاء المنتجات</option><option value="SHOW">إظهار المنتجات</option>
          {canAdmin?<><option value="CHANNEL">تغيير قناة البيع</option><option value="DELETE">حذف/أرشفة المنتجات</option></>:null}
        </select>
        {action==='CHANNEL'?<select aria-label="قناة البيع المستهدفة" value={target} onChange={e=>setTarget(e.target.value as 'B2C'|'B2B')} className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm"><option value="B2B">B2B</option><option value="B2C">B2C</option></select>:null}
        <Button variant={action==='DELETE'?'danger':'primary'} disabled={busy} onClick={()=>request({ids:checked,action,channel:action==='CHANNEL'?target:undefined})}>{busy?'جاري التنفيذ...':'تطبيق على المحدد'}</Button>
        <Button variant="secondary" onClick={()=>setChecked([])} disabled={busy}>إلغاء التحديد</Button>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#705645]">التغيير يُنفذ على العناصر المحددة في الصفحة فقط. تغيير القناة يتطلب إعداد وحدات بيع صالحة للقناة الجديدة.</p>
    </div>:null}
    {pending?<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <section role="alertdialog" aria-modal="true" aria-labelledby="delete-products-title" className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] p-6 shadow-xl">
        <h2 id="delete-products-title" className="text-lg font-bold">تأكيد حذف {pending.ids.length} منتج</h2>
        <p className="my-4 text-sm leading-7 text-[var(--color-text-muted)]">المنتجات المرتبطة بطلبات سابقة ستُؤرشف حفاظًا على سجل الطلبات. المنتجات بدون سجل طلبات قد تُحذف نهائيًا، بما فيها إعداداتها وصورها. هل تريد المتابعة؟</p>
        <div className="flex flex-wrap gap-2"><Button variant="danger" disabled={busy} onClick={()=>void run(pending)}>{busy?'جاري الحذف...':'تأكيد الحذف'}</Button><Button variant="secondary" disabled={busy} onClick={()=>setPending(null)}>تراجع</Button></div>
      </section>
    </div>:null}
    {createOpen?<ProductCreateDrawer runtime={runtime} onClose={()=>setCreateOpen(false)} onCreated={id=>{setCreateOpen(false);setEditingId(id)}}/>:null}
    {selected?<ProductDetailsDrawer product={selected} runtime={runtime} deleting={false} confirmingDelete={false} onClose={()=>setSelected(null)} onEdit={()=>{setEditingId(selected.id);setSelected(null)}} onStartDelete={()=>{setSelected(null);request({ids:[selected.id],action:'DELETE'})}} onCancelDelete={()=>{}} onConfirmDelete={()=>{}}/>:null}
    {editingId?<ProductEditPage productId={editingId} onClose={()=>{setEditingId('');void load()}} onDeleted={()=>void load()}/>:null}
  </main>
}
function Filter({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:Array<[string,string]>}){
  return <label className="block"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)} className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm">
    {options.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
}
function VisibilityStatus({shown,archived}:{shown:boolean;archived:boolean}) {
  return <span className={'inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium '+(archived?'bg-gray-100 text-gray-700':shown?'bg-green-50 text-green-700':'bg-gray-100 text-gray-700')}>
    {archived?'مؤرشف':shown?'ظاهر':'مخفي'}
  </span>
}
function VisibilityButton({shown,busy,name,onClick}:{shown:boolean;busy:boolean;name:string;onClick:()=>void}) {
  return <Button variant="secondary" size="sm" disabled={busy} aria-label={(shown?'إخفاء ':'إظهار ')+name} title={shown?'إخفاء من الموقع':'إظهار على الموقع'} aria-pressed={shown} onClick={onClick}>
    {shown?<EyeSlash size={17} aria-hidden="true"/>:<Eye size={17} aria-hidden="true"/>}
    <span>{shown?'إخفاء':'إظهار'}</span>
  </Button>
}
function ProductDetailsDrawer({product,runtime,deleting,confirmingDelete,onClose,onEdit,onStartDelete,onCancelDelete,onConfirmDelete}:{product:DashboardProductListItem;runtime:DashboardRuntime;deleting:boolean;confirmingDelete:boolean;onClose:()=>void;onEdit:()=>void;onStartDelete:()=>void;onCancelDelete:()=>void;onConfirmDelete:()=>void}){const[data,setData]=useState<DashboardProductDetail|null>(null);const[failed,setFailed]=useState(false);const load=useCallback(async()=>{try{setFailed(false);setData(await getDashboardProduct(runtime,product.id))}catch{setFailed(true)}},[runtime,product.id]);useEffect(()=>{void load()},[load]);return <div className="fixed inset-0 z-50 bg-black/35" role="dialog" aria-modal="true" aria-label={`تفاصيل ${product.name_ar}`} onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-[var(--color-surface)] p-5 shadow-2xl md:inset-y-0 md:left-0 md:right-auto md:w-[620px] md:rounded-none md:p-7" dir="rtl"><div className="flex items-start justify-between border-b border-[var(--color-border)] pb-4"><button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-lg hover:bg-[var(--color-bg)]" aria-label="إغلاق"><X size={20}/></button><div className="min-w-0 text-right"><h2 className="truncate text-xl font-bold">{product.name_ar}</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">SKU: {product.sku||'--'}</p></div></div>{failed?<div className="mt-5 rounded-xl bg-[#FFF1F1] p-4 text-sm text-[#9B2C2C]">تعذر تحميل كل تفاصيل المنتج. يمكنك المحاولة مرة أخرى أو فتح صفحة التعديل.</div>:!data?<div className="py-12 text-center text-sm text-[var(--color-text-muted)]">جاري تحميل تفاصيل المنتج...</div>:<div className="space-y-5 py-5"><section className="rounded-2xl bg-[var(--color-bg)] p-5"><div className="grid grid-cols-2 gap-4"><Fact label="التصنيف" value={data.product.category_name||product.category_name||'بدون تصنيف'}/><Fact label="القناة" value={data.product.channel}/><Fact label="النشر" value={data.product.public_visible&&data.product.status==='ACTIVE'&&data.product.availability==='AVAILABLE'?'ظاهر':'مخفي'}/><Fact label="السعر الأساسي" value={data.product.base_price_jod!=null?formatJod(Number(data.product.base_price_jod)):'--'}/></div></section>{data.product.short_description_ar?<section><h3 className="font-bold">وصف مختصر</h3><p className="mt-2 text-sm leading-7 text-[var(--color-text-muted)]">{data.product.short_description_ar}</p></section>:null}<section><h3 className="font-bold">الوحدات والصيغ</h3><div className="mt-3 space-y-2">{data.units.length?data.units.map(unit=><div key={unit.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3 text-sm"><span>{unit.label_ar}</span><strong>{unit.price_jod!=null?formatJod(Number(unit.price_jod)):'--'}</strong></div>):<p className="text-sm text-[var(--color-text-muted)]">لا توجد وحدات مضافة.</p>}</div></section></div>}<div className="sticky bottom-0 -mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 pt-4 md:-mx-7 md:px-7"><Button onClick={onEdit}><PencilSimple size={18}/>تعديل المنتج</Button>{confirmingDelete?<div className="flex items-center gap-2"><Button disabled={deleting} variant="danger" onClick={onConfirmDelete}>{deleting?'جاري الحذف...':'تأكيد الحذف'}</Button><Button variant="secondary" disabled={deleting} onClick={onCancelDelete}>إلغاء</Button></div>:<Button variant="danger" onClick={onStartDelete}><Trash size={18}/>حذف المنتج</Button>}</div></section></div>}
function Fact({label,value}:{label:string;value:string}){return <div><p className="text-xs text-[var(--color-text-muted)]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>}
