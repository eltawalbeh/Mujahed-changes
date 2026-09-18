import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listDashboardRequests } from '@/data/dashboard'
import { useDashboard } from '@/state/DashboardContext'
import type { DashboardRequestListItem } from '@/types/dashboard'
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardStates'
import { reportLabel } from '@/domain/reporting'
import { supabase } from '@/lib/supabase'

type NotificationItem = {
  id: string
  requestId: string
  title: string
  description: string
  tone: 'urgent' | 'info' | 'success'
}

function buildNotifications(items: DashboardRequestListItem[]): NotificationItem[] {
  const result: NotificationItem[] = []
  items.forEach((item) => {
    if (item.status === 'NEW') result.push({ id: item.id + '-new', requestId: item.id, title: 'طلب جديد يحتاج مراجعة', description: item.reference + ' · ' + item.customer_label, tone: 'urgent' })
    if (item.status === 'AWAITING_CONFIRMATION') result.push({ id: item.id + '-confirmation', requestId: item.id, title: 'طلب بانتظار التأكيد', description: item.reference + ' · ' + item.customer_label, tone: 'info' })
    if (item.status === 'READY' && item.fulfillment_type === 'DELIVERY') result.push({ id: item.id + '-delivery', requestId: item.id, title: 'طلب جاهز للتوصيل', description: item.reference + ' · ' + item.customer_label, tone: 'success' })
    if (item.status === 'OUT_FOR_DELIVERY') result.push({ id: item.id + '-out', requestId: item.id, title: 'طلب خارج للتوصيل', description: item.reference + ' · ' + item.customer_label, tone: 'info' })
    if (item.customer_type === 'B2B' && item.payment_status === 'MONTHLY_B2B_ACCOUNT' && item.status !== 'COMPLETED' && item.status !== 'CANCELLED') result.push({ id: item.id + '-b2b', requestId: item.id, title: 'طلب B2B على الحساب الشهري', description: reportLabel(item.payment_status) + ' · ' + item.reference, tone: 'info' })
  })
  return result
}

export default function NotificationsPage() {
  const { runtime } = useDashboard()
  const [items, setItems] = useState<DashboardRequestListItem[] | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(false)
      const response = await listDashboardRequests(runtime, { pageSize: 100 })
      setItems(response.items)
    } catch {
      setError(true)
    }
  }, [runtime])

  useEffect(() => {
    void load()
    const channel = supabase.channel('dashboard-notifications-page').on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'requests' },
      () => void load(),
    ).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [load])

  if (error) return <DashboardError onRetry={() => void load()} />
  if (!items) return <DashboardLoading />

  const notifications = buildNotifications(items)

  return (
    <main className="space-y-6 p-4 lg:p-8" dir="rtl">
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h1 className="text-xl font-bold">التنبيهات التشغيلية</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">تنبيهات مشتقة من حالات الطلبات الحالية وتساعد الفريق على معرفة الإجراء التالي.</p>
      </section>
      {notifications.length ? (
        <section className="space-y-3">
          {notifications.map((item) => (
            <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
              <Link to={'/dashboard/requests/' + item.requestId} className="min-h-11 rounded-lg border border-[var(--color-border)] px-4 py-2 text-center text-sm font-semibold outline-none hover:bg-[var(--color-bg)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2">فتح الطلب</Link>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className={item.tone === 'urgent' ? 'size-2 rounded-full bg-[#C62828]' : item.tone === 'success' ? 'size-2 rounded-full bg-[#2E7D32]' : 'size-2 rounded-full bg-[var(--color-accent)]'} />
                  <h2 className="font-bold">{item.title}</h2>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.description}</p>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <h2 className="font-bold">لا توجد تنبيهات حالية</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">عند وصول طلبات جديدة أو تغيّر حالتها ستظهر هنا.</p>
        </section>
      )}
    </main>
  )
}
