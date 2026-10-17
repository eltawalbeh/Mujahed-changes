import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import ProductionShell from './ProductionShell'
import ProductionCard from './ProductionCard'
import StatePanel from '@/components/ui/StatePanel'
import { getProductionQueue, updateProductionStatus } from '@/data/production'
import { useProduction } from '@/state/ProductionContext'
import type { ProductionQueueResult, ProductionView } from '@/types/production'

const viewCopy: Record<ProductionView, { title: string; description: string }> = {
  ACTIVE: { title: 'قائمة الإنتاج النشطة', description: 'الطلبات المعتمدة وقيد التحضير فقط.' },
  READY: { title: 'الطلبات الجاهزة', description: 'طلبات جاهزة بانتظار موظف الإدارة لتأكيد الاستلام أو إرسال التوصيل.' },
  COMPLETED: { title: 'مكتمل اليوم', description: 'عرض للطلبات المكتملة اليوم فقط.' },
}

export default function ProductionBoard({ view }: { view: ProductionView }) {
  const { session, loading: sessionLoading, logout } = useProduction()
  const [data, setData] = useState<ProductionQueueResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  const load = useCallback(async () => {
    if (!session) return
    try {
      setLoading(true); setError('')
      setData(await getProductionQueue(session.token, view))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر تحميل قائمة الإنتاج.'
      if (message.includes('PRODUCTION_SESSION_EXPIRED')) {
        setError('انتهت جلسة المطبخ. أعد تسجيل الدخول.')
        await logout()
      } else {
        setError(message)
      }
    } finally { setLoading(false) }
  }, [session, view, logout])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!session) return
    const id = window.setInterval(() => void load(), 30000)
    const online = () => { setIsOnline(true); void load() }
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [session, load])

  if (sessionLoading) return <div className="grid min-h-screen place-items-center">جاري التحقق من جلسة الإنتاج...</div>
  if (!session) return <Navigate to="/kitchen" replace />

  const advance = async (request: NonNullable<ProductionQueueResult['items']>[number]) => {
    const target = request.status === 'APPROVED'
      ? 'PREPARING'
      : request.status === 'PREPARING'
        ? 'READY'
        : request.status === 'READY'
          ? request.fulfillmentType === 'COLLECTION' ? 'COMPLETED' : 'OUT_FOR_DELIVERY'
          : 'COMPLETED'
    if (request.status === 'COMPLETED') return
    try {
      setBusyId(request.id); setError('')
      await updateProductionStatus(session.token, request.id, target, request.status)
      await load()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر تحديث حالة الإنتاج.'
      if (message.includes('PRODUCTION_SESSION_EXPIRED')) {
        await logout()
      } else if (message.includes('PRODUCTION_CONCURRENT_UPDATE')) {
        setError('تم تحديث هذا الطلب من جهاز آخر. تم تحديث القائمة لعرض الحالة الأحدث.')
        await load()
      } else setError(message)
    } finally { setBusyId('') }
  }

  return <ProductionShell>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><button onClick={() => void load()} className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-bold">تحديث</button><div className="text-right"><h1 className="text-3xl font-bold md:text-4xl">{viewCopy[view].title}</h1><p className="mt-2 text-sm text-[var(--color-text-muted)]">{viewCopy[view].description}</p></div></div>
    {!isOnline ? <div className="mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center font-semibold">أنت غير متصل بالإنترنت. ستتم إعادة المحاولة عند عودة الاتصال.</div> : null}
    {error ? <div className="mb-5 rounded-2xl border border-[#E7B5B5] bg-[#FFF5F5] p-4 text-center text-sm font-semibold text-[#9B2C2C]">{error}</div> : null}
    {loading ? <div className="grid gap-5 md:grid-cols-2"><div className="h-80 animate-pulse rounded-3xl bg-[var(--color-surface)]"/><div className="h-80 animate-pulse rounded-3xl bg-[var(--color-surface)]"/></div> : data?.items.length ? <div className="grid gap-5 xl:grid-cols-2">{data.items.map((request) => <ProductionCard key={request.id} request={request} busy={busyId===request.id} onAdvance={view === 'ACTIVE' ? () => void advance(request) : undefined}/>)}</div> : <StatePanel title={view==='ACTIVE' ? 'لا توجد طلبات إنتاج نشطة' : view==='READY' ? 'لا توجد طلبات جاهزة حالياً' : 'لا توجد طلبات مكتملة اليوم'} description="ستظهر الطلبات هنا تلقائياً عندما تصل للحالة المناسبة." actionLabel="تحديث" onAction={() => void load()} />}
  </ProductionShell>
}