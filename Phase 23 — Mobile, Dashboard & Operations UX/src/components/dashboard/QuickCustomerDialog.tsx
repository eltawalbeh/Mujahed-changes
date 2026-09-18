import { useState } from 'react'
import Button from '@/components/ui/Button'
import { saveDashboardCustomer, type DashboardRuntime } from '@/data/dashboard'

type Props = { type: 'B2B' | 'B2C'; runtime: DashboardRuntime; onClose: () => void; onCreated: (id: string) => void }

export default function QuickCustomerDialog({ type, runtime, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async () => { try { setSaving(true); setError(''); const result = await saveDashboardCustomer(runtime, { customerType: type, name, companyName, phone, email }); const id = (result as any).customer?.id; if (!id) throw new Error('missing customer id'); onCreated(id) } catch { setError('تعذر حفظ البيانات. تحقق من الاسم ورقم الهاتف ثم حاول مرة أخرى.') } finally { setSaving(false) } }
  return <div className="fixed inset-0 z-[70] flex items-end bg-black/35 sm:items-center sm:p-4"><section role="dialog" aria-modal="true" className="w-full rounded-t-2xl bg-white p-5 text-right shadow-xl sm:max-w-lg sm:rounded-2xl" dir="rtl"><div className="flex items-center justify-between"><button type="button" onClick={onClose} className="min-h-10 text-sm text-[var(--color-text-muted)]">إغلاق</button><div><h2 className="text-lg font-bold">إضافة {type === 'B2B' ? 'شركة' : 'عميل'} سريعاً</h2><p className="text-xs text-[var(--color-text-muted)]">سيظهر السجل مباشرة داخل الطلب الحالي.</p></div></div><div className="mt-5 grid gap-3">{type === 'B2B' ? <input required value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="اسم الشركة *" className="h-11 rounded-lg border border-[var(--color-border)] px-3" /> : null}<input required value={name} onChange={(event) => setName(event.target.value)} placeholder={type === 'B2B' ? 'اسم جهة الاتصال *' : 'اسم العميل *'} className="h-11 rounded-lg border border-[var(--color-border)] px-3" /><input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="رقم الهاتف *" dir="ltr" className="h-11 rounded-lg border border-[var(--color-border)] px-3 text-right" /><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="البريد الإلكتروني (اختياري)" dir="ltr" className="h-11 rounded-lg border border-[var(--color-border)] px-3 text-right" /></div>{error ? <p className="mt-3 text-sm text-[#9F3A38]">{error}</p> : null}<div className="mt-5 flex gap-2"><Button disabled={saving || !name.trim() || !phone.trim() || (type === 'B2B' && !companyName.trim())} onClick={() => void submit()}>{saving ? 'جاري الحفظ...' : 'حفظ واختيار السجل'}</Button><Button variant="ghost" onClick={onClose}>إلغاء</Button></div></section></div>
}
