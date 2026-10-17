import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { formatJod } from '@/lib/format'
import type { InvoiceAdjustmentSummary } from '@/data/dashboard'

type Props = {
  item?: Record<string, any>
  summary: InvoiceAdjustmentSummary
  busy: boolean
  onSave: (type:'PERCENT'|'FIXED',value:number,reason:string,itemId?:string)=>Promise<void>
}
export default function InvoiceAdjustmentEditor({item,summary,busy,onSave}:Props){
  const [type,setType]=useState<'PERCENT'|'FIXED'>('FIXED')
  const [value,setValue]=useState('')
  const [reason,setReason]=useState('')
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const previousForItem=item?summary.adjustments.filter(a=>a.item_id===item.id).reduce((n,a)=>n+a.amount_jod,0):0
  const itemAmount=item?Math.max(0,Number(item.quantity??1)*Number(item.observed_base_price_jod??0)-Number(item.discount_amount_jod??0)-previousForItem):Infinity
  const limit=Math.min(summary.adjusted_balance_jod,itemAmount)
  const amount=type==='PERCENT'?Math.round(limit*Number(value)/100*1000)/1000:Number(value)
  const reasonValid=reason.trim().length>=10&&reason.trim().length<=1000
  const valid=value.trim()!==''&&Number.isFinite(amount)&&amount>0&&amount<=limit&&reasonValid&&Number(value)<=1000000
    &&(type!=='PERCENT'||Number(value)<=100)&&Number(value)>=0&&Math.round(Number(value)*1000)/1000===Number(value)
  useEffect(()=>{setType('FIXED');setValue('');setReason('');setError('')},[item?.id])
  const submit=async()=>{
    if(!valid||saving||busy)return
    try{
      setSaving(true);setError('')
      await onSave(type,Number(value),reason.trim(),item?.id)
      setValue('');setReason('')
    }catch(e:any){setError(e?.message||'تعذر حفظ مذكرة الخصم.')}
    finally{setSaving(false)}
  }
  return <div className="space-y-3 rounded-xl border border-[#E2CFB6] bg-[#FFFAF2] p-4" dir="rtl">
    <div>
      <h3 className="font-bold">{item?'خصم استثنائي · '+item.product_name_snapshot:'خصم استثنائي للفاتورة'}</h3>
      <p className="mt-1 text-xs leading-6 text-[#735643]">الفاتورة الأصلية محفوظة. سيتم إنشاء مذكرة خصم جديدة مع سبب وتاريخ واسم الموظف. الحد المتاح: <bdi dir="ltr">{formatJod(limit)}</bdi></p>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {([['PERCENT','نسبة %'],['FIXED','مبلغ JOD']] as const).map(([id,label])=>
        <button type="button" key={id} onClick={()=>{setType(id);setValue('')}} aria-pressed={type===id} disabled={busy||saving}
        className={'min-h-11 cursor-pointer rounded-xl border p-2 text-sm transition-all hover:border-[#B99061] hover:bg-[#F6EAD7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-50 '+(type===id?'border-[#765235] bg-[#F4E8D8] font-bold':'border-[#E0CDB9] bg-white')}>{label}</button>)}
    </div>
    <label className="block text-sm font-semibold">قيمة الخصم {type==='PERCENT'?'(%)':'(دينار)'}
      <input type="number" min="0" max={type==='PERCENT'?100:limit} step="0.001" inputMode="decimal" value={value}
        onChange={e=>setValue(e.target.value)} disabled={saving||busy}
        className="mt-2 h-11 w-full rounded-xl border border-[#E0CDB9] bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"/>
    </label>
    <label className="block text-sm font-semibold">سبب الخصم <span className="text-red-700">* إجباري</span>
      <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2} maxLength={1000} disabled={saving||busy}
        placeholder="مثال: تعويض العميل عن تأخير التسليم بناءً على موافقة الإدارة..."
        className="mt-2 w-full rounded-xl border border-[#E0CDB9] bg-white p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"/>
      <span className="mt-1 block text-xs font-normal text-[#806655]">على الأقل 10 أحرف · يُحفظ السبب في السجل المالي</span>
    </label>
    {value&&!Number.isNaN(amount)?<p className="text-sm">مذكرة خصم بقيمة <strong dir="ltr">{formatJod(amount)}</strong></p>:null}
    {error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}
    <Button disabled={!valid||saving||busy||limit<=0} onClick={()=>void submit()}>{saving?'جاري تسجيل التعديل...':'تسجيل مذكرة الخصم'}</Button>
  </div>
}
