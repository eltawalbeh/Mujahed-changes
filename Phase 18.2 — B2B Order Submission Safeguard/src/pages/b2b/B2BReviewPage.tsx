import { useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import B2BHeader from '@/components/b2b/B2BHeader'
import B2BStepIndicator from '@/components/b2b/B2BStepIndicator'
import B2BRequestItem from '@/components/b2b/B2BRequestItem'
import PublicFooter from '@/components/public/PublicFooter'
import Button from '@/components/ui/Button'
import { submitB2BRequest } from '@/data/requests'
import { useB2BRequestDraft } from '@/state/B2BRequestDraftContext'

function submissionFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('preferred date')) return 'يرجى اختيار التاريخ المفضل قبل تقديم الطلب.'
  if (message.includes('preferred time')) return 'يرجى اختيار الوقت المفضل قبل تقديم الطلب.'
  if (message.includes('delivery address')) return 'يرجى إدخال عنوان التوصيل قبل تقديم الطلب.'
  if (message.includes('client submission') || message.includes('uuid')) return 'انتهت صلاحية جلسة الطلب. أعد فتح المراجعة ثم حاول مرة أخرى.'
  if (message.includes('product') || message.includes('unit')) return 'أحد المنتجات أو وحداته تغيّر أو لم يعد متاحًا. عد إلى الطلب وحدّث المنتجات ثم أعد المحاولة.'
  return 'تعذر تسجيل الطلب حالياً. بياناتك محفوظة ويمكنك إعادة المحاولة بأمان.'
}

