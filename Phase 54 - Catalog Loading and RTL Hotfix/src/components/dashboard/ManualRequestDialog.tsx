import {useEffect,useMemo,useState} from 'react'
import {Plus,Trash,X,MagnifyingGlass} from '@phosphor-icons/react'
import Button from '@/components/ui/Button'
import {createDashboardManualRequest,listDashboardCustomers,listDashboardProducts} from '@/data/dashboard'
import {useDashboard} from '@/state/DashboardContext'
import type {DashboardCustomerListItem,DashboardProductListItem} from '@/types/dashboard'
import QuickCustomerDialog from './QuickCustomerDialog'

export default function ManualRequestDialog({onClose,onCreated}:{onClose:()=>void;onCreated:()=>void}){
  const {runtime}=useDashboard()
  const [type,setType]=useState<'B2B'|'B2C'>('B2C')
  const [customers,setCustomers]=useState<DashboardCustomerListItem[]>([])
  const [products,setProducts]=useState<DashboardProductListItem[]>([])
  const [customerId,setCustomerId]=useState('')
  const [source,setSource]=useState('PHONE')
  const [items,setItems]=useState<Array<{productId:string;quantity:number}>>([])
  const [filter,setFilter]=useState('')
  const [saving,setSaving]=useState(false)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [quickOpen,setQuickOpen]=useState(false)
  const loadCustomers=async()=>{const result=await listDashboardCustomers(runtime,{customerType:type,pageSize:100});setCustomers(result.items);return result.items}
  useEffect(()=>{
    let cancelled=false
    setLoading(true);setError('');setCustomerId('');setItems([]);setFilter('')
    const customersTask=listDashboardCustomers(runtime,{customerType:type,pageSize:100})
    const productsTask=listDashboardProducts(runtime,{status:'ACTIVE',pageSize:100})
    void Promise.all([customersTask,productsTask]).then(([c,p])=>{
      if(cancelled)return
      setCustomers(c.items)
      setProducts(p.items.filter(item=>item.channel===type||item.channel==='BOTH'))
    }).catch(()=>{if(!cancelled)setError('تعذر تحميل بيانات العملاء أو المنتجات. أغلق النافذة وحاول مجددًا.')})
      .finally(()=>{if(!cancelled)setLoading(false)})
    return()=>{cancelled=true}
  },[runtime,type])
  const visible=useMemo(()=>products.filter(p=>(p.name_ar+' '+(p.sku||'')).toLowerCase().includes(filter.toLowerCase().trim())),[products,filter])
  const toggle=(id:string)=>setItems(old=>old.some(item=>item.productId===id)?old.filter(item=>item.productId!==id):[...old,{productId:id,quantity:1}])
  const change=(id:string,quantity:number)=>setItems(old=>old.map(item=>item.productId===id?{...item,quantity:Math.max(1,quantity)}:item))
  const submit=async()=>{
    if(!customerId||!items.length)return
    try{setSaving(true);setError('');await createDashboardManualRequest(runtime,{customerType:type,customerId,source,items});onCreated();onClose()}
    catch(err:any){setError(String(err?.message||'تعذر إنشاء الطلب. تأكد من اختيار عميل ومنتج متاح.'))}
    finally{setSaving(false)}
  }
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
    <section dir="rtl" role="dialog" aria-modal="true" aria-labelledby="manual-request-title" className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-[var(--color-surface)] shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 text-right sm:px-6">
        <div className="min-w-0"><h2 id="manual-request-title" className="text-xl font-bold">إضافة طلب داخلي</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">سجّل طلبًا هاتفيًا أو من المحل بشكل سريع.</p></div>
        <button type="button" onClick={onClose} aria-label="إغلاق نافذة إضافة الطلب" title="إغلاق" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-bg)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"><X size={20}/></button>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 text-right sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">نوع العميل
            <select dir="rtl" value={type} onChange={e=>setType(e.target.value as 'B2B'|'B2C')} className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-right">
              <option value="B2C">عميل B2C</option><option value="B2B">شركة B2B</option>
            </select>
          </label>
          <label className="text-sm font-semibold">مصدر الطلب
            <select dir="rtl" value={source} onChange={e=>setSource(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-right">
              <option value="PHONE">هاتف</option><option value="WHATSAPP">واتساب</option><option value="WALK_IN">زيارة مباشرة</option><option value="INSTAGRAM">إنستغرام</option><option value="OTHER">أخرى</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold">اختر {type==='B2B'?'الشركة':'العميل'}</label>
            <div className="flex items-center gap-2">
              <select dir="rtl" aria-label="العميل" value={customerId} onChange={e=>setCustomerId(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 text-right">
                <option value="">اختر من العملاء المسجلين</option>
                {customers.map(customer=><option key={customer.id} value={customer.id}>{customer.company_name||customer.name}</option>)}
              </select>
              <button type="button" onClick={()=>setQuickOpen(true)} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 text-sm font-bold hover:bg-[var(--color-bg)]"><Plus size={17}/> إضافة عميل</button>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--color-border)] pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">المنتجات <span className="text-xs font-normal text-[var(--color-text-muted)]">({items.length} مختارة)</span></h3>
            <label className="relative w-full sm:max-w-[280px]"><MagnifyingGlass size={18} className="pointer-events-none absolute right-3 top-3.5 text-[var(--color-text-muted)]"/>
              <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="ابحث عن منتج" aria-label="بحث المنتجات" className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white pr-10 pl-3 text-right"/></label></div>
          {loading?<p role="status" className="rounded-xl bg-[var(--color-bg)] p-4 text-sm">جاري تحميل المنتجات...</p>:
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map(product=>{const item=items.find(i=>i.productId===product.id)
              return <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white p-3 text-right">
                <div className="min-w-0"><strong className="block text-sm">{product.name_ar}</strong>{type==='B2C'?<span dir="ltr" className="mt-1 block text-right text-xs text-[var(--color-text-muted)]">{product.base_price_jod??'—'} JOD</span>:<span className="text-xs text-[var(--color-text-muted)]">تسعير الشركات</span>}</div>
                {item?<div className="flex shrink-0 items-center gap-2">
                  <input aria-label={'كمية '+product.name_ar} type="number" min="1" value={item.quantity} onChange={e=>change(product.id,Number(e.target.value))} className="h-10 w-16 rounded-lg border border-[var(--color-border)] text-center"/>
                  <button type="button" onClick={()=>toggle(product.id)} aria-label={'حذف '+product.name_ar} className="grid size-10 place-items-center rounded-lg text-red-700 hover:bg-red-50"><Trash size={18}/></button></div>:
                  <button type="button" onClick={()=>toggle(product.id)} className="min-h-10 shrink-0 rounded-lg bg-[var(--color-text)] px-4 text-sm font-semibold text-white">إضافة</button>}
              </div>
            })}
            {!visible.length?<p className="text-sm text-[var(--color-text-muted)]">لا توجد منتجات مطابقة.</p>:null}
          </div>}
        </div>
        {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
        <Button disabled={loading||saving||!customerId||!items.length} onClick={()=>void submit()}>{saving?'جاري الإنشاء...':`إنشاء الطلب (${items.length})`}</Button>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
      </footer>
    </section>
    {quickOpen?<QuickCustomerDialog type={type} runtime={runtime} onClose={()=>setQuickOpen(false)} onCreated={id=>{setQuickOpen(false);void loadCustomers().then(()=>setCustomerId(id)).catch(()=>setError('تم الحفظ لكن تعذر تحديث قائمة العملاء'))}}/>:null}
  </div>
}
