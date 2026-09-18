import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Check } from '@phosphor-icons/react'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import Button from '@/components/ui/Button'
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  copyText,
  type WhatsAppHandoffPayload,
} from '@/lib/whatsapp'
import type {
  B2CCustomerDraft,
  FulfillmentDraft,
  RequestItem,
} from '@/types/request'

type SubmissionState = {
  requestId?: string
  reference?: string
  duplicate?: boolean
  estimatedSubtotal?: number
  customer?: B2CCustomerDraft
  fulfillment?: FulfillmentDraft
  generalNotes?: string
  items?: RequestItem[]
}

type WhatsAppState = 'idle' | 'opened' | 'failed' | 'copied' | 'offline'

export default function SubmittedBoundaryPage() {
  const { reference = '' } = useParams()
  const location = useLocation()
  const [whatsAppState, setWhatsAppState] = useState<WhatsAppState>('idle')
  const openedForReference = useRef<string | null>(null)

  const submission = useMemo<SubmissionState>(() => {
    const routeState = location.state as SubmissionState | null
    if (routeState?.reference) return routeState

    try {
      const stored = window.sessionStorage.getItem(
        `chef-mujahed:submitted:${reference}`,
      )
      return stored ? (JSON.parse(stored) as SubmissionState) : {}
    } catch {
      return {}
    }
  }, [location.state, reference])

  const handoff: WhatsAppHandoffPayload = {
    reference,
    customer: submission.customer,
    fulfillment: submission.fulfillment,
    generalNotes: submission.generalNotes,
    items: submission.items,
  }

  const message = buildWhatsAppMessage(handoff)

  useEffect(() => {
    if (!reference || openedForReference.current === reference || !navigator.onLine) return
    openedForReference.current = reference
    const popup = window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer')
    setWhatsAppState(popup ? 'opened' : 'failed')
  }, [message, reference])

  const copyFallback = async () => {
    try {
      await copyText(message)
      setWhatsAppState('copied')
    } catch {
      setWhatsAppState('failed')
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--color-bg)]">
      <PublicHeader />

      <main className="mx-auto grid max-w-[1440px] place-items-center px-4 py-6 md:min-h-[820px] md:px-16 md:py-16">
        <section className="w-full max-w-[600px] rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center shadow-[0_10px_20px_rgba(0,0,0,.04)] md:p-10">
          <div className="mx-auto grid size-[72px] place-items-center rounded-full bg-[#E8F5E9] text-[#26A661] md:size-20">
            <Check size={38} weight="bold" aria-hidden="true" />
          </div>

          <h1 className="mt-4 text-[24px] font-bold text-[var(--color-text)] md:text-[28px]">
            تم تسجيل طلبك بنجاح
          </h1>

          {submission.duplicate ? (
            <div role="status" className="mt-5 rounded-xl border border-[var(--color-accent)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
              تم التحقق من الطلب السابق ومنع إنشاء نسخة مكررة. يمكنك متابعة نفس الرقم المرجعي.
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-bg)] p-4 md:mt-8 md:p-5">
            <p className="text-sm text-[var(--color-text-muted)]">رقم المرجع الخاص بك</p>
            <p dir="ltr" className="mt-1 text-[22px] font-bold text-[var(--color-text)] md:text-2xl">
              {reference}
            </p>
          </div>

          <p className="mt-6 text-sm leading-7 text-[var(--color-text-muted)] md:mt-8 md:text-base">
            تم استلام طلبك المبدئي بنجاح وسيتم مراجعته والتواصل معك لتأكيد موعد التحضير وموقع التسليم النهائي.
          </p>

          <div className="my-6 border-t border-[var(--color-border)] md:my-8" />

          <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-right md:p-6">
            <p className="text-[15px] font-semibold leading-6 text-[var(--color-text)]">
              يتم الآن فتح واتساب برسالة جاهزة لمتابعة الطلب مباشرة مع الشيف.
            </p>

            <p className="mt-4 text-center text-xs leading-5 text-[var(--color-text-muted)] md:text-[13px]">
              ستجد رسالة مجهزة بتفاصيل طلبك؛ أرسلها مباشرة لإكمال المتابعة.
            </p>

            {whatsAppState === 'opened' ? (
              <div role="status" className="mt-4 rounded-lg bg-[#E8F5E9] px-3 py-2 text-center text-xs text-[#507047]">
                تم فتح واتساب. يرجى إرسال الرسالة يدوياً لإكمال المتابعة.
              </div>
            ) : null}

            {whatsAppState === 'offline' || whatsAppState === 'failed' ? (
              <div role="alert" className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-center">
                <p className="text-xs leading-5 text-[var(--color-text-muted)]">
                  {whatsAppState === 'offline'
                    ? 'لا يوجد اتصال بالإنترنت حالياً. يمكنك نسخ الرسالة وإرسالها لاحقاً.'
                    : 'تعذر فتح واتساب تلقائياً. يمكنك نسخ الرسالة الجاهزة وإرسالها يدوياً.'}
                </p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => void copyFallback()}>
                  نسخ الرسالة
                </Button>
              </div>
            ) : null}

            {whatsAppState === 'copied' ? (
              <div role="status" className="mt-4 rounded-lg bg-[var(--color-bg)] px-3 py-2 text-center text-xs text-[var(--color-text-muted)]">
                تم نسخ الرسالة.
              </div>
            ) : null}
          </div>

          <Link
            to="/"
            className="mt-7 inline-block text-sm font-semibold text-[var(--color-text-muted)] underline underline-offset-4 md:text-base"
          >
            العودة للرئيسية وتصفح المزيد
          </Link>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
