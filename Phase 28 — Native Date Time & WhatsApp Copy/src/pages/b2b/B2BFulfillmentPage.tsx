import { FormEvent, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import B2BHeader from '@/components/b2b/B2BHeader'
import B2BStepIndicator from '@/components/b2b/B2BStepIndicator'
import PublicFooter from '@/components/public/PublicFooter'
import Button from '@/components/ui/Button'
import FulfillmentToggle from '@/components/request/FulfillmentToggle'
import { FormField, TextAreaField } from '@/components/request/FormField'
import { useB2BRequestDraft } from '@/state/B2BRequestDraftContext'

export default function B2BFulfillmentPage() {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const { items, fulfillment, setFulfillment, generalNotes, setGeneralNotes } = useB2BRequestDraft()
  const [showErrors, setShowErrors] = useState(false)
  const errors = useMemo(() => ({
    address: fulfillment.type === 'DELIVERY' && !fulfillment.address?.trim() ? 'يرجى إدخال عنوان التوصيل.' : '',
    date: !fulfillment.preferredDate ? 'يرجى اختيار التاريخ المفضل.' : '',
    time: !fulfillment.preferredTime ? 'يرجى اختيار الوقت المفضل.' : '',
  }), [fulfillment])
  const valid = !errors.address && !errors.date && !errors.time
  if (!items.length) return <Navigate to="/business" replace />
  const submit = (event: FormEvent) => { event.preventDefault(); setShowErrors(true); if (valid) navigate('/business/request/review') }

  return <div className="min-h-screen bg-[var(--color-bg)]"><B2BHeader /><form onSubmit={submit} className="mx-auto max-w-[860px] px-4 py-6 md:py-10"><B2BStepIndicator step={2} title="تفاصيل التوصيل والاستلام" /><div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-8"><p className="mb-2 text-sm font-semibold">طريقة التجهيز المطلوبة *</p><FulfillmentToggle value={fulfillment.type} onChange={(type) => setFulfillment({ ...fulfillment, type })} />{fulfillment.type === 'DELIVERY' ? <div className="mt-6 space-y-5"><FormField label="عنوان التوصيل بالتفصيل *" name="b2b-address" value={fulfillment.address ?? ''} error={showErrors ? errors.address : undefined} onChange={(e) => setFulfillment({ ...fulfillment, address: e.target.value })} /><FormField label="تفاصيل إضافية للموقع (اختياري)" value={fulfillment.locationNotes ?? ''} onChange={(e) => setFulfillment({ ...fulfillment, locationNotes: e.target.value })} /><div className="grid gap-5 sm:grid-cols-2"><FormField label="التاريخ المفضل *" name="b2b-date" type="date" min={today} value={fulfillment.preferredDate ?? ''} error={showErrors ? errors.date : undefined} onChange={(e) => setFulfillment({ ...fulfillment, preferredDate: e.target.value })} /><FormField label="الوقت المفضل *" name="b2b-time" type="time" value={fulfillment.preferredTime ?? ''} error={showErrors ? errors.time : undefined} onChange={(e) => setFulfillment({ ...fulfillment, preferredTime: e.target.value })} /></div></div> : <div className="mt-6 space-y-5"><div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm text-[var(--color-text-muted)]">سيتم تجهيز طلبكم للاستلام من الموقع المعتمد، وسيتم تأكيد تفاصيل الاستلام معكم بعد مراجعة الطلب.</div><div className="grid gap-5 sm:grid-cols-2"><FormField label="التاريخ المفضل للاستلام *" name="b2b-date" type="date" min={today} value={fulfillment.preferredDate ?? ''} error={showErrors ? errors.date : undefined} onChange={(e) => setFulfillment({ ...fulfillment, preferredDate: e.target.value })} /><FormField label="الوقت المفضل للاستلام *" name="b2b-time" type="time" value={fulfillment.preferredTime ?? ''} error={showErrors ? errors.time : undefined} onChange={(e) => setFulfillment({ ...fulfillment, preferredTime: e.target.value })} /></div></div>}<div className="mt-6"><TextAreaField label="ملاحظات عامة للطلب" value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} rows={4} placeholder="أذكر هنا أي ملاحظات أو تفاصيل إضافية تخص طلبك..." /></div><div className="mt-8 flex gap-3"><Button type="button" variant="secondary" onClick={() => navigate('/business/request/company')}>السابق</Button><Button type="submit" className="flex-1">التالي</Button></div></div></form><PublicFooter /></div>
}
