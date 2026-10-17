import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { formatJod } from '@/lib/format'

type Props = {
  item: Record<string, any>
  editable: boolean
  busy: boolean
  onSave: (amount: number) => Promise<void>
}
export default function ItemDiscountEditor({item,editable,busy,onSave}:Props) {
  const saved=Number(item.discount_amount_jod??0)
  const limit=Math.max(0,Number(item.observed_base_price_jod??0)*Number(item.quantity??1))
  const [input,setInput]=useState(String(saved))
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  useEffect(()=>{setInput(String(saved));setError('')},[item.id,saved])
  const parsed=Number(input)
  const invalid=input.trim()===''||!Number.isFinite(parsed)||parsed<0||parsed>limit||Math.round(parsed*1000)/1000!==parsed
  const changed=Math.abs(parsed-saved)>0.0001
  const apply=async()=>{
    if(invalid){setError('الخصم يجب أن يكون بين صفر وقيمة المنتج، وبحد أقصى 3 منازل عشرية.');return}
    try{setSaving(true);setError('');await onSave(parsed)}
    catch(e:any){setError(String(e?.message??'تعذر حفظ خصم المنتج.'))}
    finally{setSaving(false)}
  }
  return <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] py-4 last:border-0" dir="rtl">
    <div className="min-w-0 flex-1">
      <strong className="block text-sm">{item.product_name_snapshot||'المنتج'}</strong>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">الكمية: {item.quantity} · السعر قبل الخصم: {formatJod(limit)}</p>
    </div>
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-[135px] text-xs font-semibold">خصم المنتج (د.أ)
        <input type="number" inputMode="decimal" step="0.001" min="0" max={limit} value={input}
          disabled={!editable||busy||saving} onChange={e=>setInput(e.target.value)}
          aria-invalid={invalid} className="mt-2 block h-11 w-36 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm disabled:bg-[var(--color-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"/>
      </label>
      <Button variant="secondary" disabled={!editable||busy||saving||invalid||!changed} onClick={()=>void apply()}>{saving?'جاري الحفظ...':'حفظ الخصم'}</Button>
    </div>
    {error?<p role="alert" className="w-full text-xs text-red-700">{error}</p>:null}
  </div>
}