function Card({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><div dir="ltr" className="flex items-center justify-between border-b border-[var(--color-border)] pb-4"><button type="button" onClick={onEdit} className="text-sm text-[var(--color-accent)]">✎ تعديل</button><h2 dir="rtl" className="font-bold">{title}</h2></div><div className="pt-4">{children}</div></section>
}

export default function B2BReviewPage() {
  const navigate = useNavigate()
  const { items, itemCount, clientSubmissionId, company, fulfillment, generalNotes, clearRequest, openRequest } = useB2BRequestDraft()
  const [state, setState] = useState<'idle' | 'submitting' | 'error' | 'offline' | 'validation'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  if (!items.length && state !== 'submitting') return <Navigate to="/business" replace />

  const submit = async () => {
    if (state === 'submitting') return
    if (!fulfillment.preferredDate || !fulfillment.preferredTime || (fulfillment.type === 'DELIVERY' && !fulfillment.address?.trim())) {
      setSubmitMessage(!fulfillment.preferredDate ? 'يرجى اختيار التاريخ المفضل قبل تقديم الطلب.' : !fulfillment.preferredTime ? 'يرجى اختيار الوقت المفضل قبل تقديم الطلب.' : 'يرجى إدخال عنوان التوصيل قبل تقديم الطلب.')
      setState('validation')
      return
    }
    if (!navigator.onLine) { setState('offline'); return }
    try {
      setState('submitting')
      const result = await submitB2BRequest({ clientSubmissionId, company, fulfillment, generalNotes, items })
      const handoff = { requestId: result.id, reference: result.reference, duplicate: result.duplicate, company, fulfillment, generalNotes, items }
      sessionStorage.setItem(`chef-mujahed:b2b-submitted:${result.reference}`, JSON.stringify(handoff))
      navigate(`/business/request/submitted/${encodeURIComponent(result.reference)}`, { replace: true, state: handoff })
      clearRequest()
    } catch (error) { setSubmitMessage(submissionFailureMessage(error)); setState(navigator.onLine ? 'error' : 'offline') }
  }

  if (state === 'submitting') return <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] text-center"><div><div className="mx-auto size-16 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-text)]"/><h1 className="mt-6 text-2xl font-bold">جاري تسجيل طلبك...</h1><p className="mt-2 text-sm text-[var(--color-text-muted)]">نراجع البيانات قبل تسجيل الطلب</p></div></main>
  if (state === 'error' || state === 'offline' || state === 'validation') { const needsDetails = state === 'validation'; return <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-4 text-center"><div className="max-w-sm"><div className="mx-auto grid size-20 place-items-center rounded-full border border-[var(--color-border)] bg-white text-3xl">!</div><h1 className="mt-6 text-2xl font-bold">{state === 'offline' ? 'لا يوجد اتصال بالإنترنت' : needsDetails ? 'أكمل بيانات الطلب' : 'لم يتم تسجيل الطلب'}</h1><p className="mt-3 leading-7 text-[var(--color-text-muted)]">{state === 'offline' ? 'بياناتك محفوظة بالكامل ويمكنك إعادة المحاولة بعد عودة الاتصال.' : submitMessage}</p><Button size="lg" className="mt-6 w-full" onClick={() => needsDetails ? navigate('/business/request/fulfillment') : submit()}>{needsDetails ? 'إكمال البيانات' : 'إعادة المحاولة'}</Button><Button size="lg" variant="secondary" className="mt-3 w-full" onClick={() => setState('idle')}>العودة للمراجعة</Button></div></main> }

  return <div className="min-h-screen bg-[var(--color-bg)]"><B2BHeader /><main className="mx-auto max-w-[1280px] px-4 py-6 md:px-0 md:py-10"><B2BStepIndicator step={3} title="مراجعة وتقديم الطلب" /><p className="mt-3 text-sm text-[var(--color-text-muted)]">الرجاء مراجعة البيانات التالية بدقة قبل تقديم طلبك النهائي.</p><div className="mt-8 grid gap-8 md:grid-cols-[400px_1fr]" dir="ltr"><aside dir="rtl" className="order-2 md:order-1"><div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-bold">ملخص الطلب</h2><div className="mt-4 space-y-3 border-y border-[var(--color-border)] py-4"><div className="flex justify-between text-sm"><strong>{itemCount} منتجات في الطلب</strong><span className="text-[var(--color-text-muted)]">حجم الطلب الإجمالي</span></div><div className="flex justify-between text-sm"><strong>جاهز للتقديم</strong><span className="text-[var(--color-text-muted)]">حالة الطلب</span></div></div><Button size="lg" className="mt-5 w-full" onClick={submit}>تقديم الطلب</Button><p className="mt-4 rounded-lg bg-[var(--color-bg)] p-3 text-xs text-[var(--color-text-muted)]">* الطلب خاضع للمراجعة ولا يعتبر تأكيداً نهائياً.</p></div></aside><div dir="rtl" className="order-1 space-y-5 md:order-2"><Card title="المنتجات في الطلب" onEdit={() => { openRequest(); navigate('/business') }}><div className="space-y-3">{items.map((item) => <B2BRequestItem key={item.id} item={item} readOnly />)}</div></Card><Card title="معلومات الشركة وجهة التواصل" onEdit={() => navigate('/business/request/company')}><div className="space-y-2 text-sm"><p><span className="text-[var(--color-text-muted)]">اسم الشركة:</span> {company.companyName}</p><p><span className="text-[var(--color-text-muted)]">مسؤول التواصل:</span> {company.contactName}</p><p><span className="text-[var(--color-text-muted)]">رقم الهاتف:</span> {company.phone}</p>{company.email ? <p><span className="text-[var(--color-text-muted)]">البريد الإلكتروني:</span> {company.email}</p> : null}</div></Card><Card title="تفاصيل الاستلام والتجهيز" onEdit={() => navigate('/business/request/fulfillment')}><div className="space-y-2 text-sm"><p><span className="text-[var(--color-text-muted)]">نوع الاستلام:</span> {fulfillment.type === 'DELIVERY' ? 'توصيل للعنوان' : 'استلام'}</p>{fulfillment.type === 'DELIVERY' ? <p><span className="text-[var(--color-text-muted)]">العنوان:</span> {fulfillment.address}</p> : null}<p><span className="text-[var(--color-text-muted)]">الموعد:</span> {fulfillment.preferredDate} · {fulfillment.preferredTime}</p>{generalNotes ? <p><span className="text-[var(--color-text-muted)]">ملاحظات:</span> {generalNotes}</p> : null}</div></Card></div></div></main><PublicFooter /></div>
}
