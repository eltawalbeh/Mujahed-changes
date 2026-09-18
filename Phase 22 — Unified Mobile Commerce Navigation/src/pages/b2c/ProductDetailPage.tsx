import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '@/components/ui/Button'
import QuantityControl from '@/components/ui/QuantityControl'
import ProductGallery from '@/components/public/ProductGallery'
import UnitSelector from '@/components/public/UnitSelector'
import NotesField from '@/components/public/NotesField'
import CustomizationFields from '@/components/public/CustomizationFields'
import PublicHeader from '@/components/public/PublicHeader'
import PublicFooter from '@/components/public/PublicFooter'
import StatePanel from '@/components/ui/StatePanel'
import { getPublicProductBySlug } from '@/data/catalog'
import { formatJod } from '@/lib/format'
import type { Product } from '@/types/product'
import { useRequestDraft } from '@/state/RequestDraftContext'

export default function ProductDetailPage() {
  const { slug } = useParams()
  const { addItem, isRequestOpen, openRequest } = useRequestDraft()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [customization, setCustomization] = useState<Record<string, string | string[]>>({})
  const [added, setAdded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadProduct() {
      if (!slug) {
        setNotFound(true)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')
        setNotFound(false)

        const result = await getPublicProductBySlug(slug)

        if (cancelled) return

        if (!result) {
          setNotFound(true)
          return
        }

        setProduct(result)
        setSelectedUnitId(result.units[0]?.id ?? '')
      } catch {
        if (!cancelled) {
          setError('تعذر تحميل المنتج حالياً.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProduct()

    return () => {
      cancelled = true
    }
  }, [slug, reloadKey])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    setQuantity(1)
    setNotes('')
    setCustomization({})
    setAdded(false)
  }, [slug])

  const total = useMemo(() => {
    if (!product?.basePriceJod) return 0
    return product.basePriceJod * quantity
  }, [product, quantity])

  if (notFound) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <PublicHeader />
        <main className="mx-auto max-w-[900px] px-4 py-16 md:py-24">
          <StatePanel
            title="المنتج غير متاح"
            description="تعذر العثور على هذا المنتج أو أنه لم يعد متاحاً للطلب."
            actionLabel="العودة للمنتجات"
            onAction={() => {
              window.location.href = '/'
            }}
          />
        </main>
        <PublicFooter />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <PublicHeader />
        <main className="mx-auto max-w-[1440px] px-4 py-8 md:px-20 md:py-12">
          <div className="grid animate-pulse gap-7 md:grid-cols-[540px_minmax(0,1fr)] md:gap-12" dir="ltr">
            <div className="h-[260px] rounded-[var(--radius-lg)] bg-[var(--color-placeholder)] md:h-[400px]" />
            <div className="space-y-5" dir="rtl">
              <div className="h-8 w-2/3 rounded bg-[var(--color-placeholder)]" />
              <div className="h-4 w-full rounded bg-[var(--color-placeholder)]" />
              <div className="h-4 w-4/5 rounded bg-[var(--color-placeholder)]" />
              <div className="h-28 rounded-[var(--radius-lg)] bg-[var(--color-placeholder)]" />
            </div>
          </div>
        </main>
        <PublicFooter />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <PublicHeader />
        <main className="mx-auto max-w-[900px] px-4 py-16 md:py-24">
          <StatePanel
            title="تعذر تحميل المنتج"
            description={
              navigator.onLine
                ? error || 'تعذر تحميل المنتج حالياً.'
                : 'أنت غير متصل بالإنترنت حالياً. تحقق من الاتصال ثم أعد المحاولة.'
            }
            actionLabel="إعادة المحاولة"
            onAction={() => setReloadKey((value) => value + 1)}
            tone={navigator.onLine ? 'error' : 'offline'}
          />
        </main>
        <PublicFooter />
      </div>
    )
  }

  const canAdd =
    Boolean(selectedUnitId) &&
    (product.customizationFields?.every((field) => {
      if (!field.required) return true
      const value = customization[field.id]
      return Array.isArray(value) ? value.length > 0 : Boolean(value)
    }) ?? true)

  const selectedUnit = product.units.find((unit) => unit.id === selectedUnitId)

  function handleAddToRequest() {
    if (!canAdd || !selectedUnit) return

    const customizationLabels =
      product.customizationFields?.flatMap((field) => {
        const value = customization[field.id]
        if (!value) return []

        if (field.type === 'text') {
          return typeof value === 'string' && value.trim() ? [value.trim()] : []
        }

        const selectedIds = Array.isArray(value) ? value : [value]
        return selectedIds
          .map((id) => field.options?.find((option) => option.id === id)?.label)
          .filter((label): label is string => Boolean(label))
      }) ?? []

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      quantity,
      unitId: selectedUnit.id,
      unitLabel: selectedUnit.label,
      observedBasePriceJod: product.basePriceJod,
      customization,
      customizationLabels,
      notes: notes.trim() || undefined,
    })

    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
    openRequest()
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <PublicHeader />

      <main className="mx-auto max-w-[1440px] px-4 pb-32 pt-4 md:px-20 md:pb-16 md:pt-10">
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Link to="/">الرئيسية</Link>
          <span>›</span>
          <Link to="/">تصفح</Link>
          <span>›</span>
          <span className="text-[var(--color-text)]">{product.name}</span>
        </nav>

        <div
          dir="ltr"
          className="grid gap-7 md:grid-cols-[540px_minmax(0,1fr)] md:gap-12"
        >
          <ProductGallery images={product.images} />

          <div dir="rtl">
            <div className="text-right">
              <h1 className="mt-3 text-3xl font-bold text-[var(--color-text)] md:text-[40px]">
                {product.name}
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)] md:text-base">
                {product.longDescription ??
                  'وصف تفصيلي للمنتج يوضح المكونات والمميزات الأساسية. هذا النص هو مجرد نص توضيحي للتعريف بالمنتج.'}
              </p>
            </div>

            <div className="my-6 border-t border-[var(--color-border)]" />

            <div className="hidden items-center justify-between md:flex">
              <span className="text-sm text-[var(--color-text-muted)]">السعر الأساسي</span>
              <span className="text-3xl font-bold text-[var(--color-text)]">
                {formatJod(product.basePriceJod ?? 0)}
              </span>
            </div>

            {product.customizationFields?.length ? (
              <>
                <div className="my-6 border-t border-[var(--color-border)]" />
                <CustomizationFields
                  fields={product.customizationFields}
                  values={customization}
                  onChange={(fieldId, value) =>
                    setCustomization((current) => ({ ...current, [fieldId]: value }))
                  }
                />
              </>
            ) : null}

            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-[var(--color-text)]">
                الوحدة
              </label>
              <UnitSelector
                units={product.units}
                selectedId={selectedUnitId}
                onChange={setSelectedUnitId}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[var(--color-text)]">
                  الكمية
                </label>
                <QuantityControl value={quantity} onChange={setQuantity} />
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-[var(--color-text)]">
                ملاحظات على هذا المنتج
              </label>
              <NotesField value={notes} onChange={setNotes} />
            </div>

            <Button
              size="lg"
              className="mt-6 hidden w-full md:inline-flex"
              disabled={!canAdd}
              onClick={handleAddToRequest}
            >
              {added ? 'تمت الإضافة' : 'إضافة إلى الطلب'}
            </Button>
            {!canAdd ? (
              <p role="alert" className="mt-2 hidden text-center text-xs text-red-700 md:block">
                أكمل الخيارات الإلزامية واختر وحدة المنتج قبل الإضافة.
              </p>
            ) : null}
          </div>
        </div>
      </main>

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden ${isRequestOpen ? 'hidden' : ''}`}>
        <div className="mx-auto flex max-w-md items-center gap-4">
          <Button
            size="lg"
            className="flex-1"
            disabled={!canAdd}
            onClick={handleAddToRequest}
          >
            {added ? 'تمت الإضافة — عرض الطلب' : 'إضافة إلى الطلب'}
          </Button>
          <div className="min-w-20 text-left">
            <p className="text-lg font-bold text-[var(--color-text)]">{formatJod(total)}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">السعر الإجمالي</p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
