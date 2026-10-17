import { FormEvent, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import B2BHeader from '@/components/b2b/B2BHeader'
import B2BStepIndicator from '@/components/b2b/B2BStepIndicator'
import B2BRequestItem from '@/components/b2b/B2BRequestItem'
import PublicFooter from '@/components/public/PublicFooter'
import Button from '@/components/ui/Button'
import { FormField } from '@/components/request/FormField'
import PhoneField from '@/components/request/PhoneField'
import { normalizePhoneToE164 } from '@/lib/phone'
import { useB2BRequestDraft } from '@/state/B2BRequestDraftContext'

export default function B2BCompanyPage() {
  const navigate = useNavigate()
  const { items, itemCount, company, setCompany } = useB2BRequestDraft()
  const [showErrors, setShowErrors] = useState(false)
  const errors = useMemo(() => ({
    companyName: company.companyName.trim().length < 2 ? 'يرجى إدخال اسم الشركة / الجهة.' : '',
    contactName: company.contactName.trim().length < 2 ? 'يرجى إدخال اسم الشخص المسؤول.' : '',
    phone: !normalizePhoneToE164(company.phone) ? 'يرجى إدخال رقم موبايل صحيح مع مفتاح الدولة.' : '',
  }), [company])
  const valid = !errors.companyName && !errors.contactName && !errors.phone
  if (!items.length) return <Navigate to="/business" replace />

  const submit = (event: FormEvent) => { event.preventDefault(); setShowErrors(true); if (valid) navigate('/business/request/fulfillment') }

  return <div className="min-h-screen bg-[var(--color-bg)]"><B2BHeader /><form onSubmit={submit} className="mx-auto max-w-[1280px] px-4 py-6 md:px-0 md:py-10"><B2BStepIndicator step={1} title="معلومات الشركة وجهة التواصل" /><div className="mt-8 grid gap-8 md:grid-cols-[400px_1fr]" dir="ltr"><aside dir="rtl" className="order-2 md:order-1"><div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="font-bold">ملخص الطلب الحالي</h2><div className="mt-4 space-y-2 border-y border-[var(--color-border)] py-4">{items.slice(0,3).map((item) => <B2BRequestItem key={item.id} item={item} readOnly />)}</div><div className="mt-4 flex justify-between text-sm"><strong>{itemCount} منتجات</strong><span className="text-[var(--color-text-muted)]">عدد المنتجات في الطلب</span></div></div></aside><main dir="rtl" className="order-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:order-2 md:p-8"><p className="mb-6 text-lg font-bold">الرجاء تعبئة البيانات التالية بدقة لمعالجة طلبك</p><div className="grid gap-5 md:grid-cols-2"><FormField label="اسم الشركة / الجهة الطالبة *" name="company-name" value={company.companyName} error={showErrors ? errors.companyName : undefined} onChange={(e) => setCompany({ ...company, companyName: e.target.value })} /><FormField label="اسم الشخص المسؤول *" name="contact-name" value={company.contactName} error={showErrors ? errors.contactName : undefined} onChange={(e) => setCompany({ ...company, contactName: e.target.value })} /><PhoneField label="رقم الهاتف للتواصل المباشر (واتساب)" name="company-phone" value={company.phone} error={showErrors ? errors.phone : undefined} onChange={phone => setCompany({ ...company, phone })} required /><FormField label="البريد الإلكتروني (اختياري)" name="company-email" value={company.email ?? ''} onChange={(e) => setCompany({ ...company, email: e.target.value })} type="email" /></div><div className="mt-8 flex gap-3"><Button type="button" variant="secondary" onClick={() => navigate('/business')}>العودة للقائمة</Button><Button type="submit" className="flex-1">التالي</Button></div></main></div></form><PublicFooter /></div>
}
