import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import DashboardSelect from '@/components/dashboard/DashboardSelect'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/domain/constants'

type Props = { request: Record<string, any>; busy: boolean; onSave: (status: string, method?: string | null) => Promise<void> }

export default function PaymentWorkflowPanel({ request, busy, onSave }: Props) {
  const [mode, setMode] = useState<'PAID' | 'CASH_ON_DELIVERY' | 'MONTHLY_B2B_ACCOUNT' | ''>('')
  const [method, setMethod] = useState('')
  useEffect(() => { setMode(''); setMethod('') }, [request.id, request.status, request.payment_status])
  const awaitingConfirmation = request.status === 'AWAITING_CONFIRMATION'
  const alreadyProcessed = request.payment_status !== 'UNPAID' && request.payment_status !== 'PENDING'
  if (alreadyProcessed) return <div className="rounded-xl bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text-muted)]">تم تسجيل الدفع بالفعل. حالة الطلب الآن تُدار من سير الإنتاج والتسليم.</div>
  if (!awaitingConfirmation) return <div className="rounded-xl bg-[var(--color-bg)] p-3 text-sm leading-6 text-[var(--color-text-muted)]">ابدأ متابعة الطلب أولاً. بعد تأكيد التفاصيل مع العميل ستظهر خيارات الدفع هنا.</div>
  return <div className="space-y-3"><p className="text-sm font-semibold">تأكيد الدفع واعتماد الطلب</p><div className="grid gap-2"><button type="button" onClick={() => setMode('PAID')} className={mode === 'PAID' ? 'rounded-xl border border-[var(--color-accent)] bg-[var(--color-bg)] p-3 text-right text-sm font-semibold' : 'rounded-xl border border-[var(--color-border)] p-3 text-right text-sm'}>تم الدفع الآن</button><button type="button" onClick={() => setMode('CASH_ON_DELIVERY')} className={mode === 'CASH_ON_DELIVERY' ? 'rounded-xl border border-[var(--color-accent)] bg-[var(--color-bg)] p-3 text-right text-sm font-semibold' : 'rounded-xl border border-[var(--color-border)] p-3 text-right text-sm'}>الدفع عند الاستلام</button>{request.customer_type === 'B2B' ? <button type="button" onClick={() => setMode('MONTHLY_B2B_ACCOUNT')} className={mode === 'MONTHLY_B2B_ACCOUNT' ? 'rounded-xl border border-[var(--color-accent)] bg-[var(--color-bg)] p-3 text-right text-sm font-semibold' : 'rounded-xl border border-[var(--color-border)] p-3 text-right text-sm'}>حساب الشركة الشهري</button> : null}</div>{mode === 'PAID' ? <DashboardSelect value={method} disabled={busy} onChange={(event) => setMethod(event.target.value)}><option value="">اختر طريقة الدفع</option>{PAYMENT_METHODS.filter((value) => value !== 'B2B_MONTHLY_ACCOUNT').map((value) => <option key={value} value={value}>{PAYMENT_METHOD_LABELS[value]}</option>)}</DashboardSelect> : null}<Button className="w-full" disabled={busy || !mode || (mode === 'PAID' && !method)} onClick={() => void onSave(mode, mode === 'PAID' ? method : null)}>{mode ? 'تأكيد واعتماد الطلب' : 'اختر طريقة الدفع'}</Button><p className="text-center text-xs leading-5 text-[var(--color-text-muted)]">بعد التأكيد ينتقل الطلب تلقائياً إلى سير العمل التشغيلي.</p></div>
}
