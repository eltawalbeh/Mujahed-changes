import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import { paths } from '@/domain/paths'
import B2BRequestItem from './B2BRequestItem'
import { useB2BRequestDraft } from '@/state/B2BRequestDraftContext'

export default function B2BRequestPanel() {
  const navigate = useNavigate()
  const { items, itemCount, isRequestOpen, closeRequest, updateQuantity, removeItem } = useB2BRequestDraft()
  if (!isRequestOpen) return null

  const continueRequest = () => {
    if (!items.length) return
    closeRequest()
    navigate(paths.b2b.company)
  }

  return (
    <>
      <button aria-label="إغلاق الطلب" className="fixed inset-0 z-50 bg-black/20" onClick={closeRequest} />

      <aside className="fixed inset-y-0 right-0 z-[60] hidden w-[420px] flex-col bg-[var(--color-surface)] shadow-[-4px_0_18px_rgba(0,0,0,.09)] md:flex">
        <div className="flex h-[78px] items-center justify-between border-b border-[var(--color-border)] px-6">
          <button type="button" onClick={closeRequest} className="text-xl text-[var(--color-text-muted)]">×</button>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[var(--color-bg)] px-3 py-1 text-xs font-bold text-[var(--color-text-muted)]">{itemCount} منتجات</span>
            <h2 className="text-xl font-bold">الطلب الحالي</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {items.length ? (
            <div className="space-y-3">{items.map((item) => (
              <B2BRequestItem key={item.id} item={item} onQuantityChange={(q) => updateQuantity(item.id, q)} onRemove={() => removeItem(item.id)} />
            ))}</div>
          ) : (
            <div className="grid min-h-[360px] place-items-center text-center">
              <div><div className="mx-auto grid size-20 place-items-center rounded-full bg-[var(--color-bg)]">◫</div><p className="mt-4 font-bold">لا توجد منتجات في طلبك حالياً</p><p className="mt-2 text-sm text-[var(--color-text-muted)]">تصفح قائمة المنتجات وأضف ما تحتاجه لبدء طلبك.</p></div>
            </div>
          )}
        </div>
        {items.length ? (
          <div className="border-t border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between text-sm"><strong>{itemCount} منتجات</strong><span className="text-[var(--color-text-muted)]">عدد المنتجات في الطلب</span></div>
            <p className="mt-4 text-xs text-[var(--color-text-muted)]">* الطلب خاضع للمراجعة ولا يعتبر تأكيداً نهائياً أو التزاماً بالتوريد.</p>
            <Button size="lg" className="mt-5 w-full" onClick={continueRequest}>متابعة الطلب</Button>
          </div>
        ) : null}
      </aside>

      <section role="dialog" aria-modal="true" aria-labelledby="b2b-request-panel-title" className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[calc(100dvh-12px)] flex-col overflow-hidden rounded-t-3xl bg-[var(--color-surface)] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_14px_rgba(0,0,0,.12)] md:hidden">
        <div className="mx-auto h-1 w-10 rounded-full bg-[var(--color-border)]" />
        <div className="mt-3 flex items-center justify-between"><button type="button" aria-label="إغلاق الطلب" onClick={closeRequest} className="grid size-10 place-items-center rounded-full text-xl text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]">×</button><div className="flex items-center gap-2"><span className="rounded-full bg-[var(--color-bg)] px-2 py-1 text-xs">{itemCount} منتج</span><h2 id="b2b-request-panel-title" className="text-lg font-bold">الطلب الحالي</h2></div></div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-[var(--color-border)] pt-3">
          {items.length ? <div className="space-y-3">{items.map((item) => <B2BRequestItem key={item.id} item={item} onQuantityChange={(q) => updateQuantity(item.id, q)} onRemove={() => removeItem(item.id)} />)}</div> : <div className="py-8 text-center"><p className="font-bold">لا توجد منتجات في طلبك حالياً</p><p className="mt-2 text-sm text-[var(--color-text-muted)]">أضف منتجاً لبدء طلب الشركات.</p></div>}
        </div>
        {items.length ? <><p className="mt-3 border-t border-[var(--color-border)] pt-3 text-center text-xs text-[var(--color-text-muted)]">* الطلب خاضع للمراجعة ولا يعتبر تأكيداً نهائياً.</p><Button size="lg" className="mt-3 w-full" onClick={continueRequest}>متابعة الطلب</Button></> : null}
      </section>
    </>
  )
}
