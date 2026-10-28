import { useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { removeDashboardRequest, type DashboardRuntime } from '@/data/dashboard'
import Button from '@/components/ui/Button'

type Order = { id: string; reference: string; status: string; payment_status: string; invoice_issued_at?: string | null; invoice_number?: string | null }

export default function DeleteTestOrderDialog({request,runtime,onClose,onDeleted}:{
  request: Order; runtime: DashboardRuntime; onClose:()=>void; onDeleted:()=>void
}) {
  const [reference,setReference]=useState('')
  const [reason,setReason]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const valid=reference.trim()===request.reference && reason.trim().length>=5 && reason.trim().length<=500
  const financial=Boolean(request.invoice_issued_at||request.invoice_number||request.payment_status!=='NOT_RECORDED')
  async function confirmRemove(){
    if(!valid||busy)return
    setBusy(true);setError('')
    try {
      await removeDashboardRequest(runtime,request.id,reference.trim(),reason.trim())
      onDeleted()
    } catch(e){ setError(e instanceof Error?e.message:'تعذر حذف الطلب.') }
    finally {setBusy(false)}
  }
  return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4" role="presentation" dir="rtl" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
    <div role="dialog" aria-modal="true" aria-labelledby="remove-request-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-center gap-2 text-red-700"><Trash size={22}/><h2 id="remove-request-title" className="text-lg font-bold">حذف الطلب من القوائم والتقارير</h2></div>
      <p className="mt-3 text-sm leading-7">سيختفي الطلب <bdi dir="ltr" className="font-semibold">{request.reference}</bdi> من صندوق الطلبات والتقارير وإحصائيات المبيعات التشغيلية. لا يمكن التراجع من لوحة التحكم.</p>
      {financial?<p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">هذا الطلب مدفوع أو مفوتر؛ ستبقى الفاتورة وحركة الدفع محفوظتين في السجل المالي للتدقيق، حتى عند إخفاء الطلب من مؤشرات التشغيل.</p>:null}
      <label htmlFor="remove-reason" className="mt-4 block text-sm font-bold">سبب الحذف <span className="text-red-700">*</span></label>
      <textarea id="remove-reason" autoFocus required minLength={5} maxLength={500} value={reason} rows={3} onChange={e=>setReason(e.target.value)} placeholder="مثال: طلب تجريبي خلال اختبار الموقع" className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white p-3 text-sm" />
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">السبب إلزامي (5 أحرف على الأقل) ويُحفظ مع سجل الإجراء.</p>
      <label htmlFor="remove-confirmation" className="mt-4 block text-sm font-bold">للتأكيد، اكتب رقم الطلب كاملًا</label>
      <input id="remove-confirmation" dir="ltr" autoComplete="off" value={reference} onChange={e=>setReference(e.target.value)} placeholder={request.reference} className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-sm" />
      {error?<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>:null}
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button variant="danger" onClick={()=>void confirmRemove()} disabled={!valid||busy}>{busy?'جاري الحذف...':'تأكيد الحذف'}</Button>
      </div>
    </div>
  </div>
}
