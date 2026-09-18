import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import B2BHeader from '@/components/b2b/B2BHeader'
import PublicFooter from '@/components/public/PublicFooter'
import ProductGallery from '@/components/public/ProductGallery'
import QuantityControl from '@/components/ui/QuantityControl'
import UnitSelector from '@/components/public/UnitSelector'
import CustomizationFields from '@/components/public/CustomizationFields'
import NotesField from '@/components/public/NotesField'
import Button from '@/components/ui/Button'
import StatePanel from '@/components/ui/StatePanel'
import { getB2BProductBySlug } from '@/data/catalog'
import { useB2BRequestDraft } from '@/state/B2BRequestDraftContext'
import type { Product } from '@/types/product'
import { unitsForCustomerType } from '@/domain/product'

export default function B2BProductDetailPage() {
  const { slug = '' } = useParams()
  const { addItem, openRequest } = useB2BRequestDraft()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unitId, setUnitId] = useState('')
  const [customUnitMode, setCustomUnitMode] = useState(false)
  const [customUnit, setCustomUnit] = useState('')
  const [customization, setCustomization] = useState<Record<string, string | string[]>>({})
  const [notes, setNotes] = useState('')
  const [added, setAdded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true); setError('')
        const value = await getB2BProductBySlug(slug)
        if (!cancelled) {
          setProduct(value)
          const first = value?.units.find((unit) => unit.channel === 'B2B' || unit.channel === 'BOTH')
          setUnitId(first?.id ?? '')
        }
      } catch { if (!cancelled) setError('تعذر تحميل المنتج حالياً.') }
      finally { if (!cancelled) setLoading(false) }
    }
    void load(); return () => { cancelled = true }
  }, [slug, reloadKey])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    setQuantity(1)
    setCustomization({})
    setNotes('')
    setCustomUnitMode(false)
    setCustomUnit('')
    setAdded(false)
  }, [slug])

  const units = useMemo(() => product ? unitsForCustomerType(product.units, 'B2B') : [], [product])
  const requiredValid = useMemo(() => product?.customizationFields?.every((field) => {
    if (!field.required) return true
    const value = customization[field.id]
    return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim())
  }) ?? true, [product, customization])
  const unitValid = customUnitMode ? Boolean(product?.b2bAllowCustomUnit && customUnit.trim()) : Boolean(unitId)
  const canAdd = Boolean(product && product.availability === 'AVAILABLE' && requiredValid && unitValid)

  if (loading) return <div className="min-h-screen bg-[var(--color-bg)]"><B2BHeader /><main className="mx-auto max-w-[1280px] animate-pulse px-4 py-10"><div className="grid gap-10 md:grid-cols-[540px_1fr]" dir="ltr"><div className="h-[400px] rounded-2xl bg-[var(--color-placeholder)]"/><div className="space-y-5" dir="rtl"><div className="h-10 rounded bg-[var(--color-placeholder)]"/><div className="h-24 rounded bg-[var(--color-placeholder)]"/><div className="h-40 rounded bg-[var(--color-placeholder)]"/></div></div></main></div>
  if (error) return <div className="min-h-screen bg-[var(--color-bg)]"><B2BHeader /><main className="mx-auto max-w-[800px] px-4 py-20"><StatePanel title="تعذر تحميل المنتج" description={error} actionLabel="إعادة المحاولة" onAction={() => setReloadKey((v) => v + 1)} tone="error" /></main></div>
  if (!product) return <div className="min-h-screen bg-[var(--color-bg)]"><B2BHeader /><main className="mx-auto max-w-[800px] px-4 py-20"><StatePanel title="المنتج غير متاح للشركات" description="تعذر العثور على المنتج المطلوب." actionLabel="العودة لقائمة الشركات" onAction={() => { window.location.href = '/business' }} /></main></div>

  const selectedUnit = units.find((unit) => unit.id === unitId)
  const labels = product.customizationFields?.flatMap((field) => {
    const value = customization[field.id]
    if (!value) return []
    if (field.type === 'text') return typeof value === 'string' && value.trim() ? [value.trim()] : []
    const ids = Array.isArray(value) ? value : [value]
    return ids.map((id) => field.options?.find((option) => option.id === id)?.label).filter((x): x is string => Boolean(x))
  }) ?? []

  const add = () => {
    if (!canAdd) return
    const unitLabel = customUnitMode ? customUnit.trim() : selectedUnit?.label ?? ''
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      quantity,
      unitId: customUnitMode ? undefined : selectedUnit?.id,
      unitLabel,
      customUnit: customUnitMode ? customUnit.trim() : undefined,
      customization,
      customizationLabels: labels,
      notes: notes.trim() || undefined,
    })
    setAdded(true); setTimeout(() => setAdded(false), 1600); openRequest()
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <B2BHeader />
      <main className="mx-auto max-w-[1280px] px-4 pb-32 pt-6 md:px-0 md:py-10">
        <div className="mb-7 text-xs text-[var(--color-text-muted)]"><Link to="/business">الرئيسية للشركات</Link> ‹ <span>{product.name}</span></div>
        <div className="grid gap-8 md:grid-cols-[540px_minmax(0,1fr)] md:gap-12" dir="ltr">
          <div><ProductGallery images={product.images} /></div>
          <div dir="rtl" className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[rgba(112,138,100,.2)] bg-[rgba(112,138,100,.1)] px-4 py-2 text-sm font-semibold text-[#708A64]"><span className="size-2 rounded-full bg-[#708A64]"/>طلبات الشركات مخصص</div>
            <h1 className="mt-3 text-3xl font-bold md:text-[40px]">{product.name}</h1>
            <p className="mt-4 leading-7 text-[var(--color-text-muted)]">{product.longDescription || product.shortDescription || 'وصف تفصيلي للمنتج.'}</p>
            <div className="mt-6 rounded-xl bg-[var(--color-surface)] p-4 text-center text-sm font-medium text-[var(--color-text-muted)]">سيتم تحديد السعر بعد مراجعة الطلب</div>

            <section className="mt-6">
              <h2 className="mb-3 font-semibold">الوحدة / الصيغة</h2>
              <UnitSelector units={units} selectedId={customUnitMode ? '' : unitId} onChange={(id) => { setCustomUnitMode(false); setUnitId(id) }} />
              {product.b2bAllowCustomUnit ? (
                <div className="mt-3">
                  <button type="button" onClick={() => setCustomUnitMode((v) => !v)} className={`h-11 rounded-lg border px-4 text-sm ${customUnitMode ? 'border-[var(--color-text)] bg-[var(--color-text)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>وحدة / صيغة مخصصة</button>
                  {customUnitMode ? <input value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} placeholder="اكتب الوحدة أو الصيغة المطلوبة" className="mt-3 h-11 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm outline-none" /> : null}
                </div>
              ) : null}
            </section>

            <section className="mt-6"><h2 className="mb-3 font-semibold">الكمية</h2><QuantityControl value={quantity} onChange={setQuantity} /></section>
            {product.customizationFields?.length ? <div className="mt-6"><CustomizationFields fields={product.customizationFields} values={customization} onChange={(fieldId, value) => setCustomization((current) => ({ ...current, [fieldId]: value }))} /></div> : null}
            <section className="mt-6"><h2 className="mb-3 font-semibold">ملاحظات على هذا المنتج</h2><NotesField value={notes} onChange={setNotes} /></section>
            {!canAdd ? <p role="alert" className="mt-3 text-xs text-red-700">أكمل الوحدة والخيارات الإلزامية قبل الإضافة.</p> : null}
            <Button size="lg" className="mt-6 hidden w-full md:inline-flex" disabled={!canAdd} onClick={add}>{added ? 'تمت الإضافة — عرض الطلب' : 'إضافة إلى الطلب'}</Button>
          </div>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-4">
          <Button size="lg" className="flex-1" disabled={!canAdd} onClick={add}>{added ? 'تمت الإضافة — عرض الطلب' : 'إضافة إلى الطلب'}</Button>
          <p className="text-left text-xs text-[var(--color-text-muted)]">{quantity} وحدة</p>
        </div>
      </div>
      <PublicFooter />
    </div>
  )
}
