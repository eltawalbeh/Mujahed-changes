import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { formatJod } from '@/lib/format'

export type DiscountType = 'NONE' | 'PERCENT' | 'FIXED'

type Props = {
  request: Record<string, any>
  busy: boolean
  editable: boolean
  onSave: (type: DiscountType, value: number, reason: string) => Promise<void>
}

export default function OrderDiscountEditor({ request, busy, editable, onSave }: Props) {
  const [type, setType] = useState<DiscountType>('NONE')
  const [value, setValue] = useState('0')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    setType((request.order_discount_type || 'NONE') as DiscountType)
    setValue(String(request.order_discount_value ?? 0))
    setReason(request.order_discount_reason ?? '')
  }, [request.id, request.order_discount_type, request.order_discount_value, request.order_discount_reason])
  const base = Math.max(0, Number(request.estimated_subtotal ?? 0) - Number(request.customer_discount_jod ?? 0) -
    Number(request.discount_total_jod ?? request.discount_amount_jod ?? 0) + Number(request.customer_discount_jod ?? 0) + Number(request.order_discount_jod ?? 0))
  const amount = type === 'PERCENT' ? base * Number(value || 0) / 100 : type === 'FIXED' ? Number(value || 0) : 0
  const valid = type === 'NONE' || (Number.isFinite(Number(value)) && Number(value) >= 0 &&
    (type !== 'PERCENT' || Number(value) <= 100) && (type !== 'FIXED' || Number(value) <= base))
  const submit = async () => {
    if (!valid) { setError('قيمة الخصم غير صالحة أو تتجاوز المبلغ المتبقي.'); return }
    try { setError(''); await onSave(type, type === 'NONE' ? 0 : Number(value), reason) }
    catch { setError('تعذر تسجيل الخصم. تأكد من الصلاحيات وأن الفاتورة لم تُصدر بعد.') }
  }
  return <div className="space-y-3" dir="rtl">
    <div className="flex items-center justify-between"><h3 className="font-bold">خصم إضافي للطلب</h3><span className="text-xs text-[var(--color-text-muted)]">B2C / B2B</span></div>
    <p className="text-xs text-[var(--color-text-muted)]">يُحسب بعد خصومات المنتجات والخصم الدائم، وقبل إصدار الفاتورة.</p>
    <div className="grid gap-2 sm:grid-cols-3">
      {([['NONE','بدون خصم'],['PERCENT','نسبة %'],['FIXED','مبلغ JOD']] as const).map(([id,label]) =>
        <button type="button" key={id} disabled={!editable || busy} onClick={() => setType(id)}
          aria-pressed={type === id} className={'min-h-11 rounded-xl border px-3 text-sm ' +
            (type === id ? 'border-[var(--color-text)] bg-[var(--color-bg)] font-bold' : 'border-[var(--color-border)]')}>{label}</button>)}
    </div>
    {type !== 'NONE' ? <label className="block text-sm">قيمة الخصم ({type === 'PERCENT' ? '%' : 'د.أ'})
      <input type="number" min="0" max={type === 'PERCENT' ? '100' : undefined} step="0.001"
        value={value} disabled={!editable || busy} onChange={e=>setValue(e.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3" />
    </label> : null}
    <label className="block text-sm">سبب الخصم (اختياري)
      <input value={reason} disabled={!editable || busy} onChange={e=>setReason(e.target.value)} maxLength={300}
        className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3" placeholder="مثال: عرض خاص" />
    </label>
    {type !== 'NONE' ? <p className="text-sm text-[var(--color-text-muted)]">قيمة الخصم المتوقعة: {formatJod(Math.min(Math.max(0, amount),base))}</p> : null}
    {!editable ? <p className="text-xs text-[var(--color-text-muted)]">يمكن تعديل الخصم بواسطة الإدارة قبل إصدار الفاتورة فقط.</p> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <Button disabled={!editable || busy || !valid} onClick={()=>void submit()}>{busy?'جاري الحفظ...':'تطبيق خصم الطلب'}</Button>
  </div>
}
