import { useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import Button from '@/components/ui/Button'
import { formatJod } from '@/lib/format'
import { submitB2CRequest } from '@/data/requests'
import { useRequestDraft } from '@/state/RequestDraftContext'

function submissionFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''

  if (message.includes('preferred date')) return 'يرجى اختيار التاريخ المفضل قبل تقديم الطلب.'
  if (message.includes('delivery address')) return 'يرجى إدخال عنوان التوصيل قبل تقديم الطلب.'
  if (message.includes('client submission') || message.includes('uuid')) return 'انتهت صلاحية جلسة الطلب. أعد فتح المراجعة ثم حاول مرة أخرى.'
  if (message.includes('product') || message.includes('unit')) return 'أحد المنتجات أو وحداته تغيّر أو لم يعد متاحًا. عد إلى الطلب وحدّث المنتجات ثم أعد المحاولة.'

  return 'تعذر تسجيل الطلب حالياً. بياناتك محفوظة ويمكنك إعادة المحاولة بأمان.'
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="m13.5 6.5 4 4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div dir="ltr" className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-3 text-sm last:border-b-0">
      <strong className="text-[var(--color-text)]">{value || '—'}</strong>
      <span className="text-[var(--color-text-muted)]">{label}</span>
    </div>
  )
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit?: () => void
  children: ReactNode
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:p-6">
      <div dir="ltr" className="mb-4 flex items-center justify-between">
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-[var(--color-accent)]"
            aria-label={`تعديل ${title}`}
          >
            <EditIcon />
          </button>
        ) : <span />}
        <div dir="rtl" className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[var(--color-text)] md:text-lg">{title}</h2>
          <span className="hidden h-4 w-1 rounded-sm bg-[var(--color-accent)] md:block" />
        </div>
      </div>
      {children}
    </section>
  )
}

