import Button from '@/components/ui/Button'
import type { ProductionRequestCard } from '@/types/production'

function fulfillmentLabel(value: string) {
  return value === 'DELIVERY' ? 'توصيل' : 'استلام من المطبخ'
}

function statusLabel(value: string) {
  if (value === 'APPROVED') return 'معتمد'
  if (value === 'PREPARING') return 'قيد التحضير'
  if (value === 'READY') return 'جاهز'
  if (value === 'OUT_FOR_DELIVERY') return 'خارج للتوصيل'
  if (value === 'COMPLETED') return 'مكتمل'
  return value
}

export default function ProductionCard({
  request,
  busy,
  onAdvance,
}: {
  request: ProductionRequestCard
  busy?: boolean
  onAdvance?: () => void
}) {
  const actionLabel = request.status === 'APPROVED'
    ? 'بدء التحضير'
    : request.status === 'PREPARING'
      ? 'تحديد كجاهز'
      : request.status === 'READY'
        ? request.fulfillmentType === 'COLLECTION' ? 'تأكيد الاستلام' : 'إرسال للتوصيل'
        : request.status === 'OUT_FOR_DELIVERY'
          ? 'تأكيد التسليم والإكمال'
          : null
  return (
    <article className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_8px_30px_rgba(29,23,20,.05)] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div className="text-left" dir="ltr"><p className="font-mono text-sm font-bold">{request.reference}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{request.preferredDate ?? '—'} {request.preferredTime?.slice(0,5) ?? ''}</p></div>
        <div className="text-right"><p className="text-xl font-bold md:text-2xl">{request.customerLabel}</p><div className="mt-2 flex flex-wrap justify-end gap-2"><span className="rounded-full bg-[var(--color-bg)] px-3 py-1 text-xs font-bold">{statusLabel(request.status)}</span><span className="rounded-full bg-[var(--color-bg)] px-3 py-1 text-xs">{fulfillmentLabel(request.fulfillmentType)}</span>{request.priority ? <span className="rounded-full bg-[var(--color-bg)] px-3 py-1 text-xs">الأولوية: {request.priority}</span> : null}</div></div>
      </div>

      {(request.status === 'READY' || request.status === 'COMPLETED') ? <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm sm:grid-cols-2"><div className="text-right"><span className="text-[var(--color-text-muted)]">الموظف المسؤول</span><p className="mt-1 font-bold">{request.assignedEmployee ?? 'غير معيّن'}</p></div><div className="text-right"><span className="text-[var(--color-text-muted)]">وقت الجاهزية</span><p className="mt-1 font-bold">{request.readyAt ? new Date(request.readyAt).toLocaleString('ar-JO') : '—'}</p></div></div> : null}

      <div className="mt-5 space-y-4">
        {request.items.map((item) => (
          <div key={item.id} className="rounded-2xl bg-[var(--color-bg)] p-4">
            <div className="flex items-start justify-between gap-4"><span className="shrink-0 rounded-xl bg-[var(--color-surface)] px-3 py-2 text-lg font-bold">× {item.quantity}</span><div className="text-right"><h3 className="text-lg font-bold">{item.productName}</h3><p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.unitLabel}</p></div></div>
            {Array.isArray(item.customization) && item.customization.length > 0 ? <div className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">{item.customization.map((value, index) => <div key={index}>{String((value as any)?.label ?? (value as any)?.value ?? '')}</div>)}</div> : null}
            {item.notes ? <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm leading-7"><span className="font-bold">ملاحظات التحضير: </span>{item.notes}</div> : null}
          </div>
        ))}
      </div>

      {actionLabel && onAdvance ? <div className="mt-5"><Button size="lg" className="min-h-14 w-full text-base" disabled={busy} onClick={onAdvance}>{busy ? 'جاري التحديث...' : actionLabel}</Button></div> : null}
    </article>
  )
}