import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  addDashboardRequestNote,
  getDashboardRequest,
  linkDashboardRequestCustomer,
  updateDashboardItemDiscount,
  updateDashboardPayment,
  updateDashboardRequestStatus,
  markDashboardRequestPersonal,
} from '@/data/dashboard'
import { useDashboard } from '@/state/DashboardContext'
import type { DashboardRequestDetail } from '@/types/dashboard'
import { DashboardError, DashboardLoading, DashboardRestricted } from '@/components/dashboard/DashboardStates'
import { PaymentStatusBadge, RequestStatusBadge } from '@/components/dashboard/DashboardStatusBadge'
import InvoicePanel from '@/components/dashboard/InvoicePanel'
import PaymentWorkflowPanel from '@/components/dashboard/PaymentWorkflowPanel'
import DashboardSelect from '@/components/dashboard/DashboardSelect'
import DeliveryActions from '@/components/dashboard/DeliveryActions'
import { canLinkCustomers, canManagePricing } from '@/lib/dashboardPermissions'
import { formatJod } from '@/lib/format'
import Button from '@/components/ui/Button'
import { REQUEST_STATUS_LABELS } from '@/domain/constants'

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:p-6"><h2 className="font-bold">{title}</h2><div className="mt-4 border-t border-[var(--color-border)] pt-4">{children}</div></section>
}

function manualStatusOptions(status: string) {
  if (status === 'NEW' || status === 'CONTACT_REQUIRED') return [status, 'AWAITING_CONFIRMATION', 'CANCELLED']
  if (status === 'AWAITING_CONFIRMATION') return [status, 'CANCELLED']
  if (status === 'APPROVED' || status === 'PREPARING' || status === 'READY' || status === 'OUT_FOR_DELIVERY') return [status, 'CANCELLED']
  return [status]
}