export default function RequestReviewPage() {
  const navigate = useNavigate()
  const {
    items,
    itemCount,
    subtotal,
    clientSubmissionId,
    customer,
    fulfillment,
    generalNotes,
    clearRequest,
    openRequest,
  } = useRequestDraft()

  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'error' | 'offline' | 'validation'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const submitting = submitState === 'submitting'

  if (!items.length && !submitting) return <Navigate to="/" replace />

  const editProducts = () => {
    openRequest()
    navigate('/')
  }

  const handleSubmit = async () => {
    if (submitting) return

    if (!fulfillment.preferredDate) {
      setSubmitMessage('يرجى اختيار التاريخ المفضل قبل تقديم الطلب.')
      setSubmitState('validation')
      return
    }

    if (!navigator.onLine) {
      setSubmitState('offline')
      return
    }

    try {
      setSubmitState('submitting')

      const result = await submitB2CRequest({
        clientSubmissionId,
        customer,
        fulfillment,
        generalNotes,
        items,
      })

      const handoff = {
        requestId: result.id,
        reference: result.reference,
        duplicate: result.duplicate,
        estimatedSubtotal: result.estimatedSubtotal,
        customer,
        fulfillment,
        generalNotes,
        items,
      }

      window.sessionStorage.setItem(
        `chef-mujahed:submitted:${result.reference}`,
        JSON.stringify(handoff),
      )

      navigate(`/request/submitted/${encodeURIComponent(result.reference)}`, {
        replace: true,
        state: handoff,
      })
      clearRequest()
    } catch (error) {
      setSubmitMessage(submissionFailureMessage(error))
      setSubmitState(navigator.onLine ? 'error' : 'offline')
    }
  }

  if (submitting) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-6 text-center">
        <div>
          <div className="mx-auto size-16 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-text)]" />
          <h1 className="mt-6 text-xl font-bold text-[var(--color-text)]">جاري تسجيل طلبك...</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">يرجى الانتظار وعدم إغلاق الصفحة</p>
        </div>
      </main>
    )
  }

  if (submitState === 'error' || submitState === 'offline' || submitState === 'validation') {
    const needsDetails = submitState === 'validation'
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-6 text-center">
        <div className="w-full max-w-sm">
          <div className="mx-auto grid size-20 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-4xl text-[var(--color-text-muted)]">×</div>
          <h1 className="mt-7 text-2xl font-bold text-[var(--color-text)]">
            {submitState === 'offline' ? 'لا يوجد اتصال بالإنترنت' : needsDetails ? 'أكمل بيانات الطلب' : 'لم يتم تسجيل الطلب'}
          </h1>
          <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
            {submitState === 'offline'
              ? 'بيانات طلبك ما زالت محفوظة. أعد الاتصال بالإنترنت ثم حاول مرة أخرى.'
              : submitMessage}
          </p>
          {needsDetails ? (
            <Button size="lg" className="mt-7 w-full" onClick={() => navigate('/request/details')}>إكمال البيانات</Button>
          ) : (
            <Button size="lg" className="mt-7 w-full" onClick={handleSubmit}>إعادة المحاولة</Button>
          )}
          <Button size="lg" variant="secondary" className="mt-3 w-full" onClick={() => setSubmitState('idle')}>
            العودة للمراجعة
          </Button>
        </div>
      </main>
    )
  }

  const fulfillmentLabel = fulfillment.type === 'DELIVERY' ? 'توصيل للمنزل' : 'استلام من المطبخ'

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />

      <div className="mx-auto max-w-[1312px] px-4 py-4 md:hidden">
        <div className="mb-4 flex items-center justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">الخطوة ٣ من ٣</span>
          <strong className="text-[var(--color-text-muted)]">مراجعة وتقديم الطلب</strong>
        </div>

        <div className="space-y-4">
          <ReviewCard title="معلومات العميل" onEdit={() => navigate('/request/details')}>
            <ReviewRow label="الاسم" value={customer.name} />
            <ReviewRow label="الهاتف" value={customer.phone} />
            <ReviewRow label="طريقة الاستلام" value={fulfillmentLabel} />
            {fulfillment.type === 'DELIVERY' ? (
              <ReviewRow label="العنوان" value={fulfillment.address ?? ''} />
            ) : null}
            <ReviewRow label="تاريخ التوصيل" value={fulfillment.preferredDate ?? ''} />
          </ReviewCard>

          <ReviewCard title="المنتجات المطلوبة" onEdit={editProducts}>
            <div className="divide-y divide-[var(--color-border)]">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{item.productName}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {item.quantity} × {item.unitLabel}
                      {item.customizationLabels?.length ? ` · ${item.customizationLabels.join(' · ')}` : ''}
                    </p>
                  </div>
                  <strong className="text-sm text-[var(--color-text-muted)]">
                    {formatJod((item.observedBasePriceJod ?? 0) * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>
          </ReviewCard>

          <ReviewCard title="ملاحظات عامة">
            <p className="text-sm leading-6 text-[var(--color-text-muted)]">
              {generalNotes.trim() || 'لا توجد ملاحظات إضافية'}
            </p>
          </ReviewCard>

          <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div dir="ltr" className="flex justify-between text-sm text-[var(--color-text-muted)]">
              <span>{formatJod(subtotal)}</span><span dir="rtl">المجموع الفرعي</span>
            </div>
            <div className="my-3 border-t border-[var(--color-border)]" />
            <div dir="ltr" className="flex items-center justify-between">
              <strong className="text-xl text-[var(--color-text-muted)]">{formatJod(subtotal)}</strong>
              <strong dir="rtl" className="text-[var(--color-text)]">الإجمالي</strong>
            </div>
          </section>

          <p className="text-center text-xs leading-5 text-[var(--color-text-muted)]">
            هذا الطلب سيتم مراجعته وتأكيده من قبل الشيف مجاهد بشكل شخصي قبل اعتماده.
          </p>
          <Button size="lg" className="h-[52px] w-full rounded-xl" onClick={handleSubmit}>تقديم الطلب</Button>
        </div>
      </div>

      <main dir="ltr" className="mx-auto hidden max-w-[1312px] grid-cols-[380px_720px] justify-end gap-12 px-0 py-12 md:grid">
        <aside dir="rtl">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div dir="ltr" className="flex items-center justify-between border-b border-[var(--color-border)] p-5">
              <span className="rounded-md bg-[rgba(201,164,106,.13)] px-2 py-1 text-xs font-bold text-[var(--color-text-muted)]">{itemCount} منتجات</span>
              <h2 dir="rtl" className="font-bold text-[var(--color-text)]">ملخص الطلب</h2>
            </div>
            <div className="p-5">
              <div dir="ltr" className="flex items-center justify-between text-sm">
                <strong>{formatJod(subtotal)}</strong><span dir="rtl" className="text-[var(--color-text-muted)]">المجموع الفرعي</span>
              </div>
            </div>
            <div dir="ltr" className="flex items-center justify-between bg-[var(--color-bg)] p-5">
              <strong className="text-xl text-[var(--color-text-muted)]">{formatJod(subtotal)}</strong>
              <strong dir="rtl">الإجمالي التقريبي</strong>
            </div>
          </div>
          <Button size="lg" className="mt-6 h-14 w-full rounded-xl" onClick={handleSubmit}>تقديم الطلب</Button>
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">* الطلب خاضع للموافقة ولا يعتبر فاتورة نهائية</p>
        </aside>

        <div dir="rtl" className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">مراجعة وتقديم الطلب</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">الرجاء مراجعة البيانات التالية قبل تقديم طلبك</p>
          </div>

          <ReviewCard title="المنتجات في الطلب" onEdit={editProducts}>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} dir="ltr" className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-3">
                  <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-[var(--color-bg)] text-xl text-[var(--color-text-muted)]">◫</div>
                  <div dir="rtl" className="min-w-0 flex-1 text-right">
                    <p className="text-sm font-semibold">{item.productName}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {item.unitLabel}{item.customizationLabels?.length ? ` · ${item.customizationLabels.join(' · ')}` : ''}
                    </p>
                    <div dir="ltr" className="mt-2 flex items-center justify-between text-xs">
                      <strong className="text-sm text-[var(--color-text-muted)]">{formatJod((item.observedBasePriceJod ?? 0) * item.quantity)}</strong>
                      <span dir="rtl" className="text-[var(--color-text-muted)]">الكمية: {item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ReviewCard>

          <ReviewCard title="معلومات العميل" onEdit={() => navigate('/request/details')}>
            <ReviewRow label="الاسم الكامل" value={customer.name} />
            <ReviewRow label="رقم الهاتف" value={customer.phone} />
            <ReviewRow label="البريد الإلكتروني" value={customer.email?.trim() || '—'} />
          </ReviewCard>

          <ReviewCard title="تفاصيل التوصيل والاستلام" onEdit={() => navigate('/request/details')}>
            <ReviewRow label="نوع الاستلام" value={fulfillmentLabel} />
            {fulfillment.type === 'DELIVERY' ? <ReviewRow label="عنوان التوصيل" value={fulfillment.address ?? ''} /> : null}
            <ReviewRow label="التاريخ المفضل" value={fulfillment.preferredDate ?? ''} />
            <ReviewRow label="الوقت المفضل" value={fulfillment.preferredTime || '—'} />
          </ReviewCard>

          <ReviewCard title="ملاحظات عامة">
            <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">
              {generalNotes.trim() || 'لا توجد ملاحظات إضافية'}
            </div>
          </ReviewCard>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
