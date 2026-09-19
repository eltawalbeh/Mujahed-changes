import { FormEvent, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import Button from '@/components/ui/Button'
import RequestItemRow from '@/components/request/RequestItemRow'
import RequestSummary from '@/components/request/RequestSummary'
import SectionCard from '@/components/request/SectionCard'
import { FormField, TextAreaField } from '@/components/request/FormField'
import FulfillmentToggle from '@/components/request/FulfillmentToggle'
import { useRequestDraft } from '@/state/RequestDraftContext'

export default function CustomerFulfillmentPage() {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const {
    items,
    subtotal,
    customer,
    fulfillment,
    generalNotes,
    setCustomer,
    setFulfillment,
    setGeneralNotes,
    updateQuantity,
    removeItem,
  } = useRequestDraft()

  const [showErrors, setShowErrors] = useState(false)

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {}

    if (customer.name.trim().length < 2) {
      errors.name = 'يرجى إدخال الاسم الكامل.'
    }

    if (customer.phone.trim().length < 7) {
      errors.phone = 'يرجى إدخال رقم هاتف صالح.'
    }

    if (!fulfillment.preferredDate) {
      errors.preferredDate = 'يرجى اختيار التاريخ المفضل.'
    }

    if (!fulfillment.preferredTime) {
      errors.preferredTime = 'يرجى اختيار الوقت المفضل.'
    }

    if (fulfillment.type === 'DELIVERY' && !fulfillment.address?.trim()) {
      errors.address = 'يرجى إدخال عنوان التوصيل.'
    }

    return errors
  }, [customer.name, customer.phone, fulfillment])

  const canContinue =
    customer.name.trim().length >= 2 &&
    customer.phone.trim().length >= 7 &&
    Boolean(fulfillment.preferredDate) &&
    Boolean(fulfillment.preferredTime) &&
    (fulfillment.type === 'COLLECTION' || Boolean(fulfillment.address?.trim()))

  if (!items.length) return <Navigate to="/" replace />

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    if (!canContinue) return

    navigate('/request/review')
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />

      <form
        onSubmit={submit}
        dir="ltr"
        className="mx-auto grid max-w-[1312px] gap-8 px-4 py-6 md:grid-cols-[380px_720px] md:px-0 md:py-12"
      >
        <div dir="rtl" className="order-0 col-span-full flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <strong className="text-[var(--color-text)]">تفاصيل الطلب والاستلام</strong>
          <span>الخطوة ٢ من ٣</span>
        </div>
        <aside dir="rtl" className="order-2 md:order-1">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-5">
              <span className="rounded-md bg-[rgba(201,164,106,.13)] px-2 py-1 text-xs font-bold text-[var(--color-text-muted)]">
                {items.length} منتجات
              </span>
              <h2 className="font-bold text-[var(--color-text)]">
                الطلب الحالي
              </h2>
            </div>

            <div className="space-y-3 p-4">
              {items.map((item) => (
                <RequestItemRow
                  key={item.id}
                  item={item}
                  compact
                  onQuantityChange={(quantity) =>
                    updateQuantity(item.id, quantity)
                  }
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>

            <div className="border-t border-[var(--color-border)] p-5">
              <RequestSummary subtotal={subtotal} />
            </div>
          </div>

          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            * الطلب خاضع للموافقة ولا يعتبر فاتورة نهائية
          </p>
        </aside>

        <main dir="rtl" className="order-1 space-y-6 md:order-2">
          <SectionCard title="معلومات العميل">
            <div className="grid gap-4">
              <FormField
                label="الاسم الكامل"
                name="customer-name"
                error={showErrors ? validationErrors.name : undefined}
                value={customer.name}
                onChange={(event) =>
                  setCustomer({ ...customer, name: event.target.value })
                }
                placeholder="أدخل اسمك الكامل كما ترغب في اعتماده للطلب"
                required
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label="رقم الهاتف"
                  name="customer-phone"
                  error={showErrors ? validationErrors.phone : undefined}
                  value={customer.phone}
                  onChange={(event) =>
                    setCustomer({ ...customer, phone: event.target.value })
                  }
                  placeholder="+962 7X XXX XXXX"
                  inputMode="tel"
                  required
                />

                <FormField
                  label="البريد الإلكتروني (اختياري)"
                  value={customer.email ?? ''}
                  onChange={(event) =>
                    setCustomer({ ...customer, email: event.target.value })
                  }
                  placeholder="example@email.com"
                  type="email"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="طريقة الاستلام والتوصيل">
            <FulfillmentToggle
              value={fulfillment.type}
              onChange={(type) => setFulfillment({ ...fulfillment, type })}
            />

            {fulfillment.type === 'DELIVERY' ? (
              <div className="mt-6 space-y-4">
                <FormField
                  label="العنوان"
                  name="delivery-address"
                  error={showErrors ? validationErrors.address : undefined}
                  value={fulfillment.address ?? ''}
                  onChange={(event) =>
                    setFulfillment({
                      ...fulfillment,
                      address: event.target.value,
                    })
                  }
                  placeholder="المدينة، اسم الشارع، المبنى"
                  required
                />

                <TextAreaField
                  label="تفاصيل إضافية للموقع"
                  value={fulfillment.locationNotes ?? ''}
                  onChange={(event) =>
                    setFulfillment({
                      ...fulfillment,
                      locationNotes: event.target.value,
                    })
                  }
                  placeholder="شقة، طابق، علامة مميزة..."
                  rows={3}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="التاريخ المفضل"
                    name="preferred-date-delivery"
                    error={showErrors ? validationErrors.preferredDate : undefined}
                    type="date"
                    min={today}
                    value={fulfillment.preferredDate ?? ''}
                    onChange={(event) =>
                      setFulfillment({
                        ...fulfillment,
                        preferredDate: event.target.value,
                      })
                    }
                    required
                  />

                  <FormField
                    label="الوقت المفضل"
                    name="preferred-time-delivery"
                    error={showErrors ? validationErrors.preferredTime : undefined}
                    type="time"
                    value={fulfillment.preferredTime ?? ''}
                    onChange={(event) =>
                      setFulfillment({
                        ...fulfillment,
                        preferredTime: event.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm leading-6 text-[var(--color-text-muted)]">
                  سيتم إعداد وتغليف طلبكم بعناية تامة. سيتم التواصل معكم
                  لتأكيد موعد الاستلام بمجرد مراجعة طلبكم.
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="التاريخ المفضل"
                    name="preferred-date-collection"
                    error={showErrors ? validationErrors.preferredDate : undefined}
                    type="date"
                    min={today}
                    value={fulfillment.preferredDate ?? ''}
                    onChange={(event) =>
                      setFulfillment({
                        ...fulfillment,
                        preferredDate: event.target.value,
                      })
                    }
                    required
                  />
                  <FormField
                    label="الوقت المفضل"
                    name="preferred-time-collection"
                    error={showErrors ? validationErrors.preferredTime : undefined}
                    type="time"
                    value={fulfillment.preferredTime ?? ''}
                    onChange={(event) =>
                      setFulfillment({
                        ...fulfillment,
                        preferredTime: event.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="ملاحظات عامة على الطلب">
            <TextAreaField
              label=""
              value={generalNotes}
              onChange={(event) => setGeneralNotes(event.target.value)}
              placeholder="أضف أي ملاحظات عامة على طلبك"
              rows={4}
            />
          </SectionCard>

          <Button
            type="submit"
            size="lg"
            className="h-14 w-full rounded-xl"
          >
            مراجعة وتقديم الطلب
          </Button>
        </main>
      </form>

      <PublicFooter />
    </div>
  )
}