export default function RequestDetailsPage() {
  const { id = '' } = useParams()
  const { runtime, role } = useDashboard()
  const [data, setData] = useState<DashboardRequestDetail | null>(null)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [restricted, setRestricted] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    try { setError(false); setData(await getDashboardRequest(runtime, id)) }
    catch { setError(true) }
  }, [runtime, id])

  useEffect(() => { void load() }, [load])

  const total = useMemo(() => {
    if (!data) return 0
    const request = data.request
    return Number(request.final_total_jod || request.estimated_subtotal || 0)
  }, [data])

  if (error) return <DashboardError onRetry={() => void load()} />
  if (!data) return <DashboardLoading />
  if (restricted) return <DashboardRestricted />

  const request = data.request
  const b2b = request.customer_type === 'B2B'
  const label = b2b ? request.company_name_snapshot || request.customer_name_snapshot : request.customer_name_snapshot

  const mutate = async (operation: () => Promise<DashboardRequestDetail>) => {
    try {
      setSaving(true); setRestricted(false)
      setData(await operation())
    } catch (err: any) {
      const message = String(err?.message ?? err)
      if (message.includes('permission')) setRestricted(true)
      else setError(true)
    } finally { setSaving(false) }
  }

  return (
    <main className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <DashboardSelect value={request.status} disabled={saving} className="min-w-[220px]" onChange={(e) => void mutate(() => updateDashboardRequestStatus(runtime, id, e.target.value))}>{manualStatusOptions(request.status).map((status) => <option key={status} value={status}>{REQUEST_STATUS_LABELS[status]}</option>)}</DashboardSelect>
          <Button variant="secondary" disabled>تعديل الطلب</Button>
          <Button variant="ghost" onClick={() => void mutate(() => updateDashboardRequestStatus(runtime, id, 'CANCELLED'))}>إلغاء الطلب</Button>
        </div>
        <div className="text-sm text-[var(--color-text-muted)]"><Link to="/dashboard/requests">الطلبات</Link> ‹ <strong>{request.reference}</strong></div>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:flex-row md:items-center md:justify-between lg:p-6">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)]">
          <RequestStatusBadge status={request.status} />
          <PaymentStatusBadge status={request.payment_status} />
          <DeliveryActions
            status={request.status}
            busy={saving}
            onChange={(status) => void mutate(() => updateDashboardRequestStatus(runtime, id, status))}
          />
          <span>بواسطة: {request.source}</span>
          {request.requires_reapproval ? <span className="rounded-full bg-[#FFF3E0] px-3 py-1 text-[#E65100]">يتطلب إعادة مراجعة</span> : null}
        </div>
        <div className="flex items-center gap-2"><h1 className="text-2xl font-bold">طلب #{request.reference}</h1><span className="rounded-md bg-[var(--color-bg)] px-2 py-1 text-xs">{b2b ? 'طلب شركات B2B' : 'طلب أفراد B2C'}</span></div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]" dir="ltr">
        <div dir="rtl" className="space-y-6">
          <Card title={b2b ? 'معلومات الشركة' : 'معلومات العميل'}>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div><p className="text-xs text-[#A8A29E]">{b2b ? 'اسم الشركة' : 'اسم العميل'}</p><p className="mt-1 font-semibold">{label}</p></div>
              <div><p className="text-xs text-[#A8A29E]">رقم الهاتف</p><p className="mt-1">{request.customer_phone_snapshot}</p></div>
              <div><p className="text-xs text-[#A8A29E]">البريد الإلكتروني</p><p className="mt-1">{request.customer_email_snapshot || '--'}</p></div>
              {b2b ? <div><p className="text-xs text-[#A8A29E]">جهة التواصل</p><p className="mt-1">{request.contact_name_snapshot || '--'}</p></div> : null}
            </div>

            {data.possibleCustomers.length ? (
              <div className="mt-5 rounded-xl border border-[var(--color-accent)] bg-[var(--color-bg)] p-4">
                <p className="text-sm font-semibold">Possible Existing Customer</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">تم العثور على تطابق دقيق محتمل. لا يتم الدمج تلقائياً.</p>
                {data.possibleCustomers.slice(0, 3).map((candidate) => (
                  <div key={candidate.id} className="mt-3 flex items-center justify-between gap-3 text-sm">
                    {canLinkCustomers(role) ? <Button size="sm" variant="secondary" onClick={() => void mutate(() => linkDashboardRequestCustomer(runtime, id, candidate.id))}>ربط يدوياً</Button> : <span className="text-xs text-[#A8A29E]">يتطلب مدير</span>}
                    <span>{candidate.company_name || candidate.name} · {candidate.match_reason}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {b2b && request.source === 'WEBSITE' ? <div className="mt-5 border-t border-[var(--color-border)] pt-4"><Button size="sm" variant="ghost" disabled={saving} onClick={() => void mutate(() => markDashboardRequestPersonal(runtime, id))}>هذا الطلب شخصي وليس للشركة</Button><p className="mt-2 text-xs text-[var(--color-text-muted)]">استخدمه فقط إذا تبيّن أن الرقم يعود لموظف يطلب لنفسه.</p></div> : null}
          </Card>

          <Card title="المنتجات المطلوبة">
            <div className="space-y-3">
              {data.items.map((item) => {
                const base = Number(item.observed_base_price_jod ?? 0)
                const discount = Number(item.discount_amount_jod ?? 0)
                const finalLine = Number(item.final_line_total_jod || base * Number(item.quantity) - discount)
                return (
                  <div key={item.id} className="rounded-xl border border-[var(--color-border)] bg-white p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center" dir="ltr">
                      <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-[var(--color-bg)]">♨</div>
                      <div dir="rtl" className="min-w-0 flex-1 text-right">
                        <p className="font-semibold">{item.product_name_snapshot} ({item.unit_label_snapshot})</p>
                        <p className="mt-1 text-xs text-[#78716C]">الكمية: {item.quantity}{item.customization_label_snapshot?.length ? ` · ${item.customization_label_snapshot.join(' · ')}` : ''}</p>
                      </div>
                      <div dir="rtl" className="flex flex-wrap items-center gap-4 text-xs">
                        <div><span className="text-[#A8A29E]">السعر الأساسي</span><strong className="block">{base ? `${formatJod(base)} / وحدة` : 'حسب السعر الحالي'}</strong></div>
                        <div><span className="text-[#A8A29E]">الخصم</span>
                          {canManagePricing(role) ? (
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              defaultValue={discount}
                              onBlur={(e) => void mutate(() => updateDashboardItemDiscount(runtime, id, item.id, Number(e.target.value || 0)))}
                              className="mt-1 block h-8 w-24 rounded border border-[var(--color-border)] px-2"
                            />
                          ) : <strong className="block text-[#C62828]">{formatJod(discount)}</strong>}
                        </div>
                        <div className="rounded-lg bg-[var(--color-bg)] px-3 py-2"><span className="text-[#78716C]">السعر النهائي</span><strong className="block">{formatJod(finalLine)}</strong></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card title="التوصيل والاستلام">
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div><span className="text-xs text-[#A8A29E]">نوع الاستلام</span><p>{request.fulfillment_type === 'DELIVERY' ? 'توصيل' : 'استلام'}</p></div>
              <div><span className="text-xs text-[#A8A29E]">عنوان التوصيل</span><p>{request.delivery_address || '--'}</p></div>
              <div><span className="text-xs text-[#A8A29E]">التاريخ والوقت المفضل</span><p>{request.preferred_date || '--'} {request.preferred_time || ''}</p></div>
            </div>
            {request.general_notes ? <div className="mt-4 border-t border-[var(--color-border)] pt-4 text-sm"><span className="text-xs text-[#A8A29E]">ملاحظات عامة من العميل</span><p className="mt-1">{request.general_notes}</p></div> : null}
          </Card>
        </div>

        <aside dir="rtl" className="space-y-6">
          <Card title="المالية والدفع">
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between"><PaymentStatusBadge status={request.payment_status} /><span className="text-[var(--color-text-muted)]">حالة الدفع</span></div>
              <div className="flex items-center justify-between"><strong>{request.payment_method || '--'}</strong><span className="text-[var(--color-text-muted)]">طريقة الدفع</span></div>
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4"><strong className="text-xl text-[var(--color-text-muted)]">{formatJod(total)}</strong><span>المبلغ الإجمالي</span></div>
              <PaymentWorkflowPanel request={request} busy={saving} onSave={async (status, method) => { await mutate(() => updateDashboardPayment(runtime, id, status, method)) }} />
            </div>
          </Card>

          <InvoicePanel request={request} items={data.items} />

          <Card title="ملاحظات داخلية">
            <div className="space-y-3">
              {data.notes.map((item) => <div key={item.id} className="rounded-lg bg-[var(--color-bg)] p-3 text-sm">{item.body}<p className="mt-1 text-[11px] text-[#A8A29E]">بواسطة لوحة التحكم</p></div>)}
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="أضف ملاحظة داخلية" className="w-full rounded-lg border border-[var(--color-border)] bg-white p-3 text-sm outline-none" />
              <Button variant="secondary" className="w-full" disabled={!note.trim()} onClick={() => void mutate(async () => { const result = await addDashboardRequestNote(runtime, id, note); setNote(''); return result })}>إضافة ملاحظة</Button>
            </div>
          </Card>

          <Card title="سجل النشاط">
            <div className="space-y-4">
              {data.activity.map((item) => <div key={item.id} className="flex gap-3 text-sm"><span className="mt-2 size-2 rounded-full bg-[var(--color-text-muted)]" /><div><p className="font-medium">{item.description}</p><p className="text-xs text-[#A8A29E]">{new Date(item.created_at).toLocaleString('ar-JO')}</p></div></div>)}
            </div>
          </Card>
        </aside>
      </div>
    </main>
  )
}
