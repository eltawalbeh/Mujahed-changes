import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listDashboardRequests } from '@/data/dashboard'
import { useDashboard } from '@/state/DashboardContext'
import type { DashboardListResponse, DashboardRequestListItem } from '@/types/dashboard'
import { DashboardEmpty, DashboardError, DashboardLoading } from '@/components/dashboard/DashboardStates'
import { DashboardTable, DashboardTd, DashboardTr } from '@/components/dashboard/DashboardTable'
import { PaymentStatusBadge, RequestStatusBadge } from '@/components/dashboard/DashboardStatusBadge'
import Button from '@/components/ui/Button'
import { REQUEST_SOURCE_LABELS, REQUEST_SOURCES, REQUEST_STATUS_LABELS, REQUEST_STATUSES } from '@/domain/constants'
import ManualRequestDialog from '@/components/dashboard/ManualRequestDialog'

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'all'
function inPeriod(value: string, period: Period) { const date = new Date(value); const now = new Date(); const start = new Date(now); if (period === 'all') return true; if (period === 'today') return date.toDateString() === now.toDateString(); if (period === 'yesterday') { start.setDate(now.getDate() - 1); return date.toDateString() === start.toDateString() } start.setDate(now.getDate() - (period === 'week' ? 7 : 30)); return date >= start }

export default function RequestsPage() {
  const { runtime } = useDashboard()
  const [data, setData] = useState<DashboardListResponse<DashboardRequestListItem> | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [type, setType] = useState('')
  const [error, setError] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [period, setPeriod] = useState<Period>('all')

  const load = useCallback(async () => {
    try {
      setError(false)
      setData(await listDashboardRequests(runtime, { q, status, source, customerType: type }))
    } catch { setError(true) }
  }, [runtime, q, status, source, type])

  useEffect(() => { const timer = setTimeout(() => void load(), 180); return () => clearTimeout(timer) }, [load])

  if (error) return <DashboardError onRetry={() => void load()} />
  if (!data) return <DashboardLoading />
  const visibleItems = data.items.filter((request) => inPeriod(request.submitted_at, period))

  return (
    <main className="space-y-5 p-4 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3"><div className="text-right"><h2 className="text-xl font-bold">قائمة الطلبات</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">عرض، تصفية وتحديث جميع الطلبات الواردة لجميع قنوات الطلب</p></div><Button onClick={() => setManualOpen(true)}>إضافة طلب داخلي</Button></div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالمرجع، العميل أو الهاتف" className="h-11 rounded-lg border border-[var(--color-border)] bg-white px-3 outline-none xl:col-span-2" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-lg border border-[var(--color-border)] bg-white px-3">
            <option value="">كل الحالات</option>
            {REQUEST_STATUSES.map((value) => <option key={value} value={value}>{REQUEST_STATUS_LABELS[value]}</option>)}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="h-11 rounded-lg border border-[var(--color-border)] bg-white px-3">
            <option value="">كل المصادر</option>
            {REQUEST_SOURCES.map((value) => <option key={value} value={value}>{REQUEST_SOURCE_LABELS[value]}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-11 rounded-lg border border-[var(--color-border)] bg-white px-3">
            <option value="">B2C + B2B</option>
            <option value="B2C">B2C</option>
            <option value="B2B">B2B</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{([['today','اليوم'],['yesterday','أمس'],['week','الأسبوع الماضي'],['month','الشهر الماضي'],['all','كل الطلبات']] as Array<[Period,string]>).map(([value,label])=><button key={value} type="button" onClick={()=>setPeriod(value)} className={period===value?'rounded-lg bg-[var(--color-text)] px-3 py-2 text-xs font-semibold text-white':'rounded-lg bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-muted)]'}>{label}</button>)}</div>
        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
          <span>تم العثور على {visibleItems.length} طلباً</span>
          {(q || status || source || type) ? (
            <Button size="sm" variant="ghost" onClick={() => { setQ(''); setStatus(''); setSource(''); setType('') }}>مسح الفلاتر</Button>
          ) : <span>الفلاتر غير مفعلة</span>}
        </div>
      </section>

      {visibleItems.length === 0 ? (
        <DashboardEmpty title="لا توجد طلبات" description="لم يتم العثور على طلبات تطابق معايير البحث الحالية." action={{ label: 'مسح الفلاتر', onClick: () => { setQ(''); setStatus(''); setSource(''); setType('') } }} />
      ) : (
        <><div className="space-y-3 md:hidden">{visibleItems.map((request) => <Link key={request.id} to={`/dashboard/requests/${request.id}`} className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-right shadow-[0_4px_18px_rgba(29,23,20,.04)]"><div className="flex items-start justify-between gap-3"><div><p dir="ltr" className="text-sm font-bold text-[var(--color-text)]">{request.reference}</p><p className="mt-1 text-sm font-semibold">{request.customer_label}</p></div><RequestStatusBadge status={request.status} /></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-3 text-xs"><div><span className="block text-[var(--color-text-muted)]">الدفع</span><div className="mt-1"><PaymentStatusBadge status={request.payment_status} /></div></div><div><span className="block text-[var(--color-text-muted)]">الاستلام</span><strong className="mt-1 block">{request.fulfillment_type === 'DELIVERY' ? 'توصيل' : 'استلام'}</strong></div><div><span className="block text-[var(--color-text-muted)]">النوع والمصدر</span><strong className="mt-1 block">{request.customer_type} · {REQUEST_SOURCE_LABELS[request.source]}</strong></div><div><span className="block text-[var(--color-text-muted)]">تاريخ الطلب</span><strong className="mt-1 block">{new Date(request.submitted_at).toLocaleDateString('en-JO')}</strong></div></div><span className="mt-4 block text-left text-xs font-semibold text-[var(--color-accent)]">فتح الطلب ←</span></Link>)}</div><div className="hidden md:block"><DashboardTable headers={['إجراءات','تاريخ الطلب','المسؤول','نوع التوصيل','حالة الدفع','حالة الطلب','المصدر','النوع','العميل / الشركة','المرجع']} minWidth={1180}>
          {visibleItems.map((request) => (
            <DashboardTr key={request.id}>
              <DashboardTd><Link to={`/dashboard/requests/${request.id}`} className="rounded-lg bg-[var(--color-bg)] px-3 py-1.5 text-xs font-medium">تحديث</Link></DashboardTd>
              <DashboardTd className="text-xs text-[#78716C]">{new Date(request.submitted_at).toLocaleDateString('ar-JO')}</DashboardTd>
              <DashboardTd className="text-xs">{request.assigned_to ? 'مستخدم' : '--'}</DashboardTd>
              <DashboardTd>{request.fulfillment_type === 'DELIVERY' ? 'توصيل' : 'استلام'}</DashboardTd>
              <DashboardTd><PaymentStatusBadge status={request.payment_status} /></DashboardTd>
              <DashboardTd><RequestStatusBadge status={request.status} /></DashboardTd>
              <DashboardTd>{REQUEST_SOURCE_LABELS[request.source]}</DashboardTd>
              <DashboardTd>{request.customer_type}</DashboardTd>
              <DashboardTd className="font-semibold">{request.customer_label}</DashboardTd>
              <DashboardTd><Link to={`/dashboard/requests/${request.id}`} className="font-bold text-[var(--color-text-muted)]">{request.reference}</Link></DashboardTd>
            </DashboardTr>
          ))}
        </DashboardTable></div></>
      )}
    {manualOpen ? <ManualRequestDialog onClose={() => setManualOpen(false)} onCreated={() => void load()} /> : null}
    </main>
  )
}
