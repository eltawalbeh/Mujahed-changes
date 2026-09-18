import { useCallback, useEffect, useState } from 'react'
import { listDashboardRequests } from '@/data/dashboard'
import { useDashboard } from '@/state/DashboardContext'
import type { DashboardRequestListItem } from '@/types/dashboard'
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardStates'
import { buildRequestReport, reportLabel } from '@/domain/reporting'
import { formatJod } from '@/lib/format'
import { ArrowClockwise } from '@phosphor-icons/react'

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'all'
function inPeriod(value: string, period: Period) { const date = new Date(value); const now = new Date(); const start = new Date(now); if (period === 'all') return true; if (period === 'today') return date.toDateString() === now.toDateString(); if (period === 'yesterday') { start.setDate(now.getDate() - 1); return date.toDateString() === start.toDateString() } const days = period === 'week' ? 7 : 30; start.setDate(now.getDate() - days); return date >= start }

export default function ReportsPage() {
  const { runtime } = useDashboard()
  const [items, setItems] = useState<DashboardRequestListItem[] | null>(null)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState<Period>('month')

  const load = useCallback(async () => {
    try {
      setError(false)
      const response = await listDashboardRequests(runtime, { pageSize: 100 })
      setItems(response.items)
    } catch {
      setError(true)
    }
  }, [runtime])

  useEffect(() => { void load() }, [load])

  if (error) return <DashboardError onRetry={() => void load()} />
  if (!items) return <DashboardLoading />

  const visibleItems = items.filter((item) => inPeriod(item.submitted_at, period))
  const report = buildRequestReport(visibleItems)
  const statusEntries = Object.entries(report.statusCounts).sort((a, b) => b[1] - a[1])
  const paymentEntries = Object.entries(report.paymentCounts).sort((a, b) => b[1] - a[1])

  return (
    <main className="space-y-6 p-4 lg:p-8" dir="rtl">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div>
          <h1 className="text-xl font-bold">التقارير والتحليلات</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">ملخص تشغيلي مبني على الطلبات المتاحة حاليًا.</p>
        </div>
        <button type="button" onClick={() => void load()} className="grid size-11 place-items-center rounded-lg border border-[var(--color-border)] outline-none hover:bg-[var(--color-bg)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2" aria-label="تحديث التقرير"><ArrowClockwise size={19} /></button>
      </section>
      <section className="flex flex-wrap gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">{([['today','اليوم'],['yesterday','أمس'],['week','آخر 7 أيام'],['month','آخر 30 يوم'],['all','كل الوقت']] as Array<[Period,string]>).map(([value,label])=><button key={value} type="button" onClick={()=>setPeriod(value)} className={period===value?'rounded-lg bg-[var(--color-text)] px-3 py-2 text-sm font-semibold text-white':'rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]'}>{label}</button>)}</section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['إجمالي الطلبات', String(report.total)],
          ['قيمة الطلبات', formatJod(report.totalValue)],
          ['متوسط الطلب', formatJod(report.averageValue)],
          ['طلبات B2B', String(report.b2b)],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><p className="text-sm text-[var(--color-text-muted)]">{label}</p><strong className="mt-2 block text-2xl">{value}</strong></div>)}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="font-bold">توزيع نوع العملاء</h2>
          <div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span>{report.b2c}</span><span>B2C</span></div><div className="flex justify-between"><span>{report.b2b}</span><span>B2B</span></div></div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="font-bold">طريقة التنفيذ</h2>
          <div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span>{report.delivery}</span><span>توصيل</span></div><div className="flex justify-between"><span>{report.collection}</span><span>استلام</span></div></div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="font-bold">الطلبات حسب الحالة</h2>
          <div className="mt-4 space-y-3 text-sm">{statusEntries.map(([key, value]) => <div key={key} className="flex justify-between gap-4"><span>{value}</span><span>{reportLabel(key)}</span></div>)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="font-bold">الطلبات حسب الدفع</h2>
          <div className="mt-4 space-y-3 text-sm">{paymentEntries.map(([key, value]) => <div key={key} className="flex justify-between gap-4"><span>{value}</span><span>{reportLabel(key)}</span></div>)}</div>
        </div>
      </section>
    </main>
  )
}
