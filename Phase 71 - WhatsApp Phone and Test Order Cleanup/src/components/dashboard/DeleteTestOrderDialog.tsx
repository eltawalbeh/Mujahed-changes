import { useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { deleteDashboardTestRequest, type DashboardRuntime } from '@/data/dashboard'
import Button from '@/components/ui/Button'

type Request = { id:string; reference:string; status:string; payment_status:string; invoice_issued_at?:string|null; invoice_number?:string|null }

export function canPermanentlyDeleteTestRequest(request: Request) {
  return ['NEW','CONTACT_REQUIRED','AWAITING_CONFIRMATION','CANCELLED'].includes(request.status)
    && request.payment_status === 'NOT_RECORDED'
    && !request.invoice_issued_at && !request.invoice_number
}

/** Only Super Admin can open this; SQL rechecks everything atomically on delete. */
export default function DeleteTestOrderDialog({
  request, runtime, onClose, onDeleted,
}:{
  request:Request;runtime:DashboardRuntime;onClose:()=>void;onDeleted:()=>void
}) {
  const [reference,setReference]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const allowed=canPermanentlyDeleteTestRequest(request)
  const confirmDelete=async()=>{
    if (!allowed || reference.trim()!==request.reference || busy) return
    try {
      setBusy(true);setError('')
      await deleteDashboardTestRequest(runtime,request.id,reference.trim())
      onDeleted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حذف الطلب.')
    } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4" dir="rtl" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
    <div role="dialog" aria-modal="true" aria-labelledby="delete-test-request-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-center gap-2 text-red-700"><Trash size={22}/><h2 id="delete-test-request-title" className="text-lg font-bold">حذف طلب تجريبي نهائيًا</h2></div>
      <p className="mt-3 text-sm leading-7">سيتم حذف الطلب <bdi dir="ltr" className="font-bold">{request.reference}</bdi> وجميع بنوده وملاحظاته وسجل نشاطه من نظام الطلبات والتقارير. لا يمكن التراجع عن الحذف من لوحة التحكم.</p>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">سيُحتفظ فقط بسجل تدقيق مختصر لإثبات عملية حذف الاختبار، بدون بيانات العميل الشخصية.</p>
      {!allowed?<p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">لا يمكن حذف طلب مدفوع أو مفوتر أو دخل مرحلة تنفيذ. يجب الاحتفاظ بسجله المالي.</p>:<>
        <label className="mt-5 block text-sm font-semibold" htmlFor="delete-test-reference">للتأكيد، اكتب رقم الطلب كما هو تمامًا</label>
        <input id="delete-test-reference" dir="ltr" autoComplete="off" value={reference} onChange={e=>setReference(e.target.value)} placeholder={request.reference} className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] px-3 font-mono text-sm"/>
      </>}
      {error?<p className="mt-3 text-sm text-red-700" role="alert">{error}</p>:null}
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" disabled={busy} onClick={onClose}>إلغاء</Button>
        <Button variant="danger" disabled={!allowed || busy || reference.trim()!==request.reference} onClick={()=>void confirmDelete()}>{busy?'جاري حذف الطلب...':'حذف الطلب نهائيًا'}</Button>
      </div>
    </div>
  </div>
}
